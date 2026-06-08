import { IUser } from "../models/user.model";



export interface ICloudinaryFile {
    secure_url: string;
    url: string;
    thumbnail_url?: string;
    public_id: string;
    resource_type: "image" | "video" | "raw" | string;
    format?: string;
    bytes?: number;
    type: string;
    original_filename?: string;
    width?: number;
    height?: number;
    duration?: number;
}
export interface IFileProps extends ICloudinaryFile {
    //For DB
    _id?: string;
    name?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface IGallery {
    _id?: string;
    title?: string;
    description: string;
    files: Array<IFileProps>;
    timestamp?: number;

    type?: 'player' | 'donation' | 'general',
    tags?: string[];
    createdBy?: Partial<IUser>
    createdAt?: string;
    updatedAt?: string;
}

export interface IMulterFile {
    fieldname: string
    originalname: string
    encoding: string
    mimetype: string
    path: string
    size: number
    filename: string
}

const examplemulterfile = {
    "fieldname": "image",
    "originalname": "IMURAN MUFID.jpg",
    "encoding": "7bit",
    "mimetype": "image/jpeg",
    "path": "https://res.cloudinary.com/djzfztrig/image/upload/v1772287441/bunyeni-fc/images/1772287438528-IMURAN%20MUFID.jpg",
    "size": 148147,
    "filename": "bunyeni-fc/images/1772287438528-IMURAN MUFID"
}