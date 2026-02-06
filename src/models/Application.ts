import mongoose, { Schema, Document } from 'mongoose';
import { Owner } from "@/types/api";

export interface IApplication extends Document {
  name: string;
  description: string;
  contactEmail: string;
  owner: Owner;
  origins: string[];
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    owner: {
      userId: { type: String, required: true },
      email: { type: String, required: true },
      name: { type: String, required: true },
    },
    origins: {
      type: [String],
      required: true,
      validate: {
        validator: function (origins: string[]) {
          return origins.length > 0;
        },
        message: 'At least one origin is required',
      },
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying by owner
ApplicationSchema.index({ 'owner.userId': 1 });
ApplicationSchema.index({ status: 1 });

export const Application =
  mongoose.models.Application ||
  mongoose.model<IApplication>('Application', ApplicationSchema);
