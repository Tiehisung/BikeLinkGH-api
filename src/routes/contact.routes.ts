import { Router } from 'express';
import {
    submitContact,
    getAllContacts,
    getContactById,
    updateContactStatus,
    deleteContact,
    updateContactCategory,
} from '../controllers/contact.ctrl';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public route - anyone can submit
router.post('/', submitContact);

// Admin routes
router.use(authenticate)
router.use(authorize('admin'))

router.get('/',  getAllContacts);
router.get('/:id',  getContactById);
router.patch('/:id/status',  updateContactStatus);
router.patch('/:id/category',  updateContactCategory);
router.delete('/:id',  deleteContact);

export default router;