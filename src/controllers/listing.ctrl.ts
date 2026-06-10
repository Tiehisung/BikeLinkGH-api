import { Response } from 'express';
import mongoose from 'mongoose';
import ListingModel from '../models/listing.model';
import UserModel from '../models/user.model';
import { IAuthRequest, IApiResponse } from '../types';

// ============================================
// LISTING FEE CONSTANTS
// ============================================
const LISTING_FEES = {
    standard: 25,
    premium: 40,
};

// ============================================
// CREATE LISTING
// @route   POST /api/listings
// ============================================
export const createListing = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const seller = req.user!;

        // Check if seller is verified
        if (!seller.isVerified) {
            res.status(403).json({
                success: false,
                message: 'You must verify your identity before posting a listing',
                code: 'SELLER_NOT_VERIFIED',
            } as IApiResponse);
            return;
        }

        const {
            brand,
            model,
            year,
            mileage,
            engineCapacity,
            condition,
            price,
            priceNegotiable = true,
            location,
            description,
            reasonForSelling,
            hasDocuments = false,
            documentType,
            chassisNumber,
            engineNumber,
            listingType = 'standard',
            images
        } = req.body;

        // Calculate listing fee
        const listingFee = LISTING_FEES[listingType as keyof typeof LISTING_FEES];

        // Create listing (always starts as unpaid and pending)
        const listing = await ListingModel.create({
            seller: seller._id,
            brand,
            model,
            year,
            mileage,
            engineCapacity,
            condition,
            price,
            priceNegotiable,
            location,
            description,
            reasonForSelling,
            hasDocuments,
            documentType: hasDocuments ? documentType : undefined,
            chassisNumber,
            engineNumber,
            listingType,
            listingFee,
            paymentStatus: 'paid',//to be implemented
            status: 'pending',
            images
        });

        // Populate seller info for response
        await listing.populate('seller', 'fullName phoneNumber town isVerified');

        res.status(201).json({
            success: true,
            message: 'Listing created. Please pay the listing fee to publish.',
            data: listing,
        } as IApiResponse);
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            res.status(400).json({ success: false, message: messages.join(', ') } as IApiResponse);
            return;
        }
        console.error('Create listing error:', error);
        res.status(500).json({ success: false, message: 'Error creating listing' } as IApiResponse);
    }
};

// ============================================
// GET ALL LISTINGS (Public - Browse)
// @route   GET /api/listings
// ============================================
export const getListings = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const {
            brand,
            minPrice,
            maxPrice,
            location,
            condition,
            isPhysicallyVerified,
            page = 1,
            limit = 20,
            sort = '-createdAt',
        } = req.query as any;

        // Build filter
        const filter: any = { status: 'approved' }; // Only show approved listings

        if (brand) filter.brand = brand;
        if (condition) filter.condition = condition;
        if (location) filter.location = { $regex: location, $options: 'i' }; // Case-insensitive search
        if (isPhysicallyVerified === 'true') filter.isPhysicallyVerified = true;

        // Price range
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        // Pagination
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit))); // Max 50 per page
        const skip = (pageNum - 1) * limitNum;

        // Get listings
        const [listings, total] = await Promise.all([
            ListingModel.find(filter)
                .populate('seller', 'fullName phoneNumber town isVerified')
                .sort(sort as string)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            ListingModel.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(total / limitNum);

        res.json({
            success: true,
            count: listings.length,
            data: listings,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: totalPages,
                hasNextPage: pageNum < totalPages,
                hasPreviousPage: pageNum > 1,
                nextPage: pageNum < totalPages ? pageNum + 1 : null,
                previousPage: pageNum > 1 ? pageNum - 1 : null
            },
        } as IApiResponse);
    } catch (error) {
        console.error('Get listings error:', error);
        res.status(500).json({ success: false, message: 'Error fetching listings' } as IApiResponse);
    }
};

