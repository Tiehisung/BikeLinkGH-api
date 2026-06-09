import { Request, Response } from 'express';
import BrandModel, { EBrandTier } from '../models/brand.model';
import { IApiResponse, IAuthRequest } from '../types';
import { slugify } from '../lib/slug';

// ============================================
// GET ALL ACTIVE BRANDS (Sorted by display order)
// ============================================
export const getBrands = async (req: Request, res: Response): Promise<void> => {
    try {
        const brands = await BrandModel.find({ isActive: true })
            .sort({ displayOrder: 1, name: 1 })
            .select('name slug tier isPopular logo')
            .lean();

        res.json({
            success: true,
            count: brands.length,
            data: brands,
        } as IApiResponse);
    } catch (error) {
        console.error('Get brands error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brands',
        } as IApiResponse);
    }
};

// ============================================
// GET POPULAR BRANDS ONLY
// ============================================
export const getPopularBrands = async (req: Request, res: Response): Promise<void> => {
    try {
        const brands = await BrandModel.find({
            isActive: true,
            isPopular: true,
        })
            .sort({ displayOrder: 1 })
            .select('name slug tier logo')
            .lean();

        res.json({
            success: true,
            count: brands.length,
            data: brands,
        } as IApiResponse);
    } catch (error) {
        console.error('Get popular brands error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch popular brands',
        } as IApiResponse);
    }
};

// ============================================
// GET BRANDS BY TIER
// ============================================
export const getBrandsByTier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tier } = req.params;

        if (!['high', 'mid', 'economy'].includes(tier)) {
            res.status(400).json({
                success: false,
                message: 'Invalid tier. Use: high, mid, or economy',
            } as IApiResponse);
            return;
        }

        // Ensure tier has the correct literal type for Mongoose/TS strict checks
        const brands = await BrandModel.find({
            isActive: true,
            tier: tier as EBrandTier,
        })
            .sort({ displayOrder: 1, name: 1 })
            .select('name slug tier isPopular logo')
            .lean();

        res.json({
            success: true,
            count: brands.length,
            data: brands,
        } as IApiResponse);
    } catch (error) {
        console.error('Get brands by tier error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brands by tier',
        } as IApiResponse);
    }
}

// ADMIN
export const getAllBrands = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const brands = await BrandModel.find()
            .sort({ displayOrder: 1, name: 1 })
            .lean();

        res.json({
            success: true,
            count: brands.length,
            data: brands,
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch brands' } as IApiResponse);
    }
};

export const createBrand = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { name, tier, isPopular, displayOrder } = req.body;

        // Check duplicate
        const existing = await BrandModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existing) {
            res.status(400).json({ success: false, message: 'Brand already exists' } as IApiResponse);
            return;
        }

        const slug = slugify(name)
        const brand = await BrandModel.create({
            name,
            slug,
            tier: tier || 'mid',
            isPopular: isPopular || false,
            displayOrder: displayOrder || 0,
        });

        res.status(201).json({
            success: true,
            message: 'Brand created successfully',
            data: brand,
        } as IApiResponse);
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            res.status(400).json({ success: false, message: messages.join(', ') } as IApiResponse);
            return;
        }
        res.status(500).json({ success: false, message: 'Failed to create brand' } as IApiResponse);
    }
};

// ============================================
// UPDATE BRAND
// ============================================
export const updateBrand = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, tier, isPopular, isActive, displayOrder } = req.body;

        const brand = await BrandModel.findById(id);
        if (!brand) {
            res.status(404).json({ success: false, message: 'Brand not found' } as IApiResponse);
            return;
        }

        if (name) brand.name = name;
        if (tier) brand.tier = tier;
        if (isPopular !== undefined) brand.isPopular = isPopular;
        if (isActive !== undefined) brand.isActive = isActive;
        if (displayOrder !== undefined) brand.displayOrder = displayOrder;

        await brand.save();

        res.json({
            success: true,
            message: 'Brand updated successfully',
            data: brand,
        } as IApiResponse);
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update brand' } as IApiResponse);
    }
};

// ============================================
// TOGGLE BRAND ACTIVE STATUS
// ============================================
export const toggleBrandActive = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const brand = await BrandModel.findById(id);
        if (!brand) {
            res.status(404).json({ success: false, message: 'Brand not found' } as IApiResponse);
            return;
        }

        brand.isActive = !brand.isActive;
        await brand.save();

        res.json({
            success: true,
            message: `Brand ${brand.isActive ? 'activated' : 'deactivated'}`,
            data: brand,
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to toggle brand' } as IApiResponse);
    }
};

// ============================================
// DELETE BRAND
// ============================================
export const deleteBrand = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const brand = await BrandModel.findByIdAndDelete(id);
        if (!brand) {
            res.status(404).json({ success: false, message: 'Brand not found' } as IApiResponse);
            return;
        }

        res.json({
            success: true,
            message: 'Brand deleted successfully',
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete brand' } as IApiResponse);
    }
};