'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { FormField, Input, TextArea, Select } from '@/components/form'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { apiPost } from '@/lib/api-client'
import { MODULE_CATEGORIES, LICENSES } from '@/lib/constants'

export default function NewModulePage() {
  useRequireAuth()

  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    organization: '',
    category: '',
    repository: '',
    homepage: '',
    license: 'MIT',
    keywords: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await apiPost('/api/modules', {
        ...formData,
        keywords: formData.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      }) as { name: string }
      router.push(`/modules/${data.name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while creating the module')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Create New Module</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Register a new Module Federation module in the catalog
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <ErrorMessage error={error} />

          <Card className="p-6">
            <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-white">
              Basic Information
            </h2>

            <div className="space-y-4">
              <FormField
                label="Module Name"
                description="Use the format: @org/module-name or module-name"
                required
                htmlFor="name"
              >
                <Input
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="@myorg/header"
                />
              </FormField>

              <FormField label="Display Name" required htmlFor="displayName">
                <Input
                  id="displayName"
                  name="displayName"
                  required
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="Header Component"
                />
              </FormField>

              <FormField label="Description" required htmlFor="description">
                <TextArea
                  id="description"
                  name="description"
                  required
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="A reusable header component for Module Federation apps"
                />
              </FormField>

              <FormField label="Organization" required htmlFor="organization">
                <Input
                  id="organization"
                  name="organization"
                  required
                  value={formData.organization}
                  onChange={handleChange}
                  placeholder="My Organization"
                />
              </FormField>

              <FormField label="Category" required htmlFor="category">
                <Select
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  options={MODULE_CATEGORIES}
                  placeholder="Select a category"
                />
              </FormField>

              <FormField
                label="Keywords"
                description="Comma-separated keywords for better discoverability"
                htmlFor="keywords"
              >
                <Input
                  id="keywords"
                  name="keywords"
                  value={formData.keywords}
                  onChange={handleChange}
                  placeholder="react, header, navigation"
                />
              </FormField>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-white">
              Additional Information
            </h2>

            <div className="space-y-4">
              <FormField label="Repository URL" htmlFor="repository">
                <Input
                  type="url"
                  id="repository"
                  name="repository"
                  value={formData.repository}
                  onChange={handleChange}
                  placeholder="https://github.com/myorg/header"
                />
              </FormField>

              <FormField label="Homepage URL" htmlFor="homepage">
                <Input
                  type="url"
                  id="homepage"
                  name="homepage"
                  value={formData.homepage}
                  onChange={handleChange}
                  placeholder="https://myorg.com/header"
                />
              </FormField>

              <FormField label="License" htmlFor="license">
                <Select
                  id="license"
                  name="license"
                  value={formData.license}
                  onChange={handleChange}
                  options={LICENSES}
                />
              </FormField>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button as={Link} href="/dashboard" variant="secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Module'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
