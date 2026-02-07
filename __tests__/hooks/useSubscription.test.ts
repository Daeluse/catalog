import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSubscription } from "@/hooks/useSubscription";

// Mock useFetch
const mockRefetch = vi.fn();
let mockSubsData: any = null;
let mockSubsLoading = false;

vi.mock("@/hooks/useFetch", () => ({
  useFetch: vi.fn(() => ({
    data: mockSubsData,
    loading: mockSubsLoading,
    refetch: mockRefetch,
  })),
}));

// Mock apiPost
const mockApiPost = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiPost: (...args: any[]) => mockApiPost(...args),
}));

describe("useSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubsData = null;
    mockSubsLoading = false;
    mockRefetch.mockResolvedValue(undefined);
    mockApiPost.mockResolvedValue({});
  });

  it("returns loading state from useFetch", () => {
    mockSubsLoading = true;

    const { result } = renderHook(() =>
      useSubscription({ applicationId: "app-1" }),
    );

    expect(result.current.loading).toBe(true);
  });

  it("returns not loading when data is available", () => {
    mockSubsData = { subscriptions: [], total: 0, limit: 100, skip: 0 };

    const { result } = renderHook(() =>
      useSubscription({ applicationId: "app-1" }),
    );

    expect(result.current.loading).toBe(false);
  });

  it("getSubscription returns undefined when no matching subscription", () => {
    mockSubsData = { subscriptions: [], total: 0, limit: 100, skip: 0 };

    const { result } = renderHook(() =>
      useSubscription({ applicationId: "app-1" }),
    );

    expect(result.current.getSubscription("module-1")).toBeUndefined();
  });

  it("getSubscription finds matching subscription by moduleId and applicationId", () => {
    const mockSub = {
      moduleId: "module-1",
      applicationId: "app-1",
      status: "approved",
      application: { _id: { toString: () => "app-1" } },
    };
    mockSubsData = {
      subscriptions: [mockSub],
      total: 1,
      limit: 100,
      skip: 0,
    };

    const { result } = renderHook(() =>
      useSubscription({ applicationId: "app-1" }),
    );

    expect(result.current.getSubscription("module-1")).toBe(mockSub);
  });

  it("getSubscription does not match different applicationId", () => {
    const mockSub = {
      moduleId: "module-1",
      applicationId: "app-2",
      status: "approved",
      application: { _id: { toString: () => "app-2" } },
    };
    mockSubsData = {
      subscriptions: [mockSub],
      total: 1,
      limit: 100,
      skip: 0,
    };

    const { result } = renderHook(() =>
      useSubscription({ applicationId: "app-1" }),
    );

    expect(result.current.getSubscription("module-1")).toBeUndefined();
  });

  it("subscribe calls apiPost with correct args and refetches", async () => {
    mockSubsData = { subscriptions: [], total: 0, limit: 100, skip: 0 };

    const { result } = renderHook(() =>
      useSubscription({ applicationId: "app-1" }),
    );

    await act(async () => {
      await result.current.subscribe("module-1");
    });

    expect(mockApiPost).toHaveBeenCalledWith("/api/subscriptions", {
      applicationId: "app-1",
      moduleId: "module-1",
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("subscribe sets subscribingTo during request", async () => {
    mockSubsData = { subscriptions: [], total: 0, limit: 100, skip: 0 };
    let resolvePost: () => void;
    mockApiPost.mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePost = resolve;
      }),
    );

    const { result } = renderHook(() =>
      useSubscription({ applicationId: "app-1" }),
    );

    expect(result.current.subscribingTo).toBeNull();

    let subscribePromise: Promise<void>;
    act(() => {
      subscribePromise = result.current.subscribe("module-1");
    });

    expect(result.current.subscribingTo).toBe("module-1");

    await act(async () => {
      resolvePost!();
      await subscribePromise;
    });

    expect(result.current.subscribingTo).toBeNull();
  });

  it("subscribe sets error on failure", async () => {
    mockSubsData = { subscriptions: [], total: 0, limit: 100, skip: 0 };
    mockApiPost.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() =>
      useSubscription({ applicationId: "app-1" }),
    );

    await act(async () => {
      await result.current.subscribe("module-1");
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.subscribingTo).toBeNull();
  });

  it("subscribe handles non-Error thrown values", async () => {
    mockSubsData = { subscriptions: [], total: 0, limit: 100, skip: 0 };
    mockApiPost.mockRejectedValue("string error");

    const { result } = renderHook(() =>
      useSubscription({ applicationId: "app-1" }),
    );

    await act(async () => {
      await result.current.subscribe("module-1");
    });

    expect(result.current.error).toBe("An error occurred");
  });

  it("subscribe clears previous error on new attempt", async () => {
    mockSubsData = { subscriptions: [], total: 0, limit: 100, skip: 0 };
    mockApiPost.mockRejectedValueOnce(new Error("First error"));

    const { result } = renderHook(() =>
      useSubscription({ applicationId: "app-1" }),
    );

    await act(async () => {
      await result.current.subscribe("module-1");
    });

    expect(result.current.error).toBe("First error");

    mockApiPost.mockResolvedValueOnce({});

    await act(async () => {
      await result.current.subscribe("module-1");
    });

    expect(result.current.error).toBe("");
  });
});
