import { Router } from 'express';
import { register, login, getMe, updateProfile, logout } from '../controllers/auth.ctrl';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', authenticate, getMe as any);
router.put('/profile', authenticate, updateProfile as any);
router.post('/logout', authenticate, logout as any);

export default router;