import { Request, Response } from 'express';
import LocationModel from '../models/location.model';
import { IApiResponse, IAuthRequest } from '../types';
import { slugify } from '../lib/slug';

export const getLocations = async (req: Request, res: Response): Promise<void> => {
    try {
        const { region } = req.query;

        const filter: any = { isActive: true };
        if (region) filter.region = region;

        const locations = await LocationModel.find(filter)
            .sort({ displayOrder: 1, name: 1 })
            .select('name slug region type isPopular')
            .lean();

        res.json({ success: true, count: locations.length, data: locations } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch locations' } as IApiResponse);
    }
};

export const getPopularLocations = async (req: Request, res: Response): Promise<void> => {
    try {
        const locations = await LocationModel.find({ isActive: true, isPopular: true })
            .sort({ displayOrder: 1 })
            .select('name slug region type')
            .lean();

        res.json({ success: true, count: locations.length, data: locations } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch locations' } as IApiResponse);
    }
};

export const getLocationsByRegion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { region } = req.params;
        const locations = await LocationModel.find({ isActive: true, region })
            .sort({ displayOrder: 1, name: 1 })
            .select('name slug type isPopular')
            .lean();

        res.json({ success: true, count: locations.length, data: locations } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch locations' } as IApiResponse);
    }
};

// Admin


export const getAllLocations = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const locations = await LocationModel.find().sort({ region: 1, displayOrder: 1, name: 1 }).lean();
        res.json({ success: true, count: locations.length, data: locations } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch locations' } as IApiResponse);
    }
};

export const createLocation = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { name, region, type, isPopular, displayOrder } = req.body;

        const existing = await LocationModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existing) {
            res.status(400).json({ success: false, message: 'Location already exists' } as IApiResponse);
            return;
        }

        const slug = slugify(name)
        const location = await LocationModel.create({
            name, 
            slug,
            region: region || 'Upper West',
            type: type || 'town',
            isPopular: isPopular || false,
            displayOrder: displayOrder || 0,
        });

        res.status(201).json({ success: true, message: 'Location created', data: location } as IApiResponse);
    } catch (error: any) {
        console.log(error)
        res.status(500).json({ success: false, message: 'Failed to create location' } as IApiResponse);
    }
};

export const updateLocation = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, region, type, isPopular, isActive, displayOrder } = req.body;

        const location = await LocationModel.findById(id);
        if (!location) {
            res.status(404).json({ success: false, message: 'Not found' } as IApiResponse);
            return;
        }

        if (name) location.name = name;
        if (region) location.region = region;
        if (type) location.type = type;
        if (isPopular !== undefined) location.isPopular = isPopular;
        if (isActive !== undefined) location.isActive = isActive;
        if (displayOrder !== undefined) location.displayOrder = displayOrder;

        await location.save();
        res.json({ success: true, message: 'Location updated', data: location } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update' } as IApiResponse);
    }
};

export const toggleLocationActive = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const location = await LocationModel.findById(req.params.id);
        if (!location) {
            res.status(404).json({ success: false, message: 'Not found' } as IApiResponse);
            return;
        }
        location.isActive = !location.isActive;
        await location.save();
        res.json({ success: true, message: `Location ${location.isActive ? 'activated' : 'deactivated'}`, data: location } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed' } as IApiResponse);
    }
};

export const deleteLocation = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const location = await LocationModel.findByIdAndDelete(req.params.id);
        if (!location) {
            res.status(404).json({ success: false, message: 'Not found' } as IApiResponse);
            return;
        }
        res.json({ success: true, message: 'Location deleted' } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed' } as IApiResponse);
    }
};