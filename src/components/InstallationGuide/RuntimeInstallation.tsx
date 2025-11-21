"use client"

import type { Version } from './types'

interface RuntimeInstallationProps {
  moduleName: string
  selectedVersion: Version
  showAdvanced: boolean
  onToggleAdvanced: () => void
}

export function RuntimeInstallation({
  moduleName,
  selectedVersion,
  showAdvanced,
  onToggleAdvanced,
}: RuntimeInstallationProps) {
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
          Use Module Federation runtime to dynamically load remotes at runtime. This approach doesn't require configuring remotes during build.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
          1. Install Module Federation Runtime
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
          2. Initialize Runtime and Load Remote
        </h3>
        <div className="relative">
          <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
            <code>{`import { init, loadRemote } from '@module-federation/enhanced/runtime';

// Initialize the runtime
init({
  name: 'myApp',
  remotes: []
});

// Load the remote module
const remoteModule = await loadRemote('${moduleName}', {
  entry: '${remoteEntryUrl}'
});`}</code>
          </pre>
          <button
            onClick={() => copyToClipboard(`import { init, loadRemote } from '@module-federation/enhanced/runtime';

// Initialize the runtime
init({
  name: 'myApp',
  remotes: []
});

// Load the remote module
const remoteModule = await loadRemote('${moduleName}', {
  entry: '${remoteEntryUrl}'
});`)}
            className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
          >
            Copy
          </button>
        </div>
      </div>

      {exposedModules.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
            3. Use Exposed Modules
          </h3>
          <div className="space-y-3">
            {exposedModules.map((exposed) => (
              <div key={exposed.path}>
                <p className="mb-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {exposed.path}
                </p>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
                    <code>{`// Dynamic import
const { ${exposed.name || 'Component'} } = await remoteModule.get('${exposed.path}');

// Usage in React
function MyComponent() {
  const [RemoteComponent, setRemoteComponent] = useState(null);

  useEffect(() => {
    loadRemote('${moduleName}', {
      entry: '${remoteEntryUrl}'
    }).then(async (module) => {
      const { ${exposed.name || 'Component'} } = await module.get('${exposed.path}');
      setRemoteComponent(() => ${exposed.name || 'Component'});
    });
  }, []);

  return RemoteComponent ? <RemoteComponent /> : <div>Loading...</div>;
}`}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`// Dynamic import
const { ${exposed.name || 'Component'} } = await remoteModule.get('${exposed.path}');

// Usage in React
function MyComponent() {
  const [RemoteComponent, setRemoteComponent] = useState(null);

  useEffect(() => {
    loadRemote('${moduleName}', {
      entry: '${remoteEntryUrl}'
    }).then(async (module) => {
      const { ${exposed.name || 'Component'} } = await module.get('${exposed.path}');
      setRemoteComponent(() => ${exposed.name || 'Component'});
    });
  }, []);

  return RemoteComponent ? <RemoteComponent /> : <div>Loading...</div>;
}`)}
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

      {/* Advanced Section */}
      <div>
        <button
          onClick={onToggleAdvanced}
          className="flex items-center gap-2 text-sm font-medium text-zinc-900 hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300"
        >
          <span>{showAdvanced ? '▼' : '▶'}</span>
          Advanced: Version Tag Resolution
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Instead of hardcoding version URLs, you can use the catalog's version resolution API to dynamically resolve version tags:
            </p>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
                Supported Tags:
              </h4>
              <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                <li><code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">latest</code> - Most recent stable version</li>
                <li><code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">next</code> - Most recent version (including prereleases)</li>
                <li><code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">^1.0.0</code> - Caret ranges (compatible with 1.x.x)</li>
                <li><code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">~2.1.0</code> - Tilde ranges (patch-level changes)</li>
                <li><code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">1.2.3</code> - Specific version</li>
              </ul>
            </div>

            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-white dark:bg-zinc-950">
                <code>{`// Resolve version tag to remoteEntry URL
const response = await fetch('/api/modules/${moduleName}/resolve/latest');
const { remoteEntry, resolvedVersion } = await response.json();

console.log(\`Loaded version: \${resolvedVersion}\`);

// Use the resolved URL with Module Federation
const remoteModule = await loadRemote('${moduleName}', {
  entry: remoteEntry
});`}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(`// Resolve version tag to remoteEntry URL
const response = await fetch('/api/modules/${moduleName}/resolve/latest');
const { remoteEntry, resolvedVersion } = await response.json();

console.log(\`Loaded version: \${resolvedVersion}\`);

// Use the resolved URL with Module Federation
const remoteModule = await loadRemote('${moduleName}', {
  entry: remoteEntry
});`)}
                className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
