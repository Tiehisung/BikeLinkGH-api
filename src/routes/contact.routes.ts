import { Router } from 'express';
import {
    submitContact,
    getAllContacts,
    getContactById,
    updateContactStatus,
    deleteContact,
} from '../controllers/contact.ctrl';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public route - anyone can submit
router.post('/', submitContact);

// Admin routes
authorize('adming')
router.get('/', authenticate, getAllContacts);
router.get('/:id', authenticate, getContactById);
router.patch('/:id/status', authenticate, updateContactStatus);
router.delete('/:id', authenticate, deleteContact);

export default router;