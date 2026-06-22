import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { IAuthRequest, IApiResponse } from '../types';
import { ENV } from '../config/env.config';
import UserModel from '../models/user.model';
import { formatCloudinaryResponse } from '../utils/cloudinary.util';

// TOKEN GENERATION
const generateAccessToken = (id: string): string => {
    const payload = { _id: id };
    const secret = ENV.JWT.ACCESS_SECRET;
    const options: SignOptions = {
        expiresIn: ENV.JWT.ACCESS_EXPIRE as any, // Cast to bypass strict typing
    };

    return jwt.sign(payload, secret, options);
};

const generateRefreshToken = (id: string): string => {
    const payload = { _id: id };
    const secret = ENV.JWT.REFRESH_SECRET;
    const options: SignOptions = {
        expiresIn: ENV.JWT.REFRESH_EXPIRE as any,
    };

    return jwt.sign(payload, secret, options);
};

// @desc    Register user
// @route   POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { fullName, phoneNumber, password, role, email } = req.body;

        // Check existing
        const existingUser = await UserModel.findOne({ phoneNumber });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: 'Phone number already registered',
            } as IApiResponse);
            return;
        }
        if (email.trim()) {
            const existingUserEmail = await UserModel.findOne({ email: email.trim().toLowercase() });
            if (existingUserEmail) {
                res.status(400).json({
                    success: false,
                    message: 'Email already registered',
                } as IApiResponse);
                return;
            }
        }

        // Create user
        const user = await UserModel.create({
            fullName,
            phoneNumber,
            password,
            role,
            email //recommended for sellers
        });

        // Generate tokens
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Save refresh token
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token: accessToken,
            user: {
                _id: user._id,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                role: user.role,
                isVerified: user.isVerified,
            },
        } as IApiResponse);
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            res.status(400).json({
                success: false,
                message: messages.join(', '),
            } as IApiResponse);
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
        } as IApiResponse);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phoneNumber, password } = req.body;

        if (!phoneNumber || !password) {
            res.status(400).json({
                success: false,
                message: 'Please provide phone number and password',
            } as IApiResponse);
            return;
        }

        // Find user with password
        const user = await UserModel.findOne({ phoneNumber }).select('+password +refreshToken');

        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            } as IApiResponse);
            return;
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            } as IApiResponse);
            return;
        }

        // Generate tokens
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Save refresh token
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            message: 'Login successful',
            token: accessToken,
            user: {
                _id: user._id,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                role: user.role,
                isVerified: user.isVerified,
                momoVerified: user.momoVerified,
            },
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error during login',
        } as IApiResponse);
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
export const getMe = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const user = await UserModel.findById(req.user?._id);

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            } as IApiResponse);
            return;
        }

        res.json({
            success: true,
            user,
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
        } as IApiResponse);
    }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
export const updateProfile = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { fullName, region, town } = req.body as {
            fullName?: string;
            region?: string;
            town?: string;
        };


        const user = await UserModel.findByIdAndUpdate(
            req.user?._id,
            { fullName, region, town },
            { runValidators: true }
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user,
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
        } as IApiResponse);
    }
};

export const verifyIdentity = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const { ghanaCardNumber } = req.body;

        // Validate files exist
        const ghanaCardImage = formatCloudinaryResponse(files?.ghanaCardImage?.[0]);
        const ghanaCardSelfie = formatCloudinaryResponse(files?.ghanaCardSelfie?.[0])

        if (!ghanaCardImage || !ghanaCardSelfie) {
            res.status(400).json({
                success: false,
                message: 'Both Ghana Card photo and selfie are required',
            } as IApiResponse);
            return;
        }

        if (!ghanaCardNumber) {
            res.status(400).json({
                success: false,
                message: 'Ghana Card number is required',
            } as IApiResponse);
            return;
        }

        // Validate card number format
        const cardRegex = /^GHA-\d{9}-\d{1}$/;
        if (!cardRegex.test(ghanaCardNumber)) {
            res.status(400).json({
                success: false,
                message: 'Invalid Ghana Card number format. Use: GHA-123456789-0',
            } as IApiResponse);
            return;
        }

        // Check if already submitted
        const existingUser = await UserModel.findById(req.user!._id);
        if (existingUser?.ghanaCardImage) {
            res.status(400).json({
                success: false,
                message: 'Verification already submitted. Wait for review.',
            } as IApiResponse);
            return;
        }

        // Update user record
        const user = await UserModel.findByIdAndUpdate(
            req.user!._id,
            {
                ghanaCardImage: ghanaCardImage.secure_url,
                ghanaCardSelfie: ghanaCardSelfie.secure_url,
                ghanaCardNumber,
                // isVerified stays false until admin approves
            },
        );

        res.json({
            success: true,
            message: 'Verification documents submitted successfully. We will review within 24-48 hours.',
            user: {
                _id: user!._id,
                isVerified: user!.isVerified,
                ghanaCardImage: user!.ghanaCardImage,
                ghanaCardNumber: user!.ghanaCardNumber,
            },
        } as IApiResponse);
    } catch (error) {
        console.error('Verify identity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit verification documents',
        } as IApiResponse);
    }
};


export const getVerificationStatus = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const user = await UserModel.findById(req.user!._id)
            .select('isVerified ghanaCardImage ghanaCardNumber momoVerified');

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' } as IApiResponse);
            return;
        }

        res.json({
            success: true,
            user: {
                isVerified: user.isVerified,
                hasSubmittedDocs: !!user.ghanaCardImage,
                ghanaCardNumber: user.ghanaCardNumber,
                momoVerified: user.momoVerified,
            },
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' } as IApiResponse);
    }
};

// VERIFY MOMO NUMBER (Initiate)
export const verifyMomo = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { momoNumber, network } = req.body;

        if (!momoNumber) {
            res.status(400).json({ success: false, message: 'MoMo number is required' } as IApiResponse);
            return;
        }

        // Store MoMo number temporarily
        await UserModel.findByIdAndUpdate(req.user!._id, {
            momoNumber,
        });

        // In production: send micro-transaction via Hubtel/MTN API
        // For now, return success
        res.json({
            success: true,
            message: `A verification code has been sent to ${momoNumber}. Check your MoMo transactions.`,
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to initiate MoMo verification' } as IApiResponse);
    }
};

// CONFIRM MOMO VERIFICATION
export const confirmMomo = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { code } = req.body;

        if (!code) {
            res.status(400).json({ success: false, message: 'Verification code is required' } as IApiResponse);
            return;
        }

        // In production: verify the micro-transaction amount
        // For now, simulate success
        const user = await UserModel.findByIdAndUpdate(
            req.user!._id,
            { momoVerified: true },
        );

        res.json({
            success: true,
            message: 'MoMo number verified successfully',
            user: {
                _id: user!._id,
                momoVerified: user!.momoVerified,
            },
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to confirm MoMo verification' } as IApiResponse);
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
export const logout = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        // Clear refresh token
        await UserModel.findByIdAndUpdate(req.user?._id, {
            $unset: { refreshToken: 1 },
        });

        res.json({
            success: true,
            message: 'Logged out successfully',
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
        } as IApiResponse);
    }
};