// ============================================
// GET SINGLE LISTING
// @route   GET /api/listings/:id
// ============================================
export const getListing = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const listing = await ListingModel.findById(req.params.id)
            .populate('seller', 'fullName phoneNumber town isVerified region')
            .populate('inspectionId');

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' } as IApiResponse);
            return;
        }

        // Increment view count (don't count seller's own views)
        if (!req.user || listing.seller._id.toString() !== req.user._id.toString()) {
            listing.viewCount += 1;
            await listing.save();
        }

        res.json({ success: true, data: listing } as IApiResponse);
    } catch (error) {
        console.error('Get listing error:', error);
        res.status(500).json({ success: false, message: 'Error fetching listing' } as IApiResponse);
    }
};

// ============================================
// GET MY LISTINGS (Seller's own listings)
// @route   GET /api/listings/mine
// ============================================
export const getMyListings = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { status, page = 1, limit = 20 } = req.query as any;

        const filter: any = { seller: req.user!._id };
        if (status && status !== 'all') {
            filter.status = status;
        }

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [listings, total] = await Promise.all([
            ListingModel.find(filter)
                .sort('-createdAt')
                .skip(skip)
                .limit(limitNum)
                .lean(),
            ListingModel.countDocuments(filter),
        ]);

        // Count by status for dashboard
        const stats = await ListingModel.aggregate([
            { $match: { seller: new mongoose.Types.ObjectId(req.user!._id) } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        const statusCounts = stats.reduce((acc: any, curr: any) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        res.json({
            success: true,
            count: listings.length,
            data: listings,
            stats: statusCounts,
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
        console.error('Get my listings error:', error);
        res.status(500).json({ success: false, message: 'Error fetching your listings' } as IApiResponse);
    }
};

// ============================================
// UPDATE LISTING
// @route   PUT /api/listings/:id
// ============================================
export const updateListing = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const listing = await ListingModel.findById(req.params.id);

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' } as IApiResponse);
            return;
        }

        // Check ownership
        if (listing.seller.toString() !== req.user!._id.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized to update this listing' } as IApiResponse);
            return;
        }

        // Only allow updates if not sold
        if (listing.status === 'sold') {
            res.status(400).json({ success: false, message: 'Cannot update a sold listing' } as IApiResponse);
            return;
        }

        // Allowed fields to update
        const allowedUpdates = [
            'brand', 'model', 'year', 'mileage', 'engineCapacity',
            'condition', 'price', 'priceNegotiable', 'location',
            'description', 'reasonForSelling', 'hasDocuments',
            'documentType', 'chassisNumber', 'engineNumber',
        ];

        allowedUpdates.forEach((field) => {
            if (req.body[field] !== undefined) {
                (listing as any)[field] = req.body[field];
            }
        });

        // If updating, reset status to pending for re-approval
        if (listing.status === 'approved') {
            listing.status = 'pending';
            listing.adminNotes = undefined;
        }

        listing.updatedAt = new Date();
        await listing.save();

        res.json({
            success: true,
            message: 'Listing updated. It will be reviewed again if previously approved.',
            data: listing,
        } as IApiResponse);
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            res.status(400).json({ success: false, message: messages.join(', ') } as IApiResponse);
            return;
        }
        console.error('Update listing error:', error);
        res.status(500).json({ success: false, message: 'Error updating listing' } as IApiResponse);
    }
};

// ============================================
// DELETE LISTING
// @route   DELETE /api/listings/:id
// ============================================
export const deleteListing = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const listing = await ListingModel.findById(req.params.id);

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' } as IApiResponse);
            return;
        }

        // Check ownership
        if (listing.seller.toString() !== req.user!._id.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized' } as IApiResponse);
            return;
        }

        await listing.deleteOne();

        res.json({ success: true, message: 'Listing deleted successfully' } as IApiResponse);
    } catch (error) {
        console.error('Delete listing error:', error);
        res.status(500).json({ success: false, message: 'Error deleting listing' } as IApiResponse);
    }
};

