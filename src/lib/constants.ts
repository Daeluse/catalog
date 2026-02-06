/**
 * Application Constants
 * Centralized constants to ensure consistency across the application
 */

export const MODULE_CATEGORIES = [
  { value: "navigation", label: "Navigation" },
  { value: "ui", label: "UI Components" },
  { value: "shared", label: "Shared Libraries" },
  { value: "feature", label: "Features" },
  { value: "utility", label: "Utilities" },
  { value: "other", label: "Other" },
] as const;

export const BUILD_TOOLS = [
  { value: "webpack", label: "Webpack" },
  { value: "rspack", label: "Rspack" },
  { value: "rsbuild", label: "Rsbuild" },
  { value: "vite", label: "Vite" },
] as const;

export const SUBSCRIPTION_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "revoked", label: "Revoked" },
] as const;

export const MODULE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "deprecated", label: "Deprecated" },
  { value: "archived", label: "Archived" },
] as const;

export const APPLICATION_STATUSES = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
] as const;

export const MAINTAINER_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "write", label: "Write" },
  { value: "read", label: "Read" },
] as const;

export const SORT_OPTIONS = [
  { value: "updated", label: "Recently Updated" },
  { value: "downloads", label: "Most Downloads" },
  { value: "name", label: "Name (A-Z)" },
] as const;

// Type helpers
export type ModuleCategory = (typeof MODULE_CATEGORIES)[number]["value"];
export type BuildTool = (typeof BUILD_TOOLS)[number]["value"];
export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUSES)[number]["value"];
export type ModuleStatus = (typeof MODULE_STATUSES)[number]["value"];
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]["value"];
export type MaintainerRole = (typeof MAINTAINER_ROLES)[number]["value"];
export type SortOption = (typeof SORT_OPTIONS)[number]["value"];
