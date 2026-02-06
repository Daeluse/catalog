import { NextRequest } from "next/server";
import {
  successResponse,
  createdResponse,
  validationErrorResponse,
  conflictResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import { validators, validationMessages } from "@/lib/validators";
import { requireAuth, isAuthError } from "@/lib/with-auth";
import { db } from "@/lib/db-adapter";
import { getPaginationParams } from "@/lib/pagination";
import { MongoQuery } from "@/types/database";

// GET /api/modules - List all modules (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const organization = searchParams.get("organization");
    const sortParam = searchParams.get("sort") || "updated";
    const pagination = getPaginationParams(searchParams, { limit: 20 });

    // Build base query
    const query: MongoQuery = { status: "active" };
    if (category) query.category = category as string;
    if (organization) query.organization = organization;

    // Text search using $or and $regex for MongoDB
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { displayName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { keywords: { $regex: search, $options: "i" } },
      ];
    }

    // Determine sort order
    let sortQuery: Record<string, 1 | -1> = { updatedAt: -1 };
    if (sortParam === "downloads") {
      sortQuery = { totalDownloads: -1 };
    } else if (sortParam === "name") {
      sortQuery = { displayName: 1 };
    }

    const modules = await db.modules.find(query, {
      sort: sortQuery,
      limit: pagination.limit,
      skip: pagination.skip,
    });

    const total = await db.modules.countDocuments(query);

    return successResponse({
      modules,
      total,
      limit: pagination.limit,
      skip: pagination.skip,
    });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return serverErrorResponse("Failed to fetch modules");
  }
}

// POST /api/modules - Create new module (authenticated)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) return authResult.error;

  const { user } = authResult;

  try {
    const body = await request.json();
    const {
      name,
      displayName,
      description,
      organization,
      repository,
      homepage,
      license,
      keywords,
      category,
      icon,
    } = body;

    // Validate required fields
    const errors: Record<string, string> = {};
    if (!validators.notEmpty(name || ""))
      errors.name = validationMessages.notEmpty;
    if (!validators.notEmpty(displayName || ""))
      errors.displayName = validationMessages.notEmpty;
    if (!validators.notEmpty(description || ""))
      errors.description = validationMessages.notEmpty;
    if (!validators.notEmpty(organization || ""))
      errors.organization = validationMessages.notEmpty;
    if (!validators.notEmpty(category || ""))
      errors.category = validationMessages.notEmpty;

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Validate module name format
    if (!validators.moduleName(name)) {
      return validationErrorResponse({ name: validationMessages.moduleName });
    }

    // Check if module already exists
    const existing = await db.modules.findOne({ name });
    if (existing) {
      return conflictResponse("Module already exists");
    }

    // Create new module
    const newModule = {
      name,
      displayName,
      description,
      organization,
      repository,
      homepage,
      license,
      keywords: keywords || [],
      category,
      icon,
      status: "active" as const,
      owner: {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      maintainers: [],
      totalDownloads: 0,
      weeklyDownloads: 0,
    };

    const result = await db.modules.insertOne(newModule);

    return createdResponse({
      ...newModule,
      _id: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating module:", error);
    return serverErrorResponse("Failed to create module");
  }
}
