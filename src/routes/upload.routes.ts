// src/modules/upload/upload.routes.ts
import { Router } from 'express';
 
import {
    uploadImageCTR,
    uploadImagesCTR,
    uploadVideoFileCTR,
    uploadDocumentFileCTR,
    deleteFileCTR
} from '../controllers/upload.ctrl';
import { uploadSingleImage, uploadMultipleImages, uploadVideo, uploadDocument, uploadMixed } from '../config/cloudinary.config';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Protect all upload routes
router.use(authenticate);

// Single image upload
router.post('/image', uploadSingleImage, uploadImageCTR);

// Multiple images upload (gallery)
router.post('/images', uploadMultipleImages, uploadImagesCTR);

// Video upload
router.post('/video', uploadVideo, uploadVideoFileCTR);

// Document upload
router.post('/document', uploadDocument, uploadDocumentFileCTR);

// Mixed upload (different fields)
router.post('/mixed', uploadMixed, async (req, res) => {
    const files = req.files as any;
    res.json({
        success: true,
        data: files
    });
});

// Delete file
router.delete('/', deleteFileCTR);

export default router;