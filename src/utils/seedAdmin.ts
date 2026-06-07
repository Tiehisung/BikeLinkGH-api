import dotenv from 'dotenv';
import UserModel from '../models/user.model';
import connectDB from '../config/db.config';
 

dotenv.config();

const seedAdmin = async () => {
    await connectDB();

    try {
        const existing = await UserModel.findOne({ phoneNumber: process.env.ADMIN_PHONE });
        if (existing) {
            console.log('⚠️  Admin already exists');
            process.exit(0);
        }

        await UserModel.create({
            fullName: 'MotoClear Admin',
            phoneNumber: process.env.ADMIN_PHONE,
            password: process.env.ADMIN_PASSWORD,
            role: 'admin',
            isVerified: true,
            momoVerified: true,
        });

        console.log('✅ Admin user created successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();