import mongoose, { Schema, Document } from 'mongoose'

export interface IApiToken extends Document {
  name: string
  tokenHash: string
  userId: string
  userEmail: string
  userName: string
  expiresAt: Date
  lastUsedAt?: Date
  status: 'active' | 'revoked'
  createdAt: Date
  updatedAt: Date
}

const ApiTokenSchema = new Schema<IApiToken>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Compound index for efficient lookups
ApiTokenSchema.index({ userId: 1, status: 1 })
ApiTokenSchema.index({ tokenHash: 1, status: 1 })

export const ApiToken =
  mongoose.models.ApiToken ||
  mongoose.model<IApiToken>('ApiToken', ApiTokenSchema)
