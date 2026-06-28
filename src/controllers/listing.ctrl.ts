import { Response } from 'express';
import mongoose from 'mongoose';
import ListingModel, { EListingStatus } from '../models/listing.model';
import UserModel from '../models/user.model';
import { IAuthRequest, IApiResponse } from '../types';
import { EPaymentStatus } from '../models/payment.model';
import { EPAYMENT_FEES } from '../data/payment';
import LeadModel, { ENotificationChannel } from '../models/lead.model';
import { sendNewLeadEmail } from '../services/node-mailer/interested-lead.service';
import { ENV } from '../config/env.config';
import { formatPhone, generateSellerSms, sendSms } from '../services/sms/at.service';
import PricingModel from '../models/pricing.model';

// LISTING FEE CONSTANTS
const LISTING_FEES = {
    standard: 25,
    premium: 40,
};

// CREATE LISTING
// @route   POST /api/listings
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
 
        // GET LISTING FEE FROM DATABASE
     
        const listingKey = listingType === 'premium' ? 'premium' : 'standard';

        const pricing = await PricingModel.findOne({
            category: 'listing_fee',
            key: listingKey,
            isActive: true,
        });

        if (!pricing) {
            res.status(400).json({
                success: false,
                message: 'Listing type not available. Please try again.',
            });
            return;
        }

        const listingFee = pricing.amount;

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
            paymentStatus: EPaymentStatus.PENDING,
            status: EListingStatus.Pending,
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

// GET ALL LISTINGS (Public - Browse)
// @route   GET /api/listings
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

        let sortOption: any = { createdAt: -1 }; // Default: newest first
        // ✅ Boost sorting
        if (sort === '-createdAt' || !sort) {
            // Boosted listings first, then by date
            sortOption = { isBoosted: -1, boostExpiresAt: -1, createdAt: -1 };
        } else if (sort === 'price') {
            sortOption = { isBoosted: -1, price: 1 };
        } else if (sort === '-price') {
            sortOption = { isBoosted: -1, price: -1 };
        }

        // Get listings
        const [listings, total] = await Promise.all([
            ListingModel.find(filter)
                .populate('seller', 'fullName phoneNumber town isVerified')
                .sort(sortOption)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            ListingModel.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(total / limitNum);
        // ✅ Boost count for filters
        const boostedCount = await ListingModel.countDocuments({
            ...filter,
            isBoosted: true,
            boostExpiresAt: { $gt: new Date() },
        });
        res.json({
            success: true,
            count: listings.length,
            data: listings,
            filters: {
                listingTypes: { /* existing */ },
                boosted: boostedCount, // ✅ Add boost count
            },
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

// GET SINGLE LISTING
// @route   GET /api/listings/:id
export const getListing = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const listing = await ListingModel.findById(req.params.id)
            .populate('seller', 'fullName phoneNumber town isVerified region')
            .populate('inspectionId');

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' });
            return;
        }

        const isSeller = req.user && listing.seller._id.toString() === req.user._id.toString();

        // TRACK VIEWER (Only if not the seller)
        if (!isSeller) {
            const viewerData: any = {
                viewedAt: new Date(),
            };

            if (req.user) {
                // Authenticated user — store their details
                viewerData.userId = req.user._id;
                viewerData.fullName = req.user.fullName;
                viewerData.phoneNumber = req.user.phoneNumber;
            } else {
                // Anonymous user — store as unknown
                viewerData.fullName = 'Anonymous';
                viewerData.phoneNumber = null;
            }

            // Push viewer to array and increment count
            listing.viewers.push(viewerData);
            listing.viewCount += 1;
            await listing.save();
        }

        const responseData = listing.toObject();

        // Remove viewers from response if not the seller
        if (!isSeller) {
            delete (responseData as any).viewers;
        }

        // Send responseData, not listing
        res.json({ success: true, data: responseData } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching listing' });
    }
};

// GET VIEWERS FOR A LISTING (Seller only)
export const getListingViewers = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const listing = await ListingModel.findById(req.params.id)
            .select('viewers seller brand model');

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' });
            return;
        }

        // Only seller can see viewers
        if (listing.seller.toString() !== req.user!._id.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized' });
            return;
        }

        // Sort by most recent first, remove duplicates per user
        const uniqueViewers = listing.viewers
            .sort((a, b) => b?.viewedAt?.getTime() - a?.viewedAt?.getTime())
            .filter((viewer, index, self) => {
                // Keep first occurrence (most recent) per userId
                if (!viewer.userId) return true; // Keep all anonymous
                return self.findIndex(v => v.userId?.toString() === viewer.userId?.toString()) === index;
            });

        res.json({
            success: true,
            count: uniqueViewers.length,
            data: {
                listing: {
                    _id: listing._id,
                    brand: listing.brand,
                    model: listing.model,
                },
                viewers: uniqueViewers.map(v => ({
                    fullName: v.fullName,
                    phoneNumber: v.phoneNumber,
                    isAuthenticated: !!v.userId,
                    viewedAt: v.viewedAt,
                })),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching viewers' });
    }
};

// GET MY LISTINGS (Seller's own listings)
// @route   GET /api/listings/mine
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

// UPDATE LISTING
// @route   PUT /api/listings/:id
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
            'documentType', 'chassisNumber', 'engineNumber', 'images'
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

        // Reset status for reapproval
        if (listing.status === 'rejected') {
            listing.status = 'pending';
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

// DELETE LISTING
// @route   DELETE /api/listings/:id
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

// MARK LISTING AS SOLD
// @route   PATCH /api/listings/:id/mark-sold
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

// UPLOAD LISTING IMAGES
// @route   POST /api/listings/:id/images
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

// UPLOAD LISTING DOCUMENT
// @route   POST /api/listings/:id/document
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

// CONTACT SELLER (Increment inquiry count)
// @route   POST /api/listings/:id/contact
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
                warning: ''
            },
        } as IApiResponse);
    } catch (error) {
        console.error('Contact seller error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving contact info' } as IApiResponse);
    }
};


