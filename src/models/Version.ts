import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IVersion extends Document {
  moduleId: string
  moduleName: string
  version: string
  federation: {
    name: string
    entry: string
    manifestUrl: string
    exposes: Record<string, {
      import: string
      name: string
      assets: {
        js: { async: string[]; sync: string[] }
        css: { async: string[]; sync: string[] }
      }
    }>
    shared: Record<string, {
      version: string
      requiredVersion?: string
      singleton?: boolean
      eager?: boolean
      shareScope?: string
      assets: {
        js: { async: string[]; sync: string[] }
        css: { async: string[]; sync: string[] }
      }
    }>
    remotes?: Record<string, string>
    buildMeta: {
      buildVersion: string
      globalName: string
      remoteEntryType: 'esm' | 'cjs' | 'umd'
      remoteTypes?: string
      publicPath: string
      pluginVersion: string
      buildTime: Date
    }
  }
  assets: {
    remoteEntry: {
      url: string
      hash: string
      size: number
    }
    manifest: {
      url: string
      hash: string
      size: number
    }
    stats: {
      url: string
      hash: string
      size: number
    }
    types?: {
      url: string
      hash: string
      size: number
    }
    chunks: Array<{
      name: string
      url: string
      hash: string
      size: number
    }>
    documentation?: {
      url: string
      hash: string
      size: number
    }
  }
  buildTool: 'webpack' | 'rspack' | 'rsbuild' | 'vite'
  buildToolVersion: string
  readme?: string
  changelog?: string
  dependencies: Record<string, string>
  peerDependencies?: Record<string, string>
  publishedBy: {
    userId: string
    email: string
    name: string
  }
  publishedAt: Date
  downloadCount: number
  isPrerelease: boolean
  isDeprecated: boolean
  deprecationMessage?: string
  createdAt: Date
  updatedAt: Date
}

const VersionSchema = new Schema<IVersion>(
  {
    moduleId: { type: String, required: true },
    moduleName: { type: String, required: true },
    version: { type: String, required: true },
    federation: {
      name: { type: String, required: true },
      entry: { type: String, required: true },
      manifestUrl: { type: String, required: true },
      exposes: { type: Schema.Types.Mixed, default: {} },
      shared: { type: Schema.Types.Mixed, default: {} },
      remotes: { type: Schema.Types.Mixed },
      buildMeta: {
        buildVersion: { type: String, required: true },
        globalName: { type: String, required: true },
        remoteEntryType: {
          type: String,
          enum: ['esm', 'cjs', 'umd'],
          required: true,
        },
        remoteTypes: { type: String },
        publicPath: { type: String, required: true },
        pluginVersion: { type: String, required: true },
        buildTime: { type: Date, required: true },
      },
    },
    assets: {
      remoteEntry: {
        url: { type: String, required: true },
        hash: { type: String, required: true },
        size: { type: Number, required: true },
      },
      manifest: {
        url: { type: String, required: true },
        hash: { type: String, required: true },
        size: { type: Number, required: true },
      },
      stats: {
        url: { type: String, required: true },
        hash: { type: String, required: true },
        size: { type: Number, required: true },
      },
      types: {
        url: { type: String },
        hash: { type: String },
        size: { type: Number },
      },
      chunks: [
        {
          name: { type: String, required: true },
          url: { type: String, required: true },
          hash: { type: String, required: true },
          size: { type: Number, required: true },
        },
      ],
      documentation: {
        url: { type: String },
        hash: { type: String },
        size: { type: Number },
      },
    },
    buildTool: {
      type: String,
      enum: ['webpack', 'rspack', 'rsbuild', 'vite'],
      required: true,
    },
    buildToolVersion: { type: String, required: true },
    readme: { type: String },
    changelog: { type: String },
    dependencies: { type: Schema.Types.Mixed, default: {} },
    peerDependencies: { type: Schema.Types.Mixed },
    publishedBy: {
      userId: { type: String, required: true },
      email: { type: String, required: true },
      name: { type: String, required: true },
    },
    publishedAt: { type: Date, required: true },
    downloadCount: { type: Number, default: 0 },
    isPrerelease: { type: Boolean, default: false },
    isDeprecated: { type: Boolean, default: false },
    deprecationMessage: { type: String },
  },
  {
    timestamps: true,
  }
)

// Indexes
VersionSchema.index({ moduleId: 1, version: -1 })
VersionSchema.index({ moduleName: 1, version: -1 })
VersionSchema.index({ publishedAt: -1 })
VersionSchema.index({ 'federation.shared': 1 })

// Compound unique index
VersionSchema.index({ moduleId: 1, version: 1 }, { unique: true })

const VersionModel: Model<IVersion> =
  mongoose.models.Version || mongoose.model<IVersion>('Version', VersionSchema)

export default VersionModel
