import { Router } from 'express';
import { register, login, getMe, updateProfile, logout, verifyIdentity, getVerificationStatus, verifyMomo, confirmMomo } from '../controllers/auth.ctrl';
import { authenticate } from '../middleware/auth.middleware';
import { uploadVerificationDocs } from '../config/cloudinary.config';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.use(authenticate)
router.get('/me', getMe as any);
router.put('/profile', updateProfile as any);
router.post('/logout', logout as any);

// Verification routes
router.post(
    '/verify-identity',
    uploadVerificationDocs, // ← Handles ghanaCardImage + ghanaCardSelfie
    verifyIdentity
);
router.get('/verification-status', getVerificationStatus);
router.post('/verify-momo', verifyMomo);
router.post('/confirm-momo', confirmMomo);

export default router;



