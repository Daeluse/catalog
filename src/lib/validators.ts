import semver from "semver";

/**
 * Validation Utilities
 * Centralized validation logic to ensure consistency
 */

export const validators = {
  /**
   * Validates module name format
   * Allows: @org/module-name or module-name
   */
  moduleName: (name: string): boolean => {
    return /^(@[\w-]+\/)?[\w-]+$/.test(name);
  },

  /**
   * Validates email format
   */
  email: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  /**
   * Validates semantic version format
   */
  semver: (version: string): boolean => {
    return semver.valid(version) !== null;
  },

  /**
   * Validates URL format
   */
  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validates origin URL format (for CORS)
   * Must be protocol + domain, no path
   */
  origin: (origin: string): boolean => {
    try {
      const url = new URL(origin);
      // Origin should not have a path (except /)
      return url.pathname === "/" || url.pathname === "";
    } catch {
      return false;
    }
  },

  /**
   * Validates that a string is not empty after trimming
   */
  notEmpty: (value: string): boolean => {
    return value.trim().length > 0;
  },

  /**
   * Validates minimum length
   */
  minLength: (value: string, min: number): boolean => {
    return value.length >= min;
  },

  /**
   * Validates maximum length
   */
  maxLength: (value: string, max: number): boolean => {
    return value.length <= max;
  },
};

export const validationMessages = {
  moduleName: "Invalid module name format. Use @org/module-name or module-name",
  email: "Invalid email format",
  semver: "Invalid version format. Use semantic versioning (e.g., 1.0.0)",
  url: "Invalid URL format",
  origin:
    "Invalid origin URL. Must be protocol + domain only (e.g., https://example.com)",
  notEmpty: "This field is required",
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be at most ${max} characters`,
};

/**
 * Validate multiple fields and return errors
 */
export function validateFields(
  fields: Record<string, unknown>,
  rules: Record<string, Array<(value: unknown) => boolean | string>>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [field, validationRules] of Object.entries(rules)) {
    const value = fields[field];

    for (const rule of validationRules) {
      const result = rule(value);
      if (result === false) {
        errors[field] = `${field} validation failed`;
        break;
      } else if (typeof result === "string") {
        errors[field] = result;
        break;
      }
    }
  }

  return errors;
}
