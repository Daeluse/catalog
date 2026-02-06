"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { FormField, Input, TextArea } from "@/components/form";
import { OriginManager } from "@/components/OriginManager";
import { useFetch } from "@/hooks/useFetch";
import { apiPatch } from "@/lib/api-client";
import { IApplication } from "@/models";

export default function EditApplicationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const {
    data: application,
    loading,
    error: fetchError,
  } = useFetch<IApplication>(`/api/applications/${id}`);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [origins, setOrigins] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Initialize form when data loads
  useEffect(() => {
    if (application) {
      setName(application.name);
      setDescription(application.description);
      setContactEmail(application.contactEmail);
      setOrigins(application.origins);
    }
  }, [application]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !name.trim() ||
      !description.trim() ||
      !contactEmail.trim() ||
      origins.length === 0
    ) {
      setError("All fields are required");
      return;
    }

    try {
      setSaving(true);

      await apiPatch(`/api/applications/${id}`, {
        name: name.trim(),
        description: description.trim(),
        contactEmail: contactEmail.trim(),
        origins,
      });

      router.push("/dashboard/applications");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading application..." />;
  }

  if (fetchError || !application) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <ErrorMessage error={fetchError || "Application not found"} />
        <Link
          href="/dashboard/applications"
          className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900"
        >
          Back to Applications
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <Link
          href="/dashboard/applications"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applications
        </Link>
        <h1 className="mb-2 text-3xl font-bold text-zinc-900">
          Edit Application
        </h1>
        <p className="text-zinc-600">
          Update your application settings and allowed origins
        </p>
      </div>

      {/* Subscribe to modules link */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Package className="mt-0.5 h-5 w-5 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Ready to consume modules?
            </p>
            <p className="mt-1 text-sm text-blue-700">
              Subscribe this application to Module Federation modules
            </p>
          </div>
          <Button
            as={Link}
            href={`/dashboard/applications/${id}/subscribe`}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            Subscribe
          </Button>
        </div>
      </div>

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

        <div className="flex gap-3 pt-4">
          <Button
            as={Link}
            href="/dashboard/applications"
            variant="secondary"
            fullWidth
          >
            Cancel
          </Button>
          <Button type="submit" fullWidth disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
