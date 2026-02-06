import { SubscriptionStatus } from "@/lib/constants";
import mongoose, { Schema, Document } from 'mongoose';

export interface RequestedBy {
  userId: string;
  email: string;
  name: string;
}

export interface ReviewedBy {
  userId: string;
  email: string;
  name: string;
}

export interface ISubscription extends Document {
  applicationId: string;
  moduleId: string;
  moduleName: string;
  status: SubscriptionStatus;
  requestedBy: RequestedBy;
  requestedAt: Date;
  reviewedBy?: ReviewedBy,
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    applicationId: {
      type: String,
      required: true,
      ref: 'Application',
    },
    moduleId: {
      type: String,
      required: true,
      ref: 'Module',
    },
    moduleName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revoked'],
      default: 'pending',
    },
    requestedBy: {
      userId: { type: String, required: true },
      email: { type: String, required: true },
      name: { type: String, required: true },
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      userId: { type: String },
      email: { type: String },
      name: { type: String },
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
SubscriptionSchema.index({ applicationId: 1 });
SubscriptionSchema.index({ moduleId: 1 });
SubscriptionSchema.index({ moduleName: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ 'requestedBy.userId': 1 });

// Compound index for CORS lookups (module + approved status)
SubscriptionSchema.index({ moduleName: 1, status: 1 });

// Unique constraint: one subscription per app-module pair
SubscriptionSchema.index({ applicationId: 1, moduleId: 1 }, { unique: true });

export const Subscription =
  mongoose.models.SubscriptionV2 ||
  mongoose.model<ISubscription>('SubscriptionV2', SubscriptionSchema);
