"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/form/Input";
import { Select } from "@/components/form/Select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { formatDate } from "@/lib/utils";
import {
  CheckCircle2,
  Copy,
  Key,
  Trash2,
  AlertCircle,
  Book,
} from "lucide-react";
import { apiDelete } from "@/lib/api-client";

interface ApiToken {
  _id: string;
  name: string;
  expiresAt: string;
  lastUsedAt?: string;
  status: "active" | "revoked";
  createdAt: string;
  updatedAt: string;
}

// CodeBlock component moved outside of render
function CodeBlock({
  code,
  id,
  copied,
  onCopy,
}: {
  code: string;
  id: string;
  copied: string | null;
  onCopy: (code: string, id: string) => void;
}) {
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
  );
}

export default function ApiTokensPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"tokens" | "docs">("tokens");

  // Create token form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("90");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Token display
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Revoke token
  const [revokeTokenId, setRevokeTokenId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Fetch tokens
  const fetchTokens = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/api-tokens");
      if (!response.ok) {
        throw new Error("Failed to fetch API tokens");
      }
      const data = await response.json();
      setTokens(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tokens");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const response = await fetch("/api/api-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tokenName,
          expiresInDays: parseInt(expiresInDays),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create token");
      }

      const data = await response.json();
      setNewToken(data.data.token);
      setTokenName("");
      setExpiresInDays("90");
      setShowCreateForm(false);
      await fetchTokens();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create token",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCopyToken = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  const handleRevokeToken = async () => {
    if (!revokeTokenId) return;

    setRevoking(true);
    try {
      await apiDelete(`/api/api-tokens/${revokeTokenId}`);
      await fetchTokens();
      setRevokeTokenId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke token");
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">API Tokens</h1>
        <p className="text-gray-600">
          Generate API tokens for CI/CD pipelines to publish modules
          programmatically
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("tokens")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "tokens"
                ? "border-accent-primary-1 text-accent-primary-1"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Key className="inline-block w-5 h-5 mr-2" />
            Tokens
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "docs"
                ? "border-accent-primary-1 text-accent-primary-1"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Book className="inline-block w-5 h-5 mr-2" />
            Documentation
          </button>
        </nav>
      </div>

      {activeTab === "tokens" ? (
        <>
          {error && (
            <div className="mb-6">
              <ErrorMessage error={error} />
            </div>
          )}

          {/* New Token Display Modal */}
          {newToken && (
            <Card className="mb-6 bg-yellow-50">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800">
                    Save your API token
                  </h3>
                  <p className="text-sm text-yellow-700">
                    This token will only be shown once. Make sure to copy it
                    now.
                  </p>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 bg-white">{newToken}</code>
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
              <h2 className="text-xl font-semibold mb-4">
                Create New API Token
              </h2>
              <form onSubmit={handleCreateToken} className="space-y-4">
                {createError && <ErrorMessage error={createError} />}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Token Name
                  </label>
                  <Input
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g., GitHub Actions Deploy"
                    required
                  />
                  <p className="text-sm text-gray-500">
                    A descriptive name to help you identify this token
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expiration
                  </label>
                  <Select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    options={[
                      { value: "30", label: "30 days" },
                      { value: "60", label: "60 days" },
                      { value: "90", label: "90 days (recommended)" },
                      { value: "365", label: "365 days (1 year)" },
                    ]}
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Tokens automatically expire for security. Create a new one
                    when needed.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button type="submit" disabled={creating}>
                    {creating ? "Creating..." : "Create Token"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateError(null);
                      setTokenName("");
                      setExpiresInDays("90");
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
              <p className="text-gray-500">
                No API tokens yet. Create one to get started.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Last Used
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Expires
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tokens.map((token) => (
                      <tr key={token._id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {token.name}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {token.status === "active" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Revoked
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(new Date(token.createdAt))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {token.lastUsedAt
                            ? formatDate(new Date(token.lastUsedAt))
                            : "Never"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(new Date(token.expiresAt))}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {token.status === "active" && (
                            <button
                              onClick={() => setRevokeTokenId(token._id)}
                              className="text-red-600 hover:text-red-800"
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
  );
}

function ApiDocumentation() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="text-2xl font-bold mb-4">API Documentation</h2>
        <p className="text-gray-600">
          Use these API endpoints to publish modules from your CI/CD pipeline.
        </p>

        <div className="space-y-6">
          {/* Authentication */}
          <section>
            <h3 className="text-xl font-semibold mb-3">Authentication</h3>
            <p className="text-gray-600">
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
            <p className="text-gray-600">
              API tokens are limited to <strong>100 requests per hour</strong>.
              Rate limit information is included in response headers:
            </p>
            <ul className="list-disc list-inside text-gray-600">
              <li>
                <code>X-RateLimit-Limit</code>: Total requests allowed per hour
              </li>
              <li>
                <code>X-RateLimit-Remaining</code>: Requests remaining in
                current window
              </li>
              <li>
                <code>X-RateLimit-Reset</code>: Unix timestamp when the limit
                resets
              </li>
            </ul>
          </section>

          {/* Create Module */}
          <section>
            <h3 className="text-xl font-semibold mb-3">1. Create Module</h3>
            <p className="text-gray-600">
              <code className="bg-gray-100">POST /api/v1/modules</code>
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
    "keywords": ["react", "component"]
  }'`}
              copied={copied}
              onCopy={copyCode}
            />
          </section>

          {/* Upload Assets */}
          <section>
            <h3 className="text-xl font-semibold mb-3">2. Upload Assets</h3>
            <p className="text-gray-600">
              <code className="bg-gray-100">
                POST /api/modules/[name]/versions/assets
              </code>
            </p>
            <CodeBlock
              id="upload-assets"
              code={`curl -X POST https://your-catalog.com/api/v1/modules/my-module/versions \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -F "version=1.0.0" \\
  -F "files=remoteEntry.js" \\
  -F "files=mf-manifest.json" \\
  -F "paths=dist/remoteEntry.js" \\
  -F "paths=dist/mf-manifest.json"`}
              copied={copied}
              onCopy={copyCode}
            />
          </section>

          {/* Publish Version */}
          <section>
            <h3 className="text-xl font-semibold mb-3">3. Publish Version</h3>
            <p className="text-gray-600">
              <code className="bg-gray-100">
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
  -F "assets=RESPONSE_FROM_STEP_2"`}
              copied={copied}
              onCopy={copyCode}
            />
          </section>

          {/* Security Best Practices */}
          <section>
            <h3 className="text-xl font-semibold mb-3">
              Security Best Practices
            </h3>
            <ul className="list-disc list-inside text-gray-600">
              <li>Never commit API tokens to version control</li>
              <li>Store tokens as environment variables or CI/CD secrets</li>
              <li>
                Use the minimum expiration time needed (90 days recommended)
              </li>
              <li>Revoke tokens immediately if compromised</li>
              <li>Create separate tokens for different CI/CD pipelines</li>
              <li>Regularly rotate tokens before they expire</li>
            </ul>
          </section>

          {/* Error Handling */}
          <section>
            <h3 className="text-xl font-semibold mb-3">Error Handling</h3>
            <p className="text-gray-600mb-3">Common HTTP status codes:</p>
            <ul className="list-disc list-inside text-gray-600">
              <li>
                <strong>200 OK</strong>: Request successful
              </li>
              <li>
                <strong>201 Created</strong>: Resource created successfully
              </li>
              <li>
                <strong>400 Bad Request</strong>: Invalid request data
              </li>
              <li>
                <strong>401 Unauthorized</strong>: Invalid or expired token
              </li>
              <li>
                <strong>403 Forbidden</strong>: Insufficient permissions
              </li>
              <li>
                <strong>409 Conflict</strong>: Resource already exists
              </li>
              <li>
                <strong>422 Unprocessable Entity</strong>: Validation errors
              </li>
              <li>
                <strong>429 Too Many Requests</strong>: Rate limit exceeded
              </li>
              <li>
                <strong>500 Internal Server Error</strong>: Server error
              </li>
            </ul>
          </section>
        </div>
      </Card>
    </div>
  );
}
