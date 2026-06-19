import { Request, Response } from 'express';
import { IApiResponse } from '../../types';
import UserModel from '../../models/user.model';
// import { seedBrands } from './seedBrands';
// import { seedLocations } from './seedLocations';

export const scriptCtrl = async (req: Request, res: Response): Promise<void> => {
    const result = await UserModel.findOneAndUpdate({ phoneNumber: '0206404992' }, { $set: { email: 'isoskode@gmail.com' } })
    try {
        res.status(201).json({
            success: true,
            message: 'Script successful',
            data: result
        } as IApiResponse);
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            res.status(400).json({
                success: false,
                message: messages.join(', '),
            } as IApiResponse);
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Server error during scripting',
        } as IApiResponse);
    }
};
