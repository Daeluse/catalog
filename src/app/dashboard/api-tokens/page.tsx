'use client'

import { useState, useEffect } from 'react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/form/Input'
import { Select } from '@/components/form/Select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { formatDate } from '@/lib/utils'
import { CheckCircle2, Copy, Key, Trash2, AlertCircle, Book } from 'lucide-react'

interface ApiToken {
  _id: string
  name: string
  expiresAt: string
  lastUsedAt?: string
  status: 'active' | 'revoked'
  createdAt: string
  updatedAt: string
}

// CodeBlock component moved outside of render
function CodeBlock({ code, id, copied, onCopy }: { code: string; id: string; copied: string | null; onCopy: (code: string, id: string) => void }) {
  return (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => onCopy(code, id)}
        className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
      >
        {copied === id ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}

export default function ApiTokensPage() {
  const { session, isLoading: authLoading } = useRequireAuth()
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'tokens' | 'docs'>('tokens')

  // Create token form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [tokenName, setTokenName] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('90')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Token display
  const [newToken, setNewToken] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)

  // Revoke token
  const [revokeTokenId, setRevokeTokenId] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)

  // Fetch tokens
  const fetchTokens = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/api-tokens')
      if (!response.ok) {
        throw new Error('Failed to fetch API tokens')
      }
      const data = await response.json()
      setTokens(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tokens')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchTokens()
    }
  }, [session])

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)

    try {
      const response = await fetch('/api/api-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tokenName,
          expiresInDays: parseInt(expiresInDays),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create token')
      }

      const data = await response.json()
      setNewToken(data.data.token)
      setTokenName('')
      setExpiresInDays('90')
      setShowCreateForm(false)
      await fetchTokens()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create token')
    } finally {
      setCreating(false)
    }
  }

  const handleCopyToken = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken)
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2000)
    }
  }

  const handleRevokeToken = async () => {
    if (!revokeTokenId) return

    setRevoking(true)
    try {
      const response = await fetch(`/api/api-tokens/${revokeTokenId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to revoke token')
      }

      await fetchTokens()
      setRevokeTokenId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke token')
    } finally {
      setRevoking(false)
    }
  }

  if (authLoading || loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner />
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            API Tokens
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Generate API tokens for CI/CD pipelines to publish modules programmatically
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('tokens')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tokens'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Key className="inline-block w-5 h-5 mr-2" />
              Tokens
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'docs'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Book className="inline-block w-5 h-5 mr-2" />
              Documentation
            </button>
          </nav>
        </div>

        {activeTab === 'tokens' ? (
          <>
            {error && (
              <div className="mb-6">
                <ErrorMessage error={error} />
              </div>
            )}

            {/* New Token Display Modal */}
            {newToken && (
              <Card className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                      Save your API token
                    </h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                      This token will only be shown once. Make sure to copy it now.
                    </p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-white dark:bg-gray-800 px-4 py-2 rounded font-mono text-sm border border-yellow-300 dark:border-yellow-700 break-all">
                        {newToken}
                      </code>
                      <Button
                        onClick={handleCopyToken}
                        variant="secondary"
                        size="sm"
                      >
                        {tokenCopied ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setNewToken(null)}
                        variant="secondary"
                        size="sm"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Create Token Button/Form */}
            {!showCreateForm ? (
              <div className="mb-6">
                <Button onClick={() => setShowCreateForm(true)}>
                  <Key className="w-4 h-4 mr-2" />
                  Create New Token
                </Button>
              </div>
            ) : (
              <Card className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Create New API Token</h2>
                <form onSubmit={handleCreateToken} className="space-y-4">
                  {createError && <ErrorMessage error={createError} />}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Token Name
                    </label>
                    <Input
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                      placeholder="e.g., GitHub Actions Deploy"
                      required
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      A descriptive name to help you identify this token
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Expiration
                    </label>
                    <Select
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(e.target.value)}
                      options={[
                        { value: '30', label: '30 days' },
                        { value: '60', label: '60 days' },
                        { value: '90', label: '90 days (recommended)' },
                        { value: '365', label: '365 days (1 year)' },
                      ]}
                      required
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Tokens automatically expire for security. Create a new one when needed.
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <Button type="submit" disabled={creating}>
                      {creating ? 'Creating...' : 'Create Token'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowCreateForm(false)
                        setCreateError(null)
                        setTokenName('')
                        setExpiresInDays('90')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Tokens List */}
            <Card>
              <h2 className="text-xl font-semibold mb-4">Your API Tokens</h2>
              {tokens.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No API tokens yet. Create one to get started.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Created
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Last Used
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Expires
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {tokens.map((token) => (
                        <tr key={token._id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {token.name}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {token.status === 'active' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                Revoked
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(new Date(token.createdAt))}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {token.lastUsedAt
                              ? formatDate(new Date(token.lastUsedAt))
                              : 'Never'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(new Date(token.expiresAt))}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {token.status === 'active' && (
                              <button
                                onClick={() => setRevokeTokenId(token._id)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Revoke Confirmation Dialog */}
            <ConfirmDialog
              isOpen={revokeTokenId !== null}
              onClose={() => setRevokeTokenId(null)}
              onConfirm={handleRevokeToken}
              title="Revoke API Token"
              description="Are you sure you want to revoke this token? This action cannot be undone and any scripts using this token will stop working."
              confirmText="Revoke Token"
              confirmVariant="danger"
              loading={revoking}
            />
          </>
        ) : (
          <ApiDocumentation />
        )}
      </main>
  )
}

function ApiDocumentation() {
  const [copied, setCopied] = useState<string | null>(null)

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="text-2xl font-bold mb-4">API Documentation</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Use these API endpoints to publish modules from your CI/CD pipeline.
        </p>

        <div className="space-y-6">
          {/* Authentication */}
          <section>
            <h3 className="text-xl font-semibold mb-3">Authentication</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              Include your API token in the Authorization header:
            </p>
            <CodeBlock
              id="auth"
              code={`Authorization: Bearer YOUR_API_TOKEN`}
              copied={copied}
              onCopy={copyCode}
            />
          </section>

          {/* Rate Limits */}
          <section>
            <h3 className="text-xl font-semibold mb-3">Rate Limits</h3>
            <p className="text-gray-600 dark:text-gray-400">
              API tokens are limited to <strong>100 requests per hour</strong>. Rate limit information is included in response headers:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 mt-2 space-y-1">
              <li><code>X-RateLimit-Limit</code>: Total requests allowed per hour</li>
              <li><code>X-RateLimit-Remaining</code>: Requests remaining in current window</li>
              <li><code>X-RateLimit-Reset</code>: Unix timestamp when the limit resets</li>
            </ul>
          </section>

          {/* Create Module */}
          <section>
            <h3 className="text-xl font-semibold mb-3">1. Create Module</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                POST /api/v1/modules
              </code>
            </p>
            <CodeBlock
              id="create-module"
              code={`curl -X POST https://your-catalog.com/api/v1/modules \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "@myorg/my-module",
    "displayName": "My Module",
    "description": "Module description",
    "organization": "myorg",
    "category": "ui",
    "repository": "https://github.com/myorg/my-module",
    "license": "MIT",
    "keywords": ["react", "component"]
  }'`}
              copied={copied}
              onCopy={copyCode}
            />
          </section>

          {/* Publish Version */}
          <section>
            <h3 className="text-xl font-semibold mb-3">2. Publish Version</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                POST /api/v1/modules/[name]/versions
              </code>
            </p>
            <CodeBlock
              id="publish-version"
              code={`curl -X POST https://your-catalog.com/api/v1/modules/@myorg/my-module/versions \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -F "version=1.0.0" \\
  -F "buildTool=webpack" \\
  -F "buildToolVersion=5.89.0" \\
  -F "changelog=Initial release" \\
  -F "isPrerelease=false" \\
  -F "remoteEntry=@dist/remoteEntry.js" \\
  -F "manifest=@dist/mf-manifest.json" \\
  -F "stats=@dist/mf-stats.json" \\
  -F "types=@dist/types.d.ts"`}
              copied={copied}
              onCopy={copyCode}
            />
          </section>

          {/* Node.js Example */}
          <section>
            <h3 className="text-xl font-semibold mb-3">Node.js Example</h3>
            <CodeBlock
              id="nodejs"
              code={`const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function publishVersion() {
  const form = new FormData();
  form.append('version', '1.0.0');
  form.append('buildTool', 'webpack');
  form.append('buildToolVersion', '5.89.0');
  form.append('changelog', 'Bug fixes and improvements');
  form.append('isPrerelease', 'false');
  form.append('remoteEntry', fs.createReadStream('./dist/remoteEntry.js'));
  form.append('manifest', fs.createReadStream('./dist/mf-manifest.json'));

  const response = await fetch(
    'https://your-catalog.com/api/v1/modules/@myorg/my-module/versions',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_API_TOKEN',
      },
      body: form,
    }
  );

  const data = await response.json();
  console.log('Published:', data);
}

publishVersion();`}
              copied={copied}
              onCopy={copyCode}
            />
          </section>

          {/* GitHub Actions Example */}
          <section>
            <h3 className="text-xl font-semibold mb-3">GitHub Actions Example</h3>
            <CodeBlock
              id="github-actions"
              code={`name: Publish to Catalog

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Extract version
        id: version
        run: echo "VERSION=\${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Publish to catalog
        run: |
          curl -X POST https://your-catalog.com/api/v1/modules/@myorg/my-module/versions \\
            -H "Authorization: Bearer \${{ secrets.CATALOG_API_TOKEN }}" \\
            -F "version=\${{ steps.version.outputs.VERSION }}" \\
            -F "buildTool=webpack" \\
            -F "buildToolVersion=5.89.0" \\
            -F "changelog=Release \${{ steps.version.outputs.VERSION }}" \\
            -F "isPrerelease=false" \\
            -F "remoteEntry=@dist/remoteEntry.js" \\
            -F "manifest=@dist/mf-manifest.json" \\
            -F "stats=@dist/mf-stats.json"`}
              copied={copied}
              onCopy={copyCode}
            />
          </section>

          {/* Security Best Practices */}
          <section>
            <h3 className="text-xl font-semibold mb-3">Security Best Practices</h3>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
              <li>Never commit API tokens to version control</li>
              <li>Store tokens as environment variables or CI/CD secrets</li>
              <li>Use the minimum expiration time needed (90 days recommended)</li>
              <li>Revoke tokens immediately if compromised</li>
              <li>Create separate tokens for different CI/CD pipelines</li>
              <li>Regularly rotate tokens before they expire</li>
            </ul>
          </section>

          {/* Error Handling */}
          <section>
            <h3 className="text-xl font-semibold mb-3">Error Handling</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              Common HTTP status codes:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
              <li><strong>200 OK</strong>: Request successful</li>
              <li><strong>201 Created</strong>: Resource created successfully</li>
              <li><strong>400 Bad Request</strong>: Invalid request data</li>
              <li><strong>401 Unauthorized</strong>: Invalid or expired token</li>
              <li><strong>403 Forbidden</strong>: Insufficient permissions</li>
              <li><strong>409 Conflict</strong>: Resource already exists</li>
              <li><strong>422 Unprocessable Entity</strong>: Validation errors</li>
              <li><strong>429 Too Many Requests</strong>: Rate limit exceeded</li>
              <li><strong>500 Internal Server Error</strong>: Server error</li>
            </ul>
          </section>
        </div>
      </Card>
    </div>
  )
}
