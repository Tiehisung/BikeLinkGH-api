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
    contactSeller,
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

// Contact
router.post('/:id/contact', contactSeller);

export default router;