import { Router } from 'express';
import { register, login, getMe, updateProfile, logout, verifyIdentity, getVerificationStatus, verifyMomo, confirmMomo } from '../controllers/auth.ctrl';
import { authenticate } from '../middleware/auth.middleware';
import { uploadVerificationDocs } from '../config/cloudinary.config';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', authenticate, getMe as any);
router.put('/profile', authenticate, updateProfile as any);
router.post('/logout', authenticate, logout as any);

// Verification routes
router.post(
    '/verify-identity',
    authenticate,
    uploadVerificationDocs, // ← Handles ghanaCardImage + ghanaCardSelfie
    verifyIdentity
);
router.get('/verification-status', authenticate, getVerificationStatus);
router.post('/verify-momo', authenticate, verifyMomo);
router.post('/confirm-momo', authenticate, confirmMomo);

export default router;



