import { describe, it, expect } from "vitest";
import {
  successResponse,
  createdResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  serverErrorResponse,
} from "../../src/lib/api-responses";

describe("api-responses", () => {
  describe("successResponse", () => {
    it("should return 200 with data", async () => {
      const response = successResponse({ message: "success", count: 42 });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("success");
      expect(data.count).toBe(42);
    });

    it("should handle null data", async () => {
      const response = successResponse(null);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBeNull();
    });

    it("should handle empty object", async () => {
      const response = successResponse({});

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({});
    });
  });

  describe("createdResponse", () => {
    it("should return 201 with data", async () => {
      const response = createdResponse({ id: "123", name: "Test" });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBe("123");
      expect(data.name).toBe("Test");
    });
  });

  describe("errorResponse", () => {
    it("should return 400 with error message", async () => {
      const response = errorResponse("Invalid input");

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid input");
    });

    it("should use custom status code", async () => {
      const response = errorResponse("Custom error", 418);

      expect(response.status).toBe(418);
      const data = await response.json();
      expect(data.error).toBe("Custom error");
    });
  });

  describe("validationErrorResponse", () => {
    it("should return 422 with validation errors", async () => {
      const errors = {
        email: "Invalid email format",
        password: "Password too short",
      };

      const response = validationErrorResponse(errors);

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.error).toBe("Validation failed");
      expect(data.errors).toEqual(errors);
    });

    it("should handle single error", async () => {
      const errors = { name: "Required field" };

      const response = validationErrorResponse(errors);

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.errors).toEqual(errors);
    });

    it("should handle empty errors object", async () => {
      const response = validationErrorResponse({});

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.errors).toEqual({});
    });
  });

  describe("unauthorizedResponse", () => {
    it("should return 401 with default message", async () => {
      const response = unauthorizedResponse();

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 with custom message", async () => {
      const response = unauthorizedResponse("Invalid credentials");

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Invalid credentials");
    });
  });

  describe("forbiddenResponse", () => {
    it("should return 403 with default message", async () => {
      const response = forbiddenResponse();

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 with custom message", async () => {
      const response = forbiddenResponse("Insufficient permissions");

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Insufficient permissions");
    });
  });

  describe("notFoundResponse", () => {
    it("should return 404 with resource name", async () => {
      const response = notFoundResponse("User");

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("User not found");
    });

    it("should handle different resource types", async () => {
      const moduleResponse = notFoundResponse("Module");
      const versionResponse = notFoundResponse("Version");

      expect(moduleResponse.status).toBe(404);
      expect(versionResponse.status).toBe(404);

      const moduleData = await moduleResponse.json();
      const versionData = await versionResponse.json();

      expect(moduleData.error).toBe("Module not found");
      expect(versionData.error).toBe("Version not found");
    });
  });

  describe("conflictResponse", () => {
    it("should return 409 with custom message", async () => {
      const response = conflictResponse("Email already registered");

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe("Email already registered");
    });

    it("should return 409 for resource conflicts", async () => {
      const response = conflictResponse("Resource already exists");

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe("Resource already exists");
    });
  });

  describe("serverErrorResponse", () => {
    it("should return 500 with default message", async () => {
      const response = serverErrorResponse();

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });

    it("should return 500 with custom message", async () => {
      const response = serverErrorResponse("Database connection failed");

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Database connection failed");
    });
  });
});
