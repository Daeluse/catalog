import { Button } from "@/components/Button";
import type { SubscriptionWithDetails } from "@/types/api";

interface SubscriptionActionProps {
  moduleId: string;
  subscription: SubscriptionWithDetails | undefined;
  subscribingTo: string | null;
  onSubscribe: () => void;
}

export function SubscriptionAction({
  moduleId,
  subscription,
  subscribingTo,
  onSubscribe,
}: SubscriptionActionProps) {
  if (!subscription) {
    return (
      <Button
        onClick={onSubscribe}
        disabled={subscribingTo === moduleId}
        size="sm"
      >
        {subscribingTo === moduleId ? "Requesting..." : "Subscribe"}
      </Button>
    );
  }

  if (subscription.status === "pending") {
    return <p className="text-sm text-zinc-500">Awaiting approval</p>;
  }

  if (subscription.status === "approved") {
    return <p className="text-sm text-green-600">Access granted</p>;
  }

  if (subscription.status === "rejected") {
    return <p className="text-sm text-red-600">Request rejected</p>;
  }

  return <p className="text-sm text-zinc-500">Access revoked</p>;
}
