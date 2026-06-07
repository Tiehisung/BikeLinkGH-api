
// src/types/global.d.ts
import mongoose from 'mongoose';
import { IUser } from './user.interface';


declare global {
    //EXPRESS REQUEST EXTENSIONS
    namespace Express {
        interface Request {
            user?: IUser;
            token?: string;
        }
    }

    // MONGOOSE CONNECTION CACHING (for Vercel serverless)
    var mongooseConn: {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
    };
}

export { };