import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.config';
import { HttpStatusCode } from 'axios';
import UserModel from '../models/user.model';
import { IAuthRequest, JwtPayload } from '../types';

// AUTHENTICATE
export const authenticate = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Get token from header or cookie
        const token =
            req.cookies?.accessToken ||
            req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            res.status(HttpStatusCode.Unauthorized).json({
                success: false,
                message: 'No token provided',
                code: 'NO_TOKEN',
            });
            return;
        }

        // Verify token
        const decoded = jwt.verify(token, ENV.JWT.ACCESS_SECRET) as JwtPayload;

        // Find user
        const user = await UserModel.findById(decoded._id).select('-password -refreshToken');

        if (!user) {
            res.status(HttpStatusCode.Unauthorized).json({
                success: false,
                message: 'User no longer exists',
                code: 'USER_NOT_FOUND',
            });
            return;
        }

        if (!user.isActive) {
            res.status(HttpStatusCode.Unauthorized).json({
                success: false,
                message: 'Account is deactivated',
                code: 'ACCOUNT_DEACTIVATED',
            });
            return;
        }

        // Attach user and token to request
        req.user = user;
        req.token = token;

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(HttpStatusCode.Unauthorized).json({
                success: false,
                message: 'Invalid token. Please log in again.',
                code: 'INVALID_TOKEN',
            });
            return;
        }

        if (error instanceof jwt.TokenExpiredError) {
            res.status(HttpStatusCode.Unauthorized).json({
                success: false,
                message: 'Token expired. Please log in again.',
                code: 'TOKEN_EXPIRED',
            });
            return;
        }

        res.status(HttpStatusCode.InternalServerError).json({
            success: false,
            message: 'Authentication failed due to server error.',
            code: 'AUTH_ERROR',
        });
    }
};

// OPTIONAL AUTHENTICATE (Doesn't block if no token)
export const optionalAuthenticate = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header('Authorization')?.replace('Bearer ', '');

        // No token? Continue without user
        if (!token) {
            return next();
        }

        // Verify token
        const decoded = jwt.verify(token, ENV.JWT.ACCESS_SECRET) as JwtPayload;

        // Find user
        const user = await UserModel.findById(decoded._id).select('-password -refreshToken');

        if (user && user.isActive) {
            req.user = user;
        }

        next();
    } catch (error) {
        // Token invalid? Just continue without user
        next();
    }
};

// AUTHORIZE (Role-based)
export const authorize = (...roles: string[]) => {
    return (req: IAuthRequest, res: Response, next: NextFunction): void => {
        // console.log('user',req.user)
        if (!req.user) {
            res.status(HttpStatusCode.Unauthorized).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }

        if (!roles.includes(req.user.role as string)) {
            res.status(HttpStatusCode.Forbidden).json({
                success: false,
                message: 'You do not have permission to access this resource',
            });
            return;
        }

        next();
    };
};
