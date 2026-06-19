import { Router } from 'express';
import {
    createListing,
    getListings,
    getListing,
    getMyListings,
    updateListing,
    deleteListing,
    markAsSold,
    uploadListingImages,
    uploadListingDocument,
    // contactSeller,
    getUnpaidListings,
    retryListingPayment,
    getMyLeads,
    markLeadContacted,
    requestSellerCall,
    getMyRequests,
    checkMyRequest,
} from '../controllers/listing.ctrl';
import { authenticate } from '../middleware/auth.middleware';
import { uploadMultipleImages, uploadDocument } from '../config/cloudinary.config';

const router = Router();

// Public routes
router.get('/', getListings);
router.get('/:id', getListing);

// Protected routes
router.use(authenticate);

router.post('/', createListing);
router.get('/user/mine', getMyListings);
router.put('/:id', updateListing);
router.delete('/:id', deleteListing);
router.patch('/:id/mark-sold', markAsSold);

// Upload routes
router.post('/:id/images', uploadMultipleImages, uploadListingImages);
router.post('/:id/document', uploadDocument, uploadListingDocument);


router.get('/unpaid', getUnpaidListings);
router.get('/:listingId/retry-payment', retryListingPayment);

//
router.post('/:listingId/request-call', requestSellerCall);

// Lead management
router.get('/leads/mine', getMyLeads); //Seller
router.patch('/leads/:id/contacted', markLeadContacted); //Seller

router.get('/requests/mine', getMyRequests); //Buyer
router.get('/:listingId/requests/check-status', checkMyRequest); //Buyer
export default router;