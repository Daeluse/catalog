import { Check, Clock, X, Ban } from "lucide-react";

interface SubscriptionStatusBadgeProps {
  status: "pending" | "approved" | "rejected" | "revoked";
  className?: string;
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800",
  },
  approved: {
    label: "Approved",
    icon: Check,
    className: "bg-green-100 text-green-800",
  },
  rejected: {
    label: "Rejected",
    icon: X,
    className: "bg-red-100 text-red-800",
  },
  revoked: {
    label: "Revoked",
    icon: Ban,
    className: "bg-zinc-100 text-zinc-800",
  },
};

export function SubscriptionStatusBadge({
  status,
  className = "",
}: SubscriptionStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
