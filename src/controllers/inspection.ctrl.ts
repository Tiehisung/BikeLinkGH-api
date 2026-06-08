import { Response } from 'express';
import InspectionModel from '../models/inspection.model';
import ListingModel from '../models/listing.model';
import { IAuthRequest, IApiResponse } from '../types';

// ============================================
// REQUEST INSPECTION (Seller requests)
// @route   POST /api/inspections/request
// ============================================
export const requestInspection = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { listingId, preferredDate, preferredLocation } = req.body;

        // Find listing
        const listing = await ListingModel.findById(listingId);

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' } as IApiResponse);
            return;
        }

        // Check ownership
        if (listing.seller.toString() !== req.user!._id.toString()) {
            res.status(403).json({ success: false, message: 'Not your listing' } as IApiResponse);
            return;
        }

        // Check if listing is approved and paid
        if (listing.status !== 'approved' || listing.paymentStatus !== 'paid') {
            res.status(400).json({
                success: false,
                message: 'Listing must be approved and paid before requesting inspection',
            } as IApiResponse);
            return;
        }

        // Check if already has an active inspection
        const existingInspection = await InspectionModel.findOne({
            listing: listing._id,
            status: { $in: ['scheduled', 'in_progress'] },
        });

        if (existingInspection) {
            res.status(400).json({
                success: false,
                message: 'An inspection is already scheduled for this listing',
            } as IApiResponse);
            return;
        }

        // Create inspection request
        const inspection = await InspectionModel.create({
            listing: listing._id,
            inspector: req.user!._id, // Temporarily; admin will reassign
            seller: req.user!._id,
            scheduledDate: preferredDate,
            inspectionLocation: preferredLocation || listing.location,
            status: 'scheduled',
        });

        // Link inspection to listing
        listing.inspectionId = inspection._id;
        await listing.save();

        res.status(201).json({
            success: true,
            message: 'Inspection requested. We will contact you to confirm the appointment.',
            data: inspection,
        } as IApiResponse);
    } catch (error) {
        console.error('Request inspection error:', error);
        res.status(500).json({ success: false, message: 'Error requesting inspection' } as IApiResponse);
    }
};

// ============================================
// GET INSPECTION STATUS
// @route   GET /api/inspections/:id
// ============================================
export const getInspectionStatus = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const inspection = await InspectionModel.findById(req.params.id)
            .populate('listing', 'brand model price images')
            .populate('inspector', 'fullName phoneNumber');

        if (!inspection) {
            res.status(404).json({ success: false, message: 'Inspection not found' } as IApiResponse);
            return;
        }

        // Only seller or admin can view
        if (
            inspection.seller.toString() !== req.user!._id.toString() &&
            req.user?.role !== 'admin'
        ) {
            res.status(403).json({ success: false, message: 'Not authorized' } as IApiResponse);
            return;
        }

        res.json({ success: true, data: inspection } as IApiResponse);
    } catch (error) {
        console.error('Get inspection error:', error);
        res.status(500).json({ success: false, message: 'Error fetching inspection' } as IApiResponse);
    }
};

// ============================================
// GET MY INSPECTIONS (Seller's inspections)
// @route   GET /api/inspections/mine
// ============================================
export const getMyInspections = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const inspections = await InspectionModel.find({ seller: req.user!._id })
            .populate('listing', 'brand model price status')
            .sort('-createdAt');

        res.json({
            success: true,
            count: inspections.length,
            data: inspections,
        } as IApiResponse);
    } catch (error) {
        console.error('Get my inspections error:', error);
        res.status(500).json({ success: false, message: 'Error fetching inspections' } as IApiResponse);
    }
};