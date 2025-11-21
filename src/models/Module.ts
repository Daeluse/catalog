import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IModule extends Document {
  name: string
  displayName: string
  description: string
  organization: string
  repository?: string
  homepage?: string
  license?: string
  keywords: string[]
  category: string
  icon?: string
  status: 'active' | 'deprecated' | 'archived'
  owner: {
    userId: string
    email: string
    name: string
  }
  maintainers: Array<{
    userId: string
    email: string
    name: string
    role: 'admin' | 'write' | 'read'
  }>
  latestVersion?: string
  latestVersionId?: string
  createdAt: Date
  updatedAt: Date
  totalDownloads: number
  weeklyDownloads: number
}

const ModuleSchema = new Schema<IModule>(
  {
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    description: { type: String, required: true },
    organization: { type: String, required: true },
    repository: { type: String },
    homepage: { type: String },
    license: { type: String },
    keywords: [{ type: String }],
    category: { type: String, required: true },
    icon: { type: String },
    status: {
      type: String,
      enum: ['active', 'deprecated', 'archived'],
      default: 'active',
    },
    owner: {
      userId: { type: String, required: true },
      email: { type: String, required: true },
      name: { type: String, required: true },
    },
    maintainers: [
      {
        userId: { type: String, required: true },
        email: { type: String, required: true },
        name: { type: String, required: true },
        role: { type: String, enum: ['admin', 'write', 'read'], default: 'write' },
      },
    ],
    latestVersion: { type: String },
    latestVersionId: { type: String },
    totalDownloads: { type: Number, default: 0 },
    weeklyDownloads: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
)

// Indexes (name index is automatically created via unique: true)
ModuleSchema.index({ organization: 1, createdAt: -1 })
ModuleSchema.index({ keywords: 1 })
ModuleSchema.index({ category: 1 })
ModuleSchema.index({ 'owner.userId': 1 })
ModuleSchema.index({ name: 'text', displayName: 'text', description: 'text' })

const ModuleModel: Model<IModule> =
  mongoose.models.Module || mongoose.model<IModule>('Module', ModuleSchema)

export default ModuleModel
