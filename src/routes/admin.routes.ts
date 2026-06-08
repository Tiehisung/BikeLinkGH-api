import { Router } from 'express';
import {
    getDashboardStats,
    getPendingListings,
    approveListing,
    rejectListing,
    getPendingUsers,
    verifyUser,
    getPendingInspections,
    completeInspection,
    getAllPayments,
} from '../controllers/admin.ctrl';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/stats', getDashboardStats);

// Listings
router.get('/listings/pending', getPendingListings);
router.put('/listings/:id/approve', approveListing);
router.put('/listings/:id/reject', rejectListing);

// Users
router.get('/users/pending', getPendingUsers);
router.put('/users/:id/verify', verifyUser);

// Inspections
router.get('/inspections/pending', getPendingInspections);
router.put('/inspections/:id/complete', completeInspection);

// Payments
router.get('/payments', getAllPayments);

export default router;