// ============================================
// MARK LISTING AS SOLD
// @route   PATCH /api/listings/:id/mark-sold
// ============================================
export const markAsSold = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const listing = await ListingModel.findById(req.params.id);

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' } as IApiResponse);
            return;
        }

        if (listing.seller.toString() !== req.user!._id.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized' } as IApiResponse);
            return;
        }

        listing.status = 'sold';
        await listing.save();

        // Increment seller's successful sales count
        await UserModel.findByIdAndUpdate(req.user!._id, {
            $inc: { successfulSales: 1 },
        });

        res.json({ success: true, message: 'Listing marked as sold', data: listing } as IApiResponse);
    } catch (error) {
        console.error('Mark sold error:', error);
        res.status(500).json({ success: false, message: 'Error marking listing as sold' } as IApiResponse);
    }
};

// ============================================
// UPLOAD LISTING IMAGES
// @route   POST /api/listings/:id/images
// ============================================
export const uploadListingImages = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const listing = await ListingModel.findById(req.params.id);

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' } as IApiResponse);
            return;
        }

        if (listing.seller.toString() !== req.user!._id.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized' } as IApiResponse);
            return;
        }

        // Images are uploaded via Cloudinary multer middleware
        // req.files contains the uploaded file info (Cloudinary URLs)
        const files = req.files as Express.Multer.File[] | any[];

        if (!files || files.length === 0) {
            res.status(400).json({ success: false, message: 'No images provided' } as IApiResponse);
            return;
        }

        // Max 8 images total
        if (listing.images.length + files.length > 8) {
            res.status(400).json({
                success: false,
                message: `Maximum 8 images allowed. You already have ${listing.images.length}.`,
            } as IApiResponse);
            return;
        }

        // Add new image URLs
        const newImageUrls = files.map((file: any) => file.path || file.secure_url);
        listing.images.push(...newImageUrls);
        await listing.save();

        res.json({
            success: true,
            message: `${newImageUrls.length} image(s) uploaded`,
            data: { images: listing.images },
        } as IApiResponse);
    } catch (error) {
        console.error('Upload images error:', error);
        res.status(500).json({ success: false, message: 'Error uploading images' } as IApiResponse);
    }
};

// ============================================
// UPLOAD LISTING DOCUMENT
// @route   POST /api/listings/:id/document
// ============================================
export const uploadListingDocument = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const listing = await ListingModel.findById(req.params.id);

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' } as IApiResponse);
            return;
        }

        if (listing.seller.toString() !== req.user!._id.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized' } as IApiResponse);
            return;
        }

        const file = req.file as any;

        if (!file) {
            res.status(400).json({ success: false, message: 'No document provided' } as IApiResponse);
            return;
        }

        listing.documentImage = file.path || file.secure_url;
        listing.hasDocuments = true;
        await listing.save();

        res.json({
            success: true,
            message: 'Document uploaded successfully',
            data: { documentImage: listing.documentImage },
        } as IApiResponse);
    } catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({ success: false, message: 'Error uploading document' } as IApiResponse);
    }
};

// ============================================
// CONTACT SELLER (Increment inquiry count)
// @route   POST /api/listings/:id/contact
// ============================================
export const contactSeller = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const listing = await ListingModel.findById(req.params.id)
            .populate('seller', 'phoneNumber fullName');

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' } as IApiResponse);
            return;
        }

        // Increment inquiry count
        listing.inquiryCount += 1;
        await listing.save();

        // Return seller's contact info (with safety warning already shown on frontend)
        res.json({
            success: true,
            message: 'Contact details retrieved. Remember: never pay before seeing the bike.',
            data: {
                sellerName: (listing.seller as any).fullName,
                sellerPhone: (listing.seller as any).phoneNumber,
                listingTitle: `${listing.brand} ${listing.model || ''} - GHS ${listing.price}`,
                warning:''
            },
        } as IApiResponse);
    } catch (error) {
        console.error('Contact seller error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving contact info' } as IApiResponse);
    }
};
