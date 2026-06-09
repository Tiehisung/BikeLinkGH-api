// src/app.ts
import express, { Application, Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { ENV } from './config/env.config';

import authRoutes from './routes/auth.routes';
import listingsRoutes from './routes/listings.routes';
import paymentsRoutes from './routes/payments.routes';
import inspectionsRoutes from './routes/inspections.routes';
import adminRoutes from './routes/admin.routes';
import uploadRoutes from './routes/upload.routes'

import { notFound, errorHandler } from './middleware/error-handler.middleware';
import { runUpdate } from './runUpdate';// server/app.ts
import { IAuthRequest } from './types';

// Import middleware

const app: Application = express();

// Trust proxy (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// To serve static assets from public such as favicon
app.use(express.static(path.join(__dirname, 'public')));

// ==================== SECURITY MIDDLEWARE ====================
// Helmet for security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [process.env.FRONTEND_URL as string || 'https://mototrustgh.vercel.app'],
    credentials: true,
    optionsSuccessStatus: 200,
    exposedHeaders: ['set-cookie']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: ENV.RATE_LIMIT_WINDOW || 3600000, // 60 minutes
    max: ENV.RATE_LIMIT_MAX || 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health' // Don't rate limit health checks
});

app.use(cookieParser());
app.use('/api', limiter);

// Special stricter rate limit for auth routes
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 auth requests per hour
    message: 'Too many authentication attempts, please try again later.',
});
app.use('/api/auth', authLimiter);

// ==================== PARSING MIDDLEWARE ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression - compress all responses - Makes responses FASTER and reduces bandwidth usage
app.use(compression());




// ==================== HEALTH CHECK ====================
app.get('/health', (req: IAuthRequest, res: Response) => {
    console.log(req?.user)
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

app.get('/', (req: IAuthRequest, res: Response) => {
    console.log(req?.user)
    res.status(200).json({
        message: 'Mototrust API Server',
        version: '1.0.0',
        documentation: '/api/docs',
        health: '/health'
    });
});

app.get('/test-api/update', runUpdate);

// ==================== API ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);


// ==================== ERROR HANDLING ====================
// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Export for serverless deployment (Vercel)
export default app;

