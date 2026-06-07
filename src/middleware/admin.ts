import { NextFunction, Request, Response } from "express";

const adminOnly = (req: Request,
    res: Response,
    next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Admin access only'
        });
    }
};

module.exports = { adminOnly };