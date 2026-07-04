import { Response } from 'express';
import ListingModel from '../models/listing.model';
import UserModel from '../models/user.model';
import { IAuthRequest, IApiResponse, IPagination } from '../types';

// GET ALL USERS (with filters, pagination, search)
export const getAllUsers = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const {
            page = 1,
            limit = 20,
            role,
            isVerified,
            isActive,
            search,
            sort = '-createdAt',
        } = req.query as any;

        // Build filter
        const filter: any = {};

        if (role && role !== 'all') filter.role = role;
        if (isVerified === 'true') filter.isVerified = true;
        if (isVerified === 'false') filter.isVerified = false;
        if (isActive === 'true') filter.isActive = true;
        if (isActive === 'false') filter.isActive = false;

        // Search by name or phone
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } },
            ];
        }

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(100, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [users, total] = await Promise.all([
            UserModel.find(filter)
                .select('-password -refreshToken')
                .sort(sort as string)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            UserModel.countDocuments(filter),
        ]);

        const pages = Math.ceil(total / limitNum)

        // Get listing counts for each user
        const userIds = users.map((u) => u._id);
        const listingCounts = await ListingModel.aggregate([
            { $match: { seller: { $in: userIds } } },
            { $group: { _id: '$seller', count: { $sum: 1 } } },
        ]);

        const listingMap = listingCounts.reduce((acc: any, item) => {
            acc[item._id.toString()] = item.count;
            return acc;
        }, {});

        // Attach listing counts
        const usersWithCounts = users.map((user) => ({
            ...user,
            listingCount: listingMap[user._id.toString()] || 0,
        }));

        // Stats
        const stats = await UserModel.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
        ]);

        const roleStats = stats.reduce((acc: any, s) => {
            acc[s._id] = s.count;
            return acc;
        }, {});

        res.json({
            success: true,
            count: usersWithCounts.length,
            data: usersWithCounts,
            stats: {
                total,
                ...roleStats,
                verified: await UserModel.countDocuments({ isVerified: true }),
                unverified: await UserModel.countDocuments({ isVerified: false, ghanaCardImage: { $exists: true, $ne: null } }),
            },
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: pages,
                hasNextPage: pageNum < pages,
                hasPreviousPage: pageNum > 1,
                nextPage: pageNum < pages ? pageNum + 1 : null,
                previousPage: pageNum > 1 ? pageNum - 1 : null
            }
        } as IApiResponse);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' } as IApiResponse);
    }
};

// GET SINGLE USER DETAIL
export const getUserById = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const user = await UserModel.findById(req.params.id)
            .select('-password -refreshToken')
            .lean();

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' } as IApiResponse);
            return;
        }

        // Get user's listings
        const listings = await ListingModel.find({ seller: user._id })
            .sort('-createdAt')
            .limit(20)
            .lean();

        // Get listing stats
        const listingStats = await ListingModel.aggregate([
            { $match: { seller: user._id } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        const listingStatusCounts = listingStats.reduce((acc: any, s) => {
            acc[s._id] = s.count;
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                user,
                listings,
                listingStats: listingStatusCounts,
            },
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch user' } as IApiResponse);
    }
};

// UPDATE USER (Admin)
export const adminUpdateUser = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { fullName, phoneNumber, role, isVerified, isActive, town, region } = req.body;

        const user = await UserModel.findById(id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' } as IApiResponse);
            return;
        }

        // Prevent admin from changing their own role
        if (id === req.user!._id.toString() && role && role !== user.role) {
            res.status(400).json({ success: false, message: 'Cannot change your own role' } as IApiResponse);
            return;
        }

        if (fullName) user.fullName = fullName;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (role) user.role = role;
        if (isVerified !== undefined) user.isVerified = isVerified;
        if (isActive !== undefined) user.isActive = isActive;
        if (town !== undefined) user.town = town;
        if (region !== undefined) user.region = region;

        await user.save();

        res.json({
            success: true,
            message: 'User updated successfully',
            data: user,
        } as IApiResponse);
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(400).json({ success: false, message: 'Phone number already in use' } as IApiResponse);
            return;
        }
        res.status(500).json({ success: false, message: 'Failed to update user' } as IApiResponse);
    }
};

// TOGGLE USER ACTIVE STATUS (Ban/Unban)
export const toggleUserActive = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        if (id === req.user!._id.toString()) {
            res.status(400).json({ success: false, message: 'Cannot deactivate yourself' } as IApiResponse);
            return;
        }

        const user = await UserModel.findById(id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' } as IApiResponse);
            return;
        }

        user.isActive = !user.isActive;
        await user.save();

        res.json({
            success: true,
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            data: { _id: user._id, isActive: user.isActive },
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to toggle user status' } as IApiResponse);
    }
};

// VERIFY USER (Approve Ghana Card)
export const verifyUser = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const user = await UserModel.findByIdAndUpdate(
            req.params.id,
            { isVerified: true },
            { new: true }
        ).select('-password -refreshToken');

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' } as IApiResponse);
            return;
        }

        res.json({
            success: true,
            message: 'User verified successfully',
            data: user,
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to verify user' } as IApiResponse);
    }
};

// DELETE USER
export const deleteUser = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        if (id === req.user!._id.toString()) {
            res.status(400).json({ success: false, message: 'Cannot delete yourself' } as IApiResponse);
            return;
        }

        const user = await UserModel.findById(id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' } as IApiResponse);
            return;
        }

        // Delete user's listings
        await ListingModel.deleteMany({ seller: id });
        // Delete user
        await UserModel.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'User and all their listings deleted',
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete user' } as IApiResponse);
    }
};