import { Response } from 'express';
import ListingModel from '../models/listing.model';
import UserModel from '../models/user.model';
import InspectionModel from '../models/inspection.model';
import PaymentModel from '../models/payment.model';
import { IAuthRequest, IApiResponse } from '../types';

// ============================================
// GET DASHBOARD STATS
// @route   GET /api/admin/stats
// ============================================
export const getDashboardStats = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const [
            totalUsers,
            totalListings,
            pendingListings,
            approvedListings,
            totalPayments,
            pendingInspections,
            totalRevenue,
        ] = await Promise.all([
            UserModel.countDocuments(),
            ListingModel.countDocuments(),
            ListingModel.countDocuments({ status: 'pending' }),
            ListingModel.countDocuments({ status: 'approved' }),
            PaymentModel.countDocuments({ status: 'success' }),
            InspectionModel.countDocuments({ status: { $in: ['scheduled', 'in_progress'] } }),
            PaymentModel.aggregate([
                { $match: { status: 'success' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
        ]);

        res.json({
            success: true,
            data: {
                users: totalUsers,
                listings: { total: totalListings, pending: pendingListings, approved: approvedListings },
                inspections: { pending: pendingInspections },
                revenue: totalRevenue[0]?.total || 0,
                payments: totalPayments,
            },
        } as IApiResponse);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Error fetching stats' } as IApiResponse);
    }
};

// ============================================
// GET PENDING LISTINGS (Approval Queue)
// @route   GET /api/admin/listings/pending
// ============================================
export const getPendingListings = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { page = 1, limit = 20 } = req.query as any;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [listings, total] = await Promise.all([
            ListingModel.find({ status: 'pending' })
                .populate('seller', 'fullName phoneNumber town isVerified')
                .sort('createdAt')
                .skip(skip)
                .limit(limitNum),
            ListingModel.countDocuments({ status: 'pending' }),
        ]);

        res.json({
            success: true,
            count: listings.length,
            data: listings,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
                hasNextPage: pageNum < Math.ceil(total / limitNum),
                hasPreviousPage: pageNum > 1, 
                nextPage: pageNum < Math.ceil(total / limitNum) ? pageNum + 1 : null,
                previousPage: pageNum > 1 ? pageNum - 1 : null
            },
        } as IApiResponse);
    } catch (error) {
        console.error('Pending listings error:', error);
        res.status(500).json({ success: false, message: 'Error fetching pending listings' } as IApiResponse);
    }
};

// ============================================
// APPROVE LISTING
// @route   PUT /api/admin/listings/:id/approve
// ============================================
export const approveListing = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const listing = await ListingModel.findById(req.params.id);

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' } as IApiResponse);
            return;
        }

        if (listing.status !== 'pending') {
            res.status(400).json({ success: false, message: 'Listing is not in pending state' } as IApiResponse);
            return;
        }

        // Check if payment is made
        if (listing.paymentStatus !== 'paid') {
            res.status(400).json({
                success: false,
                message: 'Listing fee has not been paid yet',
            } as IApiResponse);
            return;
        }

        listing.status = 'approved';
        listing.reviewedBy = req.user!._id;
        listing.reviewedAt = new Date();
        listing.adminNotes = req.body.notes || undefined;
        await listing.save();

        res.json({
            success: true,
            message: 'Listing approved and is now live',
            data: listing,
        } as IApiResponse);
    } catch (error) {
        console.error('Approve listing error:', error);
        res.status(500).json({ success: false, message: 'Error approving listing' } as IApiResponse);
    }
};

// ============================================
// REJECT LISTING
// @route   PUT /api/admin/listings/:id/reject
// ============================================
export const rejectListing = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { reason } = req.body;

        if (!reason) {
            res.status(400).json({ success: false, message: 'Rejection reason is required' } as IApiResponse);
            return;
        }

        const listing = await ListingModel.findById(req.params.id);

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' } as IApiResponse);
            return;
        }

        listing.status = 'rejected';
        listing.reviewedBy = req.user!._id;
        listing.reviewedAt = new Date();
        listing.adminNotes = reason;
        await listing.save();

        res.json({
            success: true,
            message: 'Listing rejected',
            data: listing,
        } as IApiResponse);
    } catch (error) {
        console.error('Reject listing error:', error);
        res.status(500).json({ success: false, message: 'Error rejecting listing' } as IApiResponse);
    }
};

