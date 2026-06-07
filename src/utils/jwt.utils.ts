// utils/jwt.utils.ts
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.config';
import { Types } from 'mongoose';

interface TokenPayload {
    _id: Types.ObjectId;
    email: string;
    role: string;
}

 

export const verifyAccessToken = (token: string): TokenPayload => {
    return jwt.verify(
        token,
        ENV.JWT.ACCESS_SECRET
    ) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
    return jwt.verify(
        token,
        ENV.JWT.REFRESH_SECRET
    ) as TokenPayload;
};

// Cookie options
export const cookieOptions = {
    httpOnly: true,        // Prevents XSS attacks
    secure: true,          // HTTPS only in production
    sameSite: 'strict',    // Prevents CSRF attacks
    maxAge: 7 * 24 * 60 * 60 * 1000
} as const;


// Helper to clear auth cookies
export const clearAuthCookies = (res: any) => {
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
};

// Helper to set auth cookies
export const setAuthCookies = (res: any, accessToken: string, refreshToken: string) => {
    res.cookie('accessToken', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, cookieOptions);
};

// Cookie options with environment-based configuration

// export const cookieOptions = {
//     httpOnly: true,
//     secure: ENV.NODE_ENV === 'production',
//     sameSite: ENV.NODE_ENV === 'production' ? 'strict' : 'lax',
//     domain: ENV.COOKIE_DOMAIN || undefined,
//     path: '/',
//     maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
// } as const;