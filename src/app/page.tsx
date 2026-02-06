"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Search, Package } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { Select } from "@/components/form";
import { useFetch } from "@/hooks/useFetch";
import { buildQueryString } from "@/lib/api-client";
import { MODULE_CATEGORIES, SORT_OPTIONS } from "@/lib/constants";
import type { PaginatedResponse } from "@/types/api";
import { IModule } from "@/models";

export default function Home() {
  const { data: session, status } = useSession();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("updated");

  const apiUrl = useMemo(() => {
    const params: Record<string, string> = {};
    if (searchQuery) params.search = searchQuery;
    if (categoryFilter) params.category = categoryFilter;
    if (sortBy) params.sort = sortBy;
    return `/api/modules${buildQueryString(params)}`;
  }, [searchQuery, categoryFilter, sortBy]);

  const { data, loading, error } = useFetch<PaginatedResponse<IModule>>(apiUrl);
  const modules = data?.modules || [];

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Module Federation Catalog
          </h1>
          <p className="mt-4 text-lg text-zinc-600">
            Discover and share Module Federation 2.0 modules
          </p>
          <div className="mt-8 flex justify-center gap-4">
            {status === "loading" ? (
              <LoadingSpinner message="" />
            ) : session ? (
              <>
                <Button as={Link} href="/dashboard" size="lg">
                  Publish a Module
                </Button>
                <span className="flex items-center rounded-md border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-600">
                  Signed in as {session.user?.name || session.user?.email}
                </span>
              </>
            ) : (
              <>
                <Button as={Link} href="/auth/signin" size="lg">
                  Sign In
                </Button>
                <Button
                  as={Link}
                  href="/auth/signin"
                  variant="secondary"
                  size="lg"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* Search Input */}
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">
                Search modules
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  id="search"
                  type="text"
                  placeholder="Search modules by name, description, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-md border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 "
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="sm:w-48">
              <label htmlFor="category" className="sr-only">
                Filter by category
              </label>
              <Select
                id="category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={MODULE_CATEGORIES}
                placeholder="All Categories"
              />
            </div>

            {/* Sort By */}
            <div className="sm:w-48">
              <label htmlFor="sort" className="sr-only">
                Sort by
              </label>
              <Select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={SORT_OPTIONS}
              />
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || categoryFilter) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-600">Active filters:</span>
              {searchQuery && (
                <Badge>
                  Search: &quot;{searchQuery}&quot;
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-1 text-zinc-500 hover:text-zinc-700"
                  >
                    ✕
                  </button>
                </Badge>
              )}
              {categoryFilter && (
                <Badge>
                  Category: {categoryFilter}
                  <button
                    onClick={() => setCategoryFilter("")}
                    className="ml-1 text-zinc-500 hover:text-zinc-700"
                  >
                    ✕
                  </button>
                </Badge>
              )}
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("");
                }}
                className="text-xs text-zinc-600 hover:text-zinc-900"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Module List */}
        <div className="mt-8">
          <h2 className="mb-6 text-2xl font-bold text-zinc-900">
            {searchQuery || categoryFilter
              ? "Search Results"
              : "Available Modules"}
          </h2>

          {loading ? (
            <LoadingSpinner message="Loading modules..." />
          ) : error ? (
            <ErrorMessage error={error} />
          ) : modules.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No modules found"
              description={
                searchQuery || categoryFilter
                  ? "No modules match your search criteria"
                  : "No modules published yet. Be the first to publish a module!"
              }
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => (
                <Card
                  key={module._id.toString()}
                  as={Link}
                  href={`/modules/${module.name.replaceAll("/", "%2F")}`}
                  className="group p-6 transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-zinc-600">
                        {module.displayName}
                      </h3>
                      <p className="text-sm text-zinc-500">{module.name}</p>
                    </div>
                    {module.latestVersion && (
                      <Badge>v{module.latestVersion}</Badge>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-zinc-600">
                    {module.description}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                    <span className="capitalize">{module.category}</span>
                    <span>•</span>
                    <span>
                      {module.totalDownloads.toLocaleString()} downloads
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
