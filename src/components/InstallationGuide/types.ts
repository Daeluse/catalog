export interface Version {
  _id: string
  version: string
  buildTool: 'webpack' | 'rspack' | 'rsbuild' | 'vite'
  buildToolVersion: string
  federation: {
    name: string
    entry: string
    manifestUrl: string
    exposes: Array<{
      id: string
      name: string
      path: string
      assets?: any
    }> | Record<string, {
      import: string
      name: string
    }>
    shared: Record<string, {
      version: string
      requiredVersion?: string
      singleton?: boolean
    }>
  }
  assets: {
    remoteEntry: {
      url: string
    }
  }
}

export type BuildTool = 'webpack' | 'rspack' | 'rsbuild' | 'vite'
