import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubscriptionAction } from "@/components/SubscriptionAction";
import type { SubscriptionWithDetails } from "@/types/api";

function makeSub(
  status: "pending" | "approved" | "rejected" | "revoked",
): SubscriptionWithDetails {
  return {
    status,
    moduleId: "mod-1",
    applicationId: "app-1",
    moduleName: "test-module",
    application: null,
    module: null,
  } as unknown as SubscriptionWithDetails;
}

describe("SubscriptionAction", () => {
  it("renders Subscribe button when no subscription exists", () => {
    const onSubscribe = vi.fn();
    render(
      <SubscriptionAction
        moduleId="mod-1"
        subscription={undefined}
        subscribingTo={null}
        onSubscribe={onSubscribe}
      />,
    );

    const button = screen.getByRole("button", { name: "Subscribe" });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("calls onSubscribe when Subscribe button is clicked", () => {
    const onSubscribe = vi.fn();
    render(
      <SubscriptionAction
        moduleId="mod-1"
        subscription={undefined}
        subscribingTo={null}
        onSubscribe={onSubscribe}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(onSubscribe).toHaveBeenCalledOnce();
  });

  it("shows Requesting... and disables button when subscribingTo matches", () => {
    const onSubscribe = vi.fn();
    render(
      <SubscriptionAction
        moduleId="mod-1"
        subscription={undefined}
        subscribingTo="mod-1"
        onSubscribe={onSubscribe}
      />,
    );

    const button = screen.getByRole("button", { name: "Requesting..." });
    expect(button).toBeDisabled();
  });

  it("shows Subscribe button when subscribingTo is a different module", () => {
    const onSubscribe = vi.fn();
    render(
      <SubscriptionAction
        moduleId="mod-1"
        subscription={undefined}
        subscribingTo="mod-2"
        onSubscribe={onSubscribe}
      />,
    );

    const button = screen.getByRole("button", { name: "Subscribe" });
    expect(button).not.toBeDisabled();
  });

  it("renders 'Awaiting approval' for pending status", () => {
    render(
      <SubscriptionAction
        moduleId="mod-1"
        subscription={makeSub("pending")}
        subscribingTo={null}
        onSubscribe={vi.fn()}
      />,
    );

    expect(screen.getByText("Awaiting approval")).toBeInTheDocument();
  });

  it("renders 'Access granted' for approved status", () => {
    render(
      <SubscriptionAction
        moduleId="mod-1"
        subscription={makeSub("approved")}
        subscribingTo={null}
        onSubscribe={vi.fn()}
      />,
    );

    expect(screen.getByText("Access granted")).toBeInTheDocument();
  });

  it("renders 'Request rejected' for rejected status", () => {
    render(
      <SubscriptionAction
        moduleId="mod-1"
        subscription={makeSub("rejected")}
        subscribingTo={null}
        onSubscribe={vi.fn()}
      />,
    );

    expect(screen.getByText("Request rejected")).toBeInTheDocument();
  });

  it("renders 'Access revoked' for revoked status", () => {
    render(
      <SubscriptionAction
        moduleId="mod-1"
        subscription={makeSub("revoked")}
        subscribingTo={null}
        onSubscribe={vi.fn()}
      />,
    );

    expect(screen.getByText("Access revoked")).toBeInTheDocument();
  });

  it("does not render a button when subscription exists", () => {
    render(
      <SubscriptionAction
        moduleId="mod-1"
        subscription={makeSub("approved")}
        subscribingTo={null}
        onSubscribe={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
