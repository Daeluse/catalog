"use client"

import type { Version, BuildTool } from './types'

interface BuildtimeInstallationProps {
  moduleName: string
  selectedVersion: Version
  buildTool: BuildTool
  onBuildToolChange: (tool: BuildTool) => void
}

export function BuildtimeInstallation({
  moduleName,
  selectedVersion,
  buildTool,
  onBuildToolChange,
}: BuildtimeInstallationProps) {
  const remoteEntryUrl = selectedVersion.assets.remoteEntry.url
  const exposes = selectedVersion.federation.exposes

  // Handle both array and object formats for exposes
  const exposedModules = Array.isArray(exposes)
    ? exposes.map(exp => ({ path: exp.path, name: exp.name }))
    : Object.keys(exposes).map(key => ({ path: key, name: exposes[key].name }))

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
          Configure remotes at build time using your bundler's Module Federation plugin. Choose your build tool:
        </p>
      </div>

      {/* Build Tool Tabs */}
      <div className="flex gap-2 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        {(['webpack', 'rspack', 'rsbuild', 'vite'] as BuildTool[]).map((tool) => (
          <button
            key={tool}
            onClick={() => onBuildToolChange(tool)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              buildTool === tool
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            } ${
              tool === selectedVersion.buildTool
                ? 'ring-2 ring-zinc-400 dark:ring-zinc-500'
                : ''
            }`}
            title={tool === selectedVersion.buildTool ? 'Module was built with this tool' : ''}
          >
            {tool.charAt(0).toUpperCase() + tool.slice(1)}
            {tool === selectedVersion.buildTool && (
              <span className="ml-1 text-xs">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Webpack Configuration */}
      {buildTool === 'webpack' && (
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
              1. Install Plugin
            </h3>
            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
                <code>npm install @module-federation/enhanced</code>
              </pre>
              <button
                onClick={() => copyToClipboard('npm install @module-federation/enhanced')}
                className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
              2. Configure webpack.config.js
            </h3>
            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
                <code>{`const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'myApp',
      remotes: {
        '${moduleName}': '${moduleName}@${remoteEntryUrl}'
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true }
      }
    })
  ]
};`}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(`const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'myApp',
      remotes: {
        '${moduleName}': '${moduleName}@${remoteEntryUrl}'
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true }
      }
    })
  ]
};`)}
                className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
              >
                Copy
              </button>
            </div>
          </div>

          {exposedModules.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
                3. Import Exposed Modules
              </h3>
              <div className="space-y-3">
                {exposedModules.map((exposed) => (
                  <div key={exposed.path}>
                    <p className="mb-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {exposed.path}
                    </p>
                    <div className="relative">
                      <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
                        <code>{`import ${exposed.name || 'Component'} from '${moduleName}${exposed.path}';`}</code>
                      </pre>
                      <button
                        onClick={() => copyToClipboard(`import ${exposed.name || 'Component'} from '${moduleName}${exposed.path}';`)}
                        className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rspack Configuration */}
      {buildTool === 'rspack' && (
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
              1. Install Plugin
            </h3>
            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
                <code>npm install @module-federation/enhanced</code>
              </pre>
              <button
                onClick={() => copyToClipboard('npm install @module-federation/enhanced')}
                className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
              2. Configure rspack.config.js
            </h3>
            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
                <code>{`const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'myApp',
      remotes: {
        '${moduleName}': '${moduleName}@${remoteEntryUrl}'
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true }
      }
    })
  ]
};`}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(`const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'myApp',
      remotes: {
        '${moduleName}': '${moduleName}@${remoteEntryUrl}'
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true }
      }
    })
  ]
};`)}
                className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
              >
                Copy
              </button>
            </div>
          </div>

          {exposedModules.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
                3. Import Exposed Modules
              </h3>
              <div className="space-y-3">
                {exposedModules.map((exposed) => (
                  <div key={exposed.path}>
                    <p className="mb-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {exposed.path}
                    </p>
                    <div className="relative">
                      <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
                        <code>{`import ${exposed.name || 'Component'} from '${moduleName}${exposed.path}';`}</code>
                      </pre>
                      <button
                        onClick={() => copyToClipboard(`import ${exposed.name || 'Component'} from '${moduleName}${exposed.path}';`)}
                        className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rsbuild Configuration */}
      {buildTool === 'rsbuild' && (
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
              1. Install Plugin
            </h3>
            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
                <code>npm install @module-federation/rsbuild-plugin</code>
              </pre>
              <button
                onClick={() => copyToClipboard('npm install @module-federation/rsbuild-plugin')}
                className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
              2. Configure rsbuild.config.ts
            </h3>
            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
                <code>{`import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

export default {
  plugins: [
    pluginModuleFederation({
      name: 'myApp',
      remotes: {
        '${moduleName}': '${moduleName}@${remoteEntryUrl}'
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true }
      }
    })
  ]
};`}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(`import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

export default {
  plugins: [
    pluginModuleFederation({
      name: 'myApp',
      remotes: {
        '${moduleName}': '${moduleName}@${remoteEntryUrl}'
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true }
      }
    })
  ]
};`)}
                className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
              >
                Copy
              </button>
            </div>
          </div>

          {exposedModules.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
                3. Import Exposed Modules
              </h3>
              <div className="space-y-3">
                {exposedModules.map((exposed) => (
                  <div key={exposed.path}>
                    <p className="mb-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {exposed.path}
                    </p>
                    <div className="relative">
                      <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
                        <code>{`import ${exposed.name || 'Component'} from '${moduleName}${exposed.path}';`}</code>
                      </pre>
                      <button
                        onClick={() => copyToClipboard(`import ${exposed.name || 'Component'} from '${moduleName}${exposed.path}';`)}
                        className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vite Configuration */}
      {buildTool === 'vite' && (
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
              1. Install Plugin
            </h3>
            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
                <code>npm install @module-federation/vite</code>
              </pre>
              <button
                onClick={() => copyToClipboard('npm install @module-federation/vite')}
                className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
              2. Configure vite.config.ts
            </h3>
            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
                <code>{`import { federation } from '@module-federation/vite';

export default {
  plugins: [
    federation({
      name: 'myApp',
      remotes: {
        '${moduleName}': '${moduleName}@${remoteEntryUrl}'
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true }
      }
    })
  ]
};`}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(`import { federation } from '@module-federation/vite';

export default {
  plugins: [
    federation({
      name: 'myApp',
      remotes: {
        '${moduleName}': '${moduleName}@${remoteEntryUrl}'
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true }
      }
    })
  ]
};`)}
                className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
              >
                Copy
              </button>
            </div>
          </div>

          {exposedModules.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
                3. Import Exposed Modules
              </h3>
              <div className="space-y-3">
                {exposedModules.map((exposed) => (
                  <div key={exposed.path}>
                    <p className="mb-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {exposed.path}
                    </p>
                    <div className="relative">
                      <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
                        <code>{`import ${exposed.name || 'Component'} from '${moduleName}${exposed.path}';`}</code>
                      </pre>
                      <button
                        onClick={() => copyToClipboard(`import ${exposed.name || 'Component'} from '${moduleName}${exposed.path}';`)}
                        className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
