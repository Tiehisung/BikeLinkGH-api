import { Router } from 'express';

import { authenticate, authorize } from '../middleware/auth.middleware';
import { verifyUser } from '../controllers/admin.ctrl';
import {
    getAllUsers, getUserById, adminUpdateUser, toggleUserActive, deleteUser

} from '../controllers/user.ctrl';


const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', adminUpdateUser);
router.patch('/:id/toggle-active', toggleUserActive);
router.patch('/:id/verify', verifyUser);
router.delete('/:id', deleteUser);

export default router;