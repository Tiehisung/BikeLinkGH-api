// src/utils/cloudinary.helper.ts
import { Request } from 'express';
import { cloudinary } from '../config/cloudinary.config';
import { ICloudinaryFile } from '../types/file.interface';
 
 
 
export const getThumbnailUrl = (publicId: string, width = 400, height = 320) => {
    return cloudinary.url(publicId, {
        width,
        height,
        crop: 'fill',
        quality: 'auto',
        format: 'jpg'
    });
};

export const getVideoThumbnail = (publicId: string, timestamp = '4') => {
    return cloudinary.url(publicId, {
        resource_type: 'video',
        start_offset: timestamp,
        width: 640,
        quality: 'auto', format: 'jpg'
    });
};

export const getDefaultCldFolder = (req: Request) => {
    // Determine folder based on route or file type
    let folder = 'bunyeni-fc';

    // Customize folder based on request path
    if (req.baseUrl.includes('players')) {
        folder = 'bunyeni-fc/players';
    } else if (req.baseUrl.includes('news')) {
        folder = 'bunyeni-fc/news';
    } else if (req.baseUrl.includes('matches')) {
        folder = 'bunyeni-fc/matches';
    } else if (req.baseUrl.includes('sponsors')) {
        folder = 'bunyeni-fc/sponsors';
    } else if (req.baseUrl.includes('staff')) {
        folder = 'bunyeni-fc/staff';
    }

    return folder
}


export const formatCloudinaryResponse = (file: any): ICloudinaryFile => {
    // If it's already a Cloudinary file (from CloudinaryStorage)
    if (file.secure_url || file.public_id) {
        return {
            secure_url: file.secure_url || file.path,
            url: file.path || file.url,
            thumbnail_url: file.thumbnail_url || getVideoThumbnail(file.public_id),
            public_id: file.public_id || file.filename,
            resource_type: file.resource_type || getResourceType(file.mimetype),
            format: file.format || getFileFormat(file.originalname),
            bytes: file.bytes || file.size,
            type: file.type || 'upload',
            original_filename: file.original_filename || file.originalname,
            width: file.width,
            height: file.height,
            duration: file.duration
        };
    }

    // If it's a Multer file (from local storage)
    return {
        secure_url: file.path, // Local path
        url: file.path,
        public_id: file.filename,
        resource_type: getResourceType(file.mimetype),
        format: getFileFormat(file.originalname),
        bytes: file.size,
        type: 'upload',
        original_filename: file.originalname,
        thumbnail_url: getResourceType(file.mimetype) == 'video' ? getVideoThumbnail(file.filename) : getThumbnailUrl(file.filename),
    };
};

// Helper functions
const getResourceType = (mimetype: string): "image" | "video" | "raw" => {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    return 'raw';
};

const getFileFormat = (filename: string): string => {
    return filename.split('.').pop() || 'unknown';
};


export function extractPublicIdFromUrl(url:string) {
    // Split by '/upload/' and take the part after it
    const uploadIndex = url?.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    let path = url?.substring(uploadIndex + 8); // Remove '/upload/'

    // Remove version prefix if present (e.g., 'v1234567890/')
    const parts = path?.split('/');
    if (parts && parts[0].startsWith('v')) {
        parts.shift(); // Remove the version part
    }

    // Join remaining parts and remove file extension
    let publicId = parts?.join('/');
    const lastDotIndex = publicId?.lastIndexOf('.');
    if (lastDotIndex !== -1) {
        publicId = publicId?.substring(0, lastDotIndex);
    }

    return publicId;
}