// ============================================
// GET PENDING USERS (Verification Queue)
// @route   GET /api/admin/users/pending
// ============================================
export const getPendingUsers = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const users = await UserModel.find({
            isVerified: false,
            ghanaCardImage: { $exists: true, $ne: null },
        })
            .select('-password -refreshToken')
            .sort('createdAt');

        res.json({
            success: true,
            count: users.length,
            data: users,
        } as IApiResponse);
    } catch (error) {
        console.error('Pending users error:', error);
        res.status(500).json({ success: false, message: 'Error fetching pending users' } as IApiResponse);
    }
};

// ============================================
// VERIFY USER
// @route   PUT /api/admin/users/:id/verify
// ============================================
export const verifyUser = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const user = await UserModel.findByIdAndUpdate(
            req.params.id,
            { isVerified: true },
            { new: true }
        );

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' } as IApiResponse);
            return;
        }

        res.json({
            success: true,
            message: 'User verified successfully',
            data: user,
        } as IApiResponse);
    } catch (error) {
        console.error('Verify user error:', error);
        res.status(500).json({ success: false, message: 'Error verifying user' } as IApiResponse);
    }
};

// ============================================
// GET PENDING INSPECTIONS
// @route   GET /api/admin/inspections/pending
// ============================================
export const getPendingInspections = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const inspections = await InspectionModel.find({
            status: { $in: ['scheduled', 'in_progress'] },
        })
            .populate('listing', 'brand model price location')
            .populate('seller', 'fullName phoneNumber town')
            .sort('scheduledDate');

        res.json({
            success: true,
            count: inspections.length,
            data: inspections,
        } as IApiResponse);
    } catch (error) {
        console.error('Pending inspections error:', error);
        res.status(500).json({ success: false, message: 'Error fetching inspections' } as IApiResponse);
    }
};

// ============================================
// COMPLETE INSPECTION
// @route   PUT /api/admin/inspections/:id/complete
// ============================================
export const completeInspection = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const {
            engineStarts,
            engineCondition,
            engineSoundNormal,
            chassisNumberVisible,
            chassisMatchesDocuments,
            engineNumberVisible,
            engineMatchesDocuments,
            visibleDamage,
            tireCondition,
            brakesFunctional,
            lightsFunctional,
            testRideCompleted,
            testRideNotes,
            overallRating,
            notes,
        } = req.body;

        const inspection = await InspectionModel.findById(req.params.id);

        if (!inspection) {
            res.status(404).json({ success: false, message: 'Inspection not found' } as IApiResponse);
            return;
        }

        // Update findings
        inspection.findings = {
            engineStarts,
            engineCondition,
            engineSoundNormal,
            chassisNumberVisible,
            chassisMatchesDocuments,
            engineNumberVisible,
            engineMatchesDocuments,
            visibleDamage,
            tireCondition,
            brakesFunctional,
            lightsFunctional,
            testRideCompleted,
            testRideNotes,
            overallRating,
        };
        inspection.notes = notes;
        inspection.status = 'completed';
        inspection.inspector = req.user!._id;
        inspection.completedAt = new Date();

        await inspection.save();

        // Update listing
        await ListingModel.findByIdAndUpdate(inspection.listing, {
            isPhysicallyVerified: true,
        });

        res.json({
            success: true,
            message: 'Inspection completed successfully',
            data: inspection,
        } as IApiResponse);
    } catch (error) {
        console.error('Complete inspection error:', error);
        res.status(500).json({ success: false, message: 'Error completing inspection' } as IApiResponse);
    }
};

// ============================================
// GET ALL PAYMENTS (Admin)
// @route   GET /api/admin/payments
// ============================================
export const getAllPayments = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { status, page = 1, limit = 50 } = req.query as any;

        const filter: any = {};
        if (status) filter.status = status;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(100, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [payments, total] = await Promise.all([
            PaymentModel.find(filter)
                .populate('payer', 'fullName phoneNumber')
                .populate('listing', 'brand model price')
                .sort('-createdAt')
                .skip(skip)
                .limit(limitNum),
            PaymentModel.countDocuments(filter),
        ]);

        res.json({
            success: true,
            count: payments.length,
            data: payments,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
                hasNextPage: pageNum < Math.ceil(total / limitNum),
                hasPreviousPage: pageNum > 1,
            },
        } );
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ success: false, message: 'Error fetching payments' } as IApiResponse);
    }
};