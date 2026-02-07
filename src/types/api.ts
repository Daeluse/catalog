import { SubscriptionStatus } from "@/lib/constants";
import { IApplication, IModule, INotification, ISubscription } from "@/models";

// Shared user/owner types
export interface Owner {
  userId: string;
  email: string;
  name: string;
}

export interface Maintainer extends Owner {
  role: "admin" | "write" | "read";
  addedAt: Date | string;
}

export interface SubscriptionWithDetails extends ISubscription {
  application: IApplication | null;
  module: IModule | null;
}

// API Response types
export interface PaginatedResponse<T> {
  data?: T[];
  modules?: T[];
  versions?: T[];
  applications?: T[];
  subscriptions?: SubscriptionWithDetails[];
  total: number;
  limit: number;
  skip: number;
}

export interface APIError {
  error: string;
  details?: unknown;
}

// Form state types
export interface FormState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Filter/query types
export interface ModuleFilters {
  search?: string;
  category?: string;
  organization?: string;
  sort?: "updated" | "downloads" | "name";
  limit?: number;
  skip?: number;
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus;
  moduleId?: string;
  limit?: number;
  skip?: number;
}

export interface NotificationsResponse {
  notifications: (INotification & { _id: string })[];
  unreadCount: number;
  total: number;
  limit?: number;
  skip?: number;
}
