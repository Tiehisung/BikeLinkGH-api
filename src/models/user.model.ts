import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export enum EUserRole {
    SELLER = "seller",
    BUYER = "buyer", 
    MANAGER = "manager",
    ADMIN = "admin"
}

const userSchema = new Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        match: [/^0[0-9]{9}$/, 'Please enter a valid Ghana phone number starting with 0']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't return password in queries
    },
    role: {
        type: String,
        enum: Object.values(EUserRole),
        default: EUserRole.BUYER
    },

    // Identity Verification
    isVerified: {
        type: Boolean,
        default: false
    },
    ghanaCardImage: {
        type: String // Cloudinary URL
    },
    ghanaCardSelfie: {
        type: String // Cloudinary URL
    },
    ghanaCardNumber: {
        type: String
    },

    // MoMo Verification
    momoNumber: {
        type: String
    },
    momoVerified: {
        type: Boolean,
        default: false
    },

    // Location
    region: {
        type: String,
    },
    town: {
        type: String
    },

    // Account Status
    isActive: {
        type: Boolean,
        default: true
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function (this: any) {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Remove password when converting to JSON
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

const UserModel = mongoose.models.User || mongoose.model("User", userSchema);

export default UserModel;

export interface IUser extends Document {
    fullName: string;
    phoneNumber: string;
    email: string;
    password: string;
    role: EUserRole
    isVerified: boolean;
    ghanaCardImage?: string;
    ghanaCardSelfie?: string;
    ghanaCardNumber?: string;
    momoNumber?: string;
    momoVerified: boolean;
    region?: string
    town?: string;
    isActive: boolean;
    createdAt: Date;
    comparePassword(enteredPassword: string): Promise<boolean>;
}