import mongoose, { Document, Schema, Model } from 'mongoose';
import { AiProvider, KeyStatus, ErrorCategory } from '../ai/types';

export interface IAiKeyDocument extends Document {
  keyId: string;
  provider: AiProvider;
  maskedKey: string;
  encryptedKey: string;
  keyFingerprint: string;
  status: KeyStatus;
  enabled: boolean;
  projectId?: string;
  orgId?: string;
  lastUsedAt?: Date;
  lastSuccessAt?: Date;
  lastCheckedAt?: Date;
  lastErrorCategory?: ErrorCategory;
  lastErrorMessage?: string;
  cooldownUntil?: Date;
  failureCount: number;
  successCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AiKeySchema = new Schema<IAiKeyDocument>(
  {
    keyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ['groq', 'gemini'],
      index: true,
    },
    maskedKey: {
      type: String,
      required: true,
    },
    encryptedKey: {
      type: String,
      required: true,
    },
    keyFingerprint: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'FAILED', 'TEMPORARILY_UNAVAILABLE', 'DISABLED', 'NEEDS_CONFIGURATION'],
      default: 'NEEDS_CONFIGURATION',
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    projectId: { type: String, trim: true },
    orgId: { type: String, trim: true },
    lastUsedAt: { type: Date },
    lastSuccessAt: { type: Date },
    lastCheckedAt: { type: Date },
    lastErrorCategory: { type: String },
    lastErrorMessage: { type: String },
    cooldownUntil: { type: Date },
    failureCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

AiKeySchema.index({ provider: 1, keyFingerprint: 1 }, { unique: true });

export const AiKeyModel: Model<IAiKeyDocument> =
  mongoose.models.AiKey || mongoose.model<IAiKeyDocument>('AiKey', AiKeySchema);

export interface IAiProviderConfigDocument extends Document {
  provider: AiProvider;
  preferredModel: string;
  maxRequestsPerMinute: number;
  maxDailyRequests: number;
  retryBudget: number;
  timeoutMs: number;
}

const AiProviderConfigSchema = new Schema<IAiProviderConfigDocument>(
  {
    provider: {
      type: String,
      required: true,
      unique: true,
      enum: ['groq', 'gemini'],
    },
    preferredModel: {
      type: String,
      required: true,
    },
    maxRequestsPerMinute: {
      type: Number,
      default: 60,
    },
    maxDailyRequests: {
      type: Number,
      default: 5000,
    },
    retryBudget: {
      type: Number,
      default: 3,
    },
    timeoutMs: {
      type: Number,
      default: 8000,
    },
  },
  {
    timestamps: true,
  }
);

export const AiProviderConfigModel: Model<IAiProviderConfigDocument> =
  mongoose.models.AiProviderConfig ||
  mongoose.model<IAiProviderConfigDocument>('AiProviderConfig', AiProviderConfigSchema);
