import mongoose, { Schema, Document, Model } from 'mongoose';

export interface FederationExpose {
  import: string;
  name: string;
  assets: {
    js: { async: string[]; sync: string[]; };
    css: { async: string[]; sync: string[]; };
  };
}

export type FederationExposes = Record<string, FederationExpose | string>;

export interface FederationShare {
  version: string;
  requiredVersion?: string;
  singleton?: boolean;
  eager?: boolean;
  shareScope?: string;
  assets: {
    js: { async: string[]; sync: string[]; };
    css: { async: string[]; sync: string[]; };
  };
}

export type FederationShared = Record<string, FederationShare>;

export interface FederationBuildMeta {
  buildVersion: string;
  globalName: string;
  remoteEntryType: 'esm' | 'cjs' | 'umd';
  remoteTypes?: string;
  publicPath: string;
  pluginVersion: string;
  buildTime: Date;
}

export interface Federation {
  name: string;
  entry: string;
  manifestUrl: string;
  exposes: FederationExposes;
  shared: FederationShared;
  remotes?: Record<string, string>;
  buildMeta: FederationBuildMeta;
}

export interface Asset {
  url: string;
  fileName: string;
  hash: string;
  size: number;
}

export interface Assets {
  remoteEntry: Asset;
  manifest: Asset;
  assets: Asset[];
}

export interface PublishedBy {
  userId: string;
  email: string;
  name: string;
}

export interface IVersion extends Document {
  moduleId: string;
  moduleName: string;
  version: string;
  federation: Federation;
  assets: Assets;
  buildTool: 'webpack' | 'rspack' | 'rsbuild' | 'vite';
  buildToolVersion: string;
  readme?: string;
  changelog?: string;
  dependencies: Record<string, string>;
  peerDependencies?: Record<string, string>;
  publishedBy: PublishedBy;
  publishedAt: Date;
  downloadCount: number;
  isPrerelease: boolean;
  isDeprecated: boolean;
  deprecationMessage?: string;
  createdAt: Date;
  updatedAt: Date;
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
        fileName: { type: String, required: true },
        hash: { type: String, required: true },
        size: { type: Number, required: true },
        url: { type: String, required: true },
      },
      manifest: {
        fileName: { type: String, required: true },
        hash: { type: String, required: true },
        size: { type: Number, required: true },
        url: { type: String, required: true },
      },
      files: [
        {
          fileName: { type: String, required: true },
          hash: { type: String, required: true },
          size: { type: Number, required: true },
          url: { type: String, required: true },
        }
      ]
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
);

// Indexes
VersionSchema.index({ moduleId: 1, version: -1 });
VersionSchema.index({ moduleName: 1, version: -1 });
VersionSchema.index({ publishedAt: -1 });
VersionSchema.index({ 'federation.shared': 1 });

// Compound unique index
VersionSchema.index({ moduleId: 1, version: 1 }, { unique: true });

export const Version =
  mongoose.models.VersionV2 ||
  mongoose.model<IVersion>('VersionV2', VersionSchema);
