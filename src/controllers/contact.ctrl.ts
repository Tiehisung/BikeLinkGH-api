import { Request, Response } from 'express';
import ContactModel from '../models/contact.model';
import { IApiResponse, IAuthRequest } from '../types';
import { sendContactNotification } from '../services/email-node-mailer.service';

// ============================================
// SUBMIT CONTACT FORM
// ============================================
export const submitContact = async (req: Request, res: Response): Promise<void> => {
    try {
        const { fullName, phoneNumber, email, inquiryType, message } = req.body;

        // Validate required fields
        if (!fullName || !phoneNumber || !inquiryType) {
            res.status(400).json({
                success: false,
                message: 'Full name, phone number, and inquiry type are required',
            } as IApiResponse);
            return;
        }

        // Validate Ghana phone number
        const phoneRegex = /^0[0-9]{9}$/;
        if (!phoneRegex.test(phoneNumber)) {
            res.status(400).json({
                success: false,
                message: 'Enter a valid Ghana phone number (e.g., 024XXXXXXX)',
            } as IApiResponse);
            return;
        }

        // Validate email if provided
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                res.status(400).json({
                    success: false,
                    message: 'Enter a valid email address',
                } as IApiResponse);
                return;
            }
        }

        // Create contact record
        const contact = await ContactModel.create({
            fullName,
            phoneNumber,
            email: email || undefined,
            inquiryType,
            message: message || undefined,
            status: 'new',
        });

        console.log(message)

        // ✅ Send email notification (don't await - fire and forget)
        sendContactNotification(message).catch((err) => {
            console.error('Failed to send notification:', err);
        });

        res.status(201).json({
            success: true,
            message: 'Message sent successfully! We will get back to you within 24 hours.',
            data: {
                id: contact._id,
                fullName: contact.fullName,
                inquiryType: contact.inquiryType,
                createdAt: contact.createdAt,
            },
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
        console.error('Contact submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again.',
        } as IApiResponse);
    }
};

// ============================================
// ADMIN: GET ALL CONTACTS
// ============================================
export const getAllContacts = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            inquiryType,
            search,
            sort = '-createdAt',
        } = req.query as any;

        // Build filter
        const filter: any = {};
        if (status && status !== 'all') filter.status = status;
        if (inquiryType && inquiryType !== 'all') filter.inquiryType = inquiryType;
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } },
            ];
        }

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(100, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [contacts, total] = await Promise.all([
            ContactModel.find(filter)
                .sort(sort as string)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            ContactModel.countDocuments(filter),
        ]);

        // Count by status
        const statusCounts = await ContactModel.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        const stats = statusCounts.reduce((acc: any, s) => {
            acc[s._id] = s.count;
            return acc;
        }, {});

        res.json({
            success: true,
            count: contacts.length,
            data: contacts,
            stats,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
                hasNextPage: pageNum < Math.ceil(total / limitNum),
                hasPreviousPage: pageNum > 1,
                nextPage: pageNum < Math.ceil(total / limitNum) ? pageNum + 1 : null,
                previousPage: pageNum > 1 ? pageNum - 1 : null
            },
        } as IApiResponse);
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contacts',
        } as IApiResponse);
    }
};
// ============================================
// ADMIN: GET SINGLE CONTACT
// ============================================
export const getContactById = async (req: Request, res: Response): Promise<void> => {
    try {
        const contact = await ContactModel.findById(req.params.id);

        if (!contact) {
            res.status(404).json({
                success: false,
                message: 'Contact not found',
            } as IApiResponse);
            return;
        }

        res.json({
            success: true,
            data: contact,
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contact',
        } as IApiResponse);
    }
};

// ============================================
// ADMIN: UPDATE CONTACT STATUS
// ============================================
export const updateContactStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const validStatuses = ['new', 'read', 'replied', 'closed'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({
                success: false,
                message: `Invalid status. Use: ${validStatuses.join(', ')}`,
            } as IApiResponse);
            return;
        }

        const update: any = { status };
        if (notes) update.notes = notes;

        const contact = await ContactModel.findByIdAndUpdate(id, update, { new: true });

        if (!contact) {
            res.status(404).json({
                success: false,
                message: 'Contact not found',
            } as IApiResponse);
            return;
        }

        res.json({
            success: true,
            message: `Contact marked as ${status}`,
            data: contact,
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update contact',
        } as IApiResponse);
    }
};


// ============================================
// ADMIN: DELETE CONTACT
// ============================================
export const deleteContact = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const contact = await ContactModel.findByIdAndDelete(req.params.id);

        if (!contact) {
            res.status(404).json({
                success: false,
                message: 'Contact not found',
            } as IApiResponse);
            return;
        }

        res.json({
            success: true,
            message: 'Contact deleted',
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete contact',
        } as IApiResponse);
    }
};