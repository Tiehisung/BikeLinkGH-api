// src/modules/upload/upload.controller.ts
import { Request, Response } from 'express';
import { HttpStatusCode, } from 'axios'
import { cloudinary } from '../config/cloudinary.config';
import { IMulterFile, ICloudinaryFile } from '../types/file.interface';
import { formatCloudinaryResponse } from '../utils/cloudinary.util';


// Upload single image
export const uploadImageCTR = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image uploaded'
            });
        }

        // Multer-Cloudinary automatically uploads and gives us the file info
        const uploadedFile = req.file as IMulterFile;
        const formattedFile: ICloudinaryFile = formatCloudinaryResponse(uploadedFile);

        res.status(HttpStatusCode.Ok).json({
            success: true,
            message: 'Image uploaded successfully',
            data: formattedFile
        });

    } catch (error) {
        res.status(HttpStatusCode.InternalServerError).json({
            success: false,
            message: 'Image upload failed'
        });
    }
};

// Upload multiple images (gallery)
export const uploadImagesCTR = async (req: Request, res: Response) => {
    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(HttpStatusCode.BadRequest).json({
                success: false,
                message: 'No images uploaded'
            });
        }

        const images = (files as IMulterFile[]).map(file => formatCloudinaryResponse(file));

        res.status(HttpStatusCode.Ok).json({
            success: true,
            message: `${images.length} images uploaded successfully`,
            data: images
        });

    } catch (error) {
        console.error('Image files upload error:', error);
        res.status(HttpStatusCode.InternalServerError).json({
            success: false,
            message: 'Images upload failed'
        });
    }
};

// Upload video
export const uploadVideoFileCTR = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(HttpStatusCode.BadRequest).json({
                success: false,
                message: 'No video uploaded'
            });
        }

        const uploadedFile = req.file as IMulterFile;
        const formattedFile: ICloudinaryFile = formatCloudinaryResponse(uploadedFile);

        res.status(HttpStatusCode.Ok).json({
            success: true,
            message: 'Video uploaded successfully',
            data: formattedFile
        });

    } catch (error) {
        console.error('Video upload error:', error);
        res.status(HttpStatusCode.InternalServerError).json({
            success: false,
            message: 'Video upload failed'
        });
    }
};

// Upload document (PDF, etc)
export const uploadDocumentFileCTR = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(HttpStatusCode.BadRequest).json({
                success: false,
                message: 'No document uploaded'
            });
        }

        const uploadedFile = req.file as IMulterFile;
        const formattedFile: ICloudinaryFile = formatCloudinaryResponse(uploadedFile);

        res.status(HttpStatusCode.Ok).json({
            success: true,
            message: 'Document uploaded successfully',
            data: formattedFile
        });

    } catch (error) {
        console.error('Document upload error:', error);
        res.status(HttpStatusCode.InternalServerError).json({
            success: false,
            message: 'Document upload failed'
        });
    }
};

// Delete file from Cloudinary
export const deleteFileCTR = async (req: Request, res: Response) => {
    try {
        const { public_id, resource_type } = req.body;

        const result = await cloudinary.uploader.destroy(public_id, {
            resource_type: resource_type as string
        });

        if (result.result === 'ok') {
            res.status(HttpStatusCode.Ok).json({
                success: true,
                message: 'File deleted successfully',
                data: result
            });
        } else {
            res.status(HttpStatusCode.BadRequest).json({
                success: false,
                message: 'Failed to delete file'
            });
        }

    } catch (error) {
        console.error('Delete error:', error);
        res.status(HttpStatusCode.InternalServerError).json({
            success: false,
            message: 'File deletion failed'
        });
    }
};