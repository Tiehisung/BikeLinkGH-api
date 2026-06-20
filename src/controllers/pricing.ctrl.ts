import { Response } from 'express';
import PricingModel from '../models/pricing.model';
import { IAuthRequest, IApiResponse } from '../types';


// GET ALL (Grouped by category)
export const getAllPricing = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const items = await PricingModel.find()
            .sort({ category: 1, displayOrder: 1 })
            .lean();

        // Group by category for admin display
        const grouped = items.reduce((acc: any, item) => {
            if (!acc[item.category]) {
                acc[item.category] = {
                    category: item.category,
                    categoryName: item.categoryName,
                    options: [],
                };
            }
            acc[item.category].options.push(item);
            return acc;
        }, {});

        res.json({
            success: true,
            count: items.length,
            data: Object.values(grouped),
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch pricing' } as IApiResponse);
    }
};

// GET ACTIVE (Public - Grouped by category)
export const getActivePricing = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const items = await PricingModel.find({ isActive: true })
            .sort({ category: 1, displayOrder: 1 })
            .select('-updatedBy -createdAt -updatedAt')
            .lean();

        const grouped = items.reduce((acc: any, item) => {
            if (!acc[item.category]) {
                acc[item.category] = {
                    category: item.category,
                    categoryName: item.categoryName,
                    options: [],
                };
            }
            acc[item.category].options.push({
                key: item.key,
                label: item.label,
                description: item.description,
                amount: item.amount,
                currency: item.currency,
                features: item.features,
                isPopular: item.isPopular,
                metadata: item.metadata,
            });
            return acc;
        }, {});

        res.json({
            success: true,
            data: Object.values(grouped),
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch pricing' } as IApiResponse);
    }
};

// GET BY CATEGORY
export const getPricingByCategory = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { category } = req.params;
        const items = await PricingModel.find({ category, isActive: true })
            .sort({ displayOrder: 1 })
            .lean();

        res.json({ success: true, count: items.length, data: items } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch pricing' } as IApiResponse);
    }
};

// CREATE
export const createPricing = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const pricing = await PricingModel.create({
            ...req.body,
            updatedBy: req.user!._id,
        });

        res.status(201).json({ success: true, message: 'Pricing created', data: pricing } as IApiResponse);
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(400).json({ success: false, message: 'Duplicate key for this category' } as IApiResponse);
            return;
        }
        res.status(500).json({ success: false, message: 'Failed to create pricing' } as IApiResponse);
    }
};

// UPDATE
export const updatePricing = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const pricing = await PricingModel.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedBy: req.user!._id },
            { new: true, runValidators: true }
        );

        if (!pricing) {
            res.status(404).json({ success: false, message: 'Pricing not found' } as IApiResponse);
            return;
        }

        res.json({ success: true, message: 'Pricing updated', data: pricing } as IApiResponse);
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(400).json({ success: false, message: 'Duplicate key for this category' } as IApiResponse);
            return;
        }
        res.status(500).json({ success: false, message: 'Failed to update pricing' } as IApiResponse);
    }
};

// TOGGLE ACTIVE
export const togglePricingActive = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const pricing = await PricingModel.findById(req.params.id);
        if (!pricing) {
            res.status(404).json({ success: false, message: 'Pricing not found' } as IApiResponse);
            return;
        }

        pricing.isActive = !pricing.isActive;
        pricing.updatedBy = req.user!._id;
        await pricing.save();

        res.json({
            success: true,
            message: `${pricing.label} ${pricing.isActive ? 'activated' : 'deactivated'}`,
            data: pricing,
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to toggle' } as IApiResponse);
    }
};

// DELETE
export const deletePricing = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const pricing = await PricingModel.findByIdAndDelete(req.params.id);
        if (!pricing) {
            res.status(404).json({ success: false, message: 'Pricing not found' } as IApiResponse);
            return;
        }

        res.json({ success: true, message: 'Pricing deleted' } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete' } as IApiResponse);
    }
};