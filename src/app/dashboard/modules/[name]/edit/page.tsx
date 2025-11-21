'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { FormField, Input, TextArea, Select } from '@/components/form'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useFetch } from '@/hooks/useFetch'
import { apiPatch } from '@/lib/api-client'
import { MODULE_CATEGORIES, LICENSES, MODULE_STATUSES } from '@/lib/constants'
import type { Module } from '@/types/api'

export default function EditModulePage() {
  useRequireAuth()

  const params = useParams()
  const router = useRouter()
  const moduleName = params.name as string

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    displayName: '',
    description: '',
    organization: '',
    category: '',
    repository: '',
    homepage: '',
    license: '',
    keywords: '',
    status: 'active',
  })

  const {
    data: module,
    loading,
    error: fetchError,
  } = useFetch<Module>(`/api/modules/${moduleName}`)

  // Initialize form when module data loads
  useEffect(() => {
    if (module) {
      setFormData({
        displayName: module.displayName || '',
        description: module.description || '',
        organization: module.organization || '',
        category: module.category || '',
        repository: module.repository || '',
        homepage: module.homepage || '',
        license: module.license || '',
        keywords: module.keywords?.join(', ') || '',
        status: module.status || 'active',
      })
    }
  }, [module])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      await apiPatch(`/api/modules/${moduleName}`, {
        ...formData,
        keywords: formData.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      })
      router.push(`/modules/${moduleName}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating the module')
    } finally {
      setSaving(false)
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

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading module..." />
  }

  if (fetchError || !module) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Module Not Found</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">{fetchError || 'Module not found'}</p>
          <Button as={Link} href="/dashboard" variant="secondary" className="mt-4">
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    )
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
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Edit Module</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Update module information for <span className="font-mono">{moduleName}</span>
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
              <FormField label="Display Name" required htmlFor="displayName">
                <Input
                  id="displayName"
                  name="displayName"
                  required
                  value={formData.displayName}
                  onChange={handleChange}
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
                />
              </FormField>

              <FormField label="Organization" required htmlFor="organization">
                <Input
                  id="organization"
                  name="organization"
                  required
                  value={formData.organization}
                  onChange={handleChange}
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
                description="Comma-separated keywords"
                htmlFor="keywords"
              >
                <Input
                  id="keywords"
                  name="keywords"
                  value={formData.keywords}
                  onChange={handleChange}
                />
              </FormField>

              <FormField label="Status" htmlFor="status">
                <Select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={MODULE_STATUSES}
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
                />
              </FormField>

              <FormField label="Homepage URL" htmlFor="homepage">
                <Input
                  type="url"
                  id="homepage"
                  name="homepage"
                  value={formData.homepage}
                  onChange={handleChange}
                />
              </FormField>

              <FormField label="License" htmlFor="license">
                <Select
                  id="license"
                  name="license"
                  value={formData.license}
                  onChange={handleChange}
                  options={LICENSES}
                  placeholder="Select a license"
                />
              </FormField>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button as={Link} href={`/modules/${moduleName}`} variant="ghost">
              Cancel
            </Button>
            <div className="flex gap-4">
              <Button
                as={Link}
                href={`/dashboard/modules/${moduleName}/publish`}
                variant="secondary"
              >
                Publish New Version
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}
