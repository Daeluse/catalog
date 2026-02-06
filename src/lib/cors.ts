import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getMockDatabase } from "@/lib/db-mock";
import { env } from "@/lib/env";

import { Application, Subscription } from "@/models";

/**
 * Check if an origin is approved to access a module's assets
 * Returns the matched origin if approved, null otherwise
 */
export async function checkOriginApproval(
  origin: string | null,
  moduleName: string,
): Promise<string | null> {
  if (!origin) return null;

  if (!env.enforceCors) {
    return origin;
  }

  try {
    if (env.useMocks) {
      const db = getMockDatabase();
      const subscriptionsCollection = db.collection("subscriptions");
      const applicationsCollection = db.collection("applications");

      // Find approved subscriptions for this module
      const subscriptions = await subscriptionsCollection.find({
        moduleName,
        status: "approved",
      });

      if (!subscriptions || subscriptions.length === 0) {
        return null;
      }

      // Check each subscription's application origins
      for (const subscription of subscriptions) {
        const application = await applicationsCollection.findOne({
          _id: subscription.applicationId,
          status: "active",
        });

        if (application && Array.isArray(application.origins)) {
          // Check if origin matches any of the application's origins
          if (application.origins.includes(origin)) {
            return origin;
          }
        }
      }

      return null;
    }

    // Production mode with MongoDB
    await connectDB();

    // Find approved subscriptions for this module
    const subscriptions = await Subscription.find({
      moduleName,
      status: "approved",
    }).lean();

    if (!subscriptions || subscriptions.length === 0) {
      return null;
    }

    // Get application IDs
    const applicationIds = subscriptions.map((s) => s.applicationId);

    // Find active applications with matching origins
    const applications = await Application.find({
      _id: { $in: applicationIds },
      status: "active",
      origins: origin,
    }).lean();

    // If we found any matching applications, return the origin
    if (applications.length > 0) {
      return origin;
    }

    return null;
  } catch (error) {
    console.error("Error checking origin approval:", error);
    return null;
  }
}

/**
 * Set CORS headers on a response
 */
export function setCorsHeaders(
  response: NextResponse,
  origin: string,
): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours
  return response;
}

/**
 * Create a CORS-enabled response for approved origins
 * Returns null if origin is not approved
 */
export async function createCorsResponse(
  origin: string | null,
  moduleName: string,
  data?: unknown,
  status: number = 200,
): Promise<NextResponse | null> {
  const approvedOrigin = await checkOriginApproval(origin, moduleName);

  if (!approvedOrigin) {
    return null;
  }

  const response = data
    ? NextResponse.json(data, { status })
    : new NextResponse(null, { status });

  return setCorsHeaders(response, approvedOrigin);
}

/**
 * Validate origin URL format
 */
export function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    // Must be http or https
    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }
    // Must have a hostname
    if (!url.hostname) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate an array of origins
 * Returns an object with valid origins and error messages for invalid ones
 */
export function validateOrigins(origins: string[]): {
  valid: string[];
  invalid: { origin: string; reason: string }[];
} {
  const valid: string[] = [];
  const invalid: { origin: string; reason: string }[] = [];

  for (const origin of origins) {
    if (!origin || typeof origin !== "string") {
      invalid.push({ origin: String(origin), reason: "Invalid origin format" });
      continue;
    }

    const trimmed = origin.trim();
    if (!trimmed) {
      invalid.push({ origin, reason: "Origin cannot be empty" });
      continue;
    }

    if (!isValidOrigin(trimmed)) {
      invalid.push({
        origin: trimmed,
        reason: "Must be a valid http:// or https:// URL",
      });
      continue;
    }

    valid.push(trimmed);
  }

  return { valid, invalid };
}
