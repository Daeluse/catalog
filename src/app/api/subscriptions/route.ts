import { NextRequest } from "next/server";
import {
  successResponse,
  createdResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import { validators, validationMessages } from "@/lib/validators";
import { requireAuth, isAuthError } from "@/lib/with-auth";
import { db, findById } from "@/lib/db-adapter";
import { getPaginationParams } from "@/lib/pagination";
import { IApplication, IModule } from "@/models";
import { notifyModuleApprovers } from "@/lib/notifications";

// GET /api/subscriptions - List user's subscriptions (authenticated)
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) return authResult.error;

  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const moduleId = searchParams.get("moduleId");
    const pagination = getPaginationParams(searchParams, { limit: 50 });

    const validStatuses = ["pending", "approved", "rejected", "revoked"];
    if (status && !validStatuses.includes(status)) {
      return errorResponse("Invalid status filter");
    }

    // First, get user's applications
    const userApplications = await db.applications.find({
      "owner.userId": user.id,
    });

    const applicationIds = userApplications.map((app) => String(app._id));

    if (applicationIds.length === 0) {
      return successResponse({
        subscriptions: [],
        total: 0,
        limit: pagination.limit,
        skip: pagination.skip,
      });
    }

    // Build query for subscriptions
    const query: Record<string, unknown> = {
      applicationId: { $in: applicationIds },
    };
    if (status) query.status = status;
    if (moduleId) query.moduleId = moduleId;

    // Get subscriptions
    const subscriptions = await db.subscriptions.find(query, {
      sort: { requestedAt: -1 },
      limit: pagination.limit,
      skip: pagination.skip,
    });

    // Populate with application and module data
    const populatedSubscriptions = await Promise.all(
      subscriptions.map(async (sub) => {
        const [application, moduleDoc] = await Promise.all([
          findById<IApplication>("applications", sub.applicationId),
          findById<IModule>("modules", sub.moduleId),
        ]);

        return {
          ...sub,
          application: application || null,
          module: moduleDoc || null,
        };
      }),
    );

    const total = await db.subscriptions.countDocuments(query);

    return successResponse({
      subscriptions: populatedSubscriptions,
      total,
      limit: pagination.limit,
      skip: pagination.skip,
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return serverErrorResponse("Failed to fetch subscriptions");
  }
}

// POST /api/subscriptions - Create subscription request (authenticated)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) return authResult.error;

  const { user } = authResult;

  try {
    const body = await request.json();
    const { applicationId, moduleId } = body;

    // Validate required fields
    const errors: Record<string, string> = {};

    if (!validators.notEmpty(applicationId || ""))
      errors.applicationId = validationMessages.notEmpty;
    if (!validators.notEmpty(moduleId || ""))
      errors.moduleId = validationMessages.notEmpty;

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Verify application exists and user owns it
    const application = await db.applications.findOne({ _id: applicationId });

    if (!application) {
      return notFoundResponse("Application");
    }

    if (application.owner.userId !== user.id) {
      return forbiddenResponse("You do not own this application");
    }

    // Verify module exists and is active
    const moduleDoc = await db.modules.findOne({ _id: moduleId });

    if (!moduleDoc) {
      return notFoundResponse("Module");
    }

    if (moduleDoc.status !== "active") {
      return errorResponse("Module is not active");
    }

    // Check if subscription already exists
    const existing = await db.subscriptions.findOne({
      applicationId,
      moduleId,
    });

    if (existing) {
      return conflictResponse("Subscription already exists");
    }

    // Create subscription
    const newSubscription = {
      applicationId,
      moduleId,
      moduleName: moduleDoc.name,
      status: "pending" as const,
      requestedBy: {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      requestedAt: new Date(),
    };

    const result = await db.subscriptions.insertOne(newSubscription);

    // Notify module approvers about the new subscription request
    notifyModuleApprovers(moduleDoc as IModule & { _id: string }, {
      type: "subscription_requested",
      title: "New subscription request",
      message: `${application.name} requested access to ${moduleDoc.name}`,
      link: `/dashboard/modules/${encodeURIComponent(moduleDoc.name)}/subscriptions`,
      metadata: {
        subscriptionId: result.insertedId,
        moduleName: moduleDoc.name,
        applicationName: application.name,
      },
    });

    return createdResponse({
      ...newSubscription,
      _id: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    return serverErrorResponse("Failed to create subscription");
  }
}
