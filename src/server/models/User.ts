import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'ADMIN' | 'MODERATOR' | 'USER';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface IUser extends Document {
  userId: string;
  normalizedEmail: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  otpHash?: string;
  otpExpiresAt?: Date;
  otpAttempts?: number;
  otpLastSentAt?: Date;
  otpPurpose?: 'VERIFY_EMAIL' | 'RESET_PASSWORD';
  businessCategory: string;
  businessStage: string;
  location: string;
  language: 'hi' | 'en' | 'mr' | 'bn' | 'ta' | 'te' | 'gu' | 'kn';
  sheetsSynced: boolean;
  sheetsSyncedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    normalizedEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'महिला उद्यमी',
    },
    role: {
      type: String,
      enum: ['ADMIN', 'MODERATOR', 'USER'],
      default: 'USER',
      index: true,
    },
    accountStatus: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    otpHash: {
      type: String,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    otpLastSentAt: {
      type: Date,
    },
    otpPurpose: {
      type: String,
      enum: ['VERIFY_EMAIL', 'RESET_PASSWORD'],
    },
    businessCategory: {
      type: String,
      default: 'textiles_tailoring',
    },
    businessStage: {
      type: String,
      default: 'starting',
    },
    location: {
      type: String,
      default: 'India',
    },
    language: {
      type: String,
      enum: ['hi', 'en', 'mr', 'bn', 'ta', 'te', 'gu', 'kn'],
      default: 'hi',
    },
    sheetsSynced: {
      type: Boolean,
      default: false,
      index: true,
    },
    sheetsSyncedAt: {
      type: Date,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify password securely
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

// Static helper to normalize email
UserSchema.statics.normalizeEmail = function (email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.toLowerCase().trim();
};

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