// GET UNPAID LISTINGS (For dashboard reminder)
export const getUnpaidListings = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const listings = await ListingModel.find({
            seller: req.user!._id,
            paymentStatus: EPaymentStatus.PENDING,
            status: { $ne: 'sold' },
        })
            .sort('-createdAt')
            .select('brand model price listingType listingFee images createdAt')
            .lean();

        res.json({
            success: true,
            count: listings.length,
            data: listings,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch unpaid listings' });
    }
};

// RETRY PAYMENT FOR LISTING
export const retryListingPayment = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { listingId } = req.params;
        const user = req.user!;

        const listing = await ListingModel.findById(listingId);

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' });
            return;
        }

        if (listing.seller.toString() !== user._id.toString()) {
            res.status(403).json({ success: false, message: 'Not your listing' });
            return;
        }

        // Already paid
        if (listing.paymentStatus === EPaymentStatus.PAID) {
            res.status(400).json({ success: false, message: 'Already paid' });
            return;
        }

        // Already approved
        if (listing.status === 'approved') {
            res.status(400).json({ success: false, message: 'Listing is already live' });
            return;
        }

        const amount = listing.listingType === 'premium'
            ? EPAYMENT_FEES.listing_premium
            : EPAYMENT_FEES.listing_standard;

        res.json({
            success: true,
            data: {
                listingId: listing._id,
                title: `${listing.brand} ${listing.model || ''}`.trim(),
                amount,
                listingType: listing.listingType,
                paymentStatus: listing.paymentStatus,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get payment info' });
    }
};


// GET MY LEADS (For sellers)
export const getMyLeads = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { page = 1, limit = 20, status } = req.query as any;

        const filter: any = { seller: req.user!._id };
        if (status && status !== 'all') filter.status = status;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [leads, total] = await Promise.all([
            LeadModel.find(filter)
                .populate('buyer', 'fullName phoneNumber')
                .populate('listing', 'brand model price images')
                .sort('-createdAt')
                .skip(skip)
                .limit(limitNum)
                .lean(),
            LeadModel.countDocuments(filter),
        ]);

        // Stats
        const stats = await LeadModel.aggregate([
            { $match: { seller: req.user!._id } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        const statusCounts = stats.reduce((acc: any, s) => {
            acc[s._id] = s.count;
            return acc;
        }, {});

        res.json({
            success: true,
            count: leads.length,
            data: leads,
            stats: {
                total,
                new: statusCounts.pending || 0,
                notified: statusCounts.notified || 0,
                contacted: statusCounts.contacted || 0,
            },
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
                hasNextPage: pageNum < Math.ceil(total / limitNum),
                hasPreviousPage: pageNum > 1,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch leads' });
    }
};
// MARK LEAD AS CONTACTED
export const markLeadContacted = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const lead = await LeadModel.findOneAndUpdate(
            { _id: req.params.id, seller: req.user!._id },
            { status: 'contacted' },
        );

        if (!lead) {
            res.status(404).json({ success: false, message: 'Lead not found' });
            return;
        }

        res.json({ success: true, message: 'Marked as contacted', data: lead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update lead' });
    }
};



// REQUEST SELLER CALL
export const requestSellerCall = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { listingId } = req.params;
        const buyer = req.user!;
        const { buyerPhone } = req.body;

        const phone = buyerPhone || buyer.phoneNumber;
        if (!phone || phone.length < 10) {
            res.status(400).json({ success: false, message: 'Valid phone number is required' });
            return;
        }

        // Find listing with seller populated
        const listing = await ListingModel.findById(listingId)
            .populate('seller', 'fullName phoneNumber email');

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' });
            return;
        }

        const seller = listing.seller as any;

        // Prevent self-request
        if (seller._id.toString() === buyer._id.toString()) {
            res.status(400).json({ success: false, message: 'You cannot request a call on your own listing' });
            return;
        }

        // Check for duplicate
        const existingLead = await LeadModel.findOne({
            listing: listing._id,
            buyer: buyer._id,
        });

        if (existingLead) {
            res.status(400).json({
                success: false,
                message: 'You already requested a call for this bike. The seller will contact you soon.',
            });
            return;
        }

        // Generate message
        const bikeTitle = `${listing.brand} ${listing.model || ''}`.trim();
        const formattedSellerPhone = formatPhone(seller.phoneNumber);
        const listingUrl = `${ENV.FRONTEND_URL}/listing/${listing._id}`;

        const smsMessage = generateSellerSms({
            sellerName: seller.fullName,
            buyerName: buyer.fullName,
            buyerPhone: phone,
            bikeTitle,
            bikePrice: listing.price,
        });

        // Create lead record (Dashboard always works)
        const lead = await LeadModel.create({
            listing: listing._id,
            buyer: buyer._id,
            seller: seller._id,
            buyerPhone: phone,
            sellerPhone: seller.phoneNumber,
            notifications: [
                { channel: ENotificationChannel.DASHBOARD, success: true, sentAt: new Date() },
            ],
        });

        // Increment inquiry count
        listing.inquiryCount += 1;
        await listing.save();

        // 1. SEND SMS (fire and forget - updates lead later)
        sendSms({ to: formattedSellerPhone, message: smsMessage })
            .then(async (result) => {
                await LeadModel.findByIdAndUpdate(lead._id, {
                    smsSent: result.success,
                    smsMessageId: result.message,
                  
                    $push: {
                        notifications: {
                            channel: ENotificationChannel.SMS,
                            success: result.success,
                            messageId: result.message,
                            sentAt: new Date(),
                        },
                    },
                });
            })
            .catch(async (err) => {
                await LeadModel.findByIdAndUpdate(lead._id, {
                    smsSent: false,
                    smsError: err.message,
                    $push: {
                        notifications: {
                            channel: ENotificationChannel.SMS,
                            success: false,
                            error: err.message,
                            sentAt: new Date(),
                        },
                    },
                });
            });

        // 2. SEND EMAIL (fire and forget - updates lead later)
        if (seller.email) {
            sendNewLeadEmail({
                sellerEmail: seller.email,
                sellerName: seller.fullName,
                buyerName: buyer.fullName,
                buyerPhone: phone,
                bikeTitle,
                bikePrice: listing.price,
                listingUrl,
            })
                .then(async () => {
                    await LeadModel.findByIdAndUpdate(lead._id, {
                        $push: {
                            notifications: {
                                channel: ENotificationChannel.EMAIL,
                                success: true,
                                sentAt: new Date(),
                            },
                        },
                    });
                })
                .catch(async (err) => {
                    console.error('Failed to send lead email:', err);
                    await LeadModel.findByIdAndUpdate(lead._id, {
                        $push: {
                            notifications: {
                                channel: ENotificationChannel.EMAIL,
                                success: false,
                                error: err.message,
                                sentAt: new Date(),
                            },
                        },
                    });
                });
        }

        // Response sent immediately — no waiting for SMS/Email
        res.json({
            success: true,
            message: `Request sent! ${seller.fullName} will call you shortly at ${phone}.`,
            data: {
                leadId: lead._id,
                sellerName: seller.fullName,
                buyerPhone: phone,
            },
        });
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(400).json({
                success: false,
                message: 'You already requested a call for this bike.',
            });
            return;
        }
        console.error('Request seller call error:', error);
        res.status(500).json({ success: false, message: 'Failed to send request' });
    }
};

// GET MY REQUESTS (For buyers - listings they requested calls on)
export const getMyRequests = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const requests = await LeadModel.find({ buyer: req.user!._id })
            .populate('seller', 'fullName phoneNumber')
            .populate('listing', 'brand model price images status')
            .sort('-createdAt')
            .limit(50)
            .lean();

        res.json({
            success: true,
            count: requests.length,
            data: requests,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch requests' });
    }
};

export const checkMyRequest = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { listingId } = req.params;
        const request = await LeadModel.findOne({ buyer: req.user!._id, listing: listingId })
            .populate('seller', 'fullName phoneNumber')
            .sort('-createdAt')
            .limit(50)
            .lean();

        res.json({
            success: true,
            status: request?.status,
            data: request,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch requests' });
    }
};