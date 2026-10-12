import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IActivityLog extends Document {
  eventId: string;
  actorUserId: string;
  actorRole: string;
  action: string;
  targetId?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    actorUserId: {
      type: String,
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetId: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
