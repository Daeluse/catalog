'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/Button'
import { ErrorMessage } from '@/components/ErrorMessage'
import { FormField, Input, TextArea } from '@/components/form'
import { OriginManager } from '@/components/OriginManager'
import { apiPost } from '@/lib/api-client'

export default function NewApplicationPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [origins, setOrigins] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Client-side validation
    if (!name.trim()) {
      setError('Application name is required')
      return
    }

    if (!description.trim()) {
      setError('Description is required')
      return
    }

    if (!contactEmail.trim()) {
      setError('Contact email is required')
      return
    }

    if (origins.length === 0) {
      setError('At least one origin is required')
      return
    }

    try {
      setLoading(true)

      await apiPost('/api/applications', {
        name: name.trim(),
        description: description.trim(),
        contactEmail: contactEmail.trim(),
        origins,
      })

      router.push('/dashboard/applications')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/applications"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applications
        </Link>
        <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          New Application
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Create a new application to consume Module Federation modules
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <ErrorMessage error={error} />

        <FormField label="Application Name" required htmlFor="name">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Web Application"
            required
          />
        </FormField>

        <FormField label="Description" required htmlFor="description">
          <TextArea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of your application..."
            rows={3}
            required
          />
        </FormField>

        <FormField label="Contact Email" required htmlFor="contactEmail">
          <Input
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </FormField>

        <OriginManager origins={origins} onChange={setOrigins} />

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            as={Link}
            href="/dashboard/applications"
            variant="secondary"
            fullWidth
          >
            Cancel
          </Button>
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Creating...' : 'Create Application'}
          </Button>
        </div>
      </form>
    </div>
  )
}
