import { describe, it, expect } from "vitest";
import { validateOrigins, isValidOrigin } from "../../src/lib/cors";

describe("isValidOrigin", () => {
  it("should validate correct HTTP origins", () => {
    expect(isValidOrigin("http://localhost:3000")).toBe(true);
    expect(isValidOrigin("http://example.com")).toBe(true);
  });

  it("should validate correct HTTPS origins", () => {
    expect(isValidOrigin("https://example.com")).toBe(true);
    expect(isValidOrigin("https://www.example.com")).toBe(true);
  });

  it("should accept localhost with port", () => {
    expect(isValidOrigin("http://localhost:3000")).toBe(true);
    expect(isValidOrigin("http://localhost:8080")).toBe(true);
  });

  it("should accept localhost without port", () => {
    expect(isValidOrigin("http://localhost")).toBe(true);
  });

  it("should accept 127.0.0.1 with port", () => {
    expect(isValidOrigin("http://127.0.0.1:3000")).toBe(true);
  });

  it("should accept IPv4 addresses", () => {
    expect(isValidOrigin("http://192.168.1.1:3000")).toBe(true);
  });

  it("should accept subdomains", () => {
    expect(isValidOrigin("https://api.example.com")).toBe(true);
    expect(isValidOrigin("https://www.example.com")).toBe(true);
    expect(isValidOrigin("https://subdomain.example.com")).toBe(true);
  });

  it("should reject non-http(s) protocols", () => {
    expect(isValidOrigin("ftp://example.com")).toBe(false);
    expect(isValidOrigin("ws://example.com")).toBe(false);
    expect(isValidOrigin("file:///path/to/file")).toBe(false);
  });

  it("should reject invalid URLs", () => {
    expect(isValidOrigin("not-a-url")).toBe(false);
  });

  it("should accept origins with paths (URL constructor allows it)", () => {
    // The isValidOrigin only checks protocol and hostname, not path
    expect(isValidOrigin("https://example.com/path")).toBe(true);
  });
});

describe("validateOrigins", () => {
  it("should validate correct HTTP origins", () => {
    const result = validateOrigins([
      "http://localhost:3000",
      "http://example.com",
    ]);

    expect(result.valid).toEqual([
      "http://localhost:3000",
      "http://example.com",
    ]);
    expect(result.invalid).toEqual([]);
  });

  it("should validate correct HTTPS origins", () => {
    const result = validateOrigins([
      "https://example.com",
      "https://www.example.com",
    ]);

    expect(result.valid).toEqual([
      "https://example.com",
      "https://www.example.com",
    ]);
    expect(result.invalid).toEqual([]);
  });

  it("should accept localhost with port", () => {
    const result = validateOrigins([
      "http://localhost:3000",
      "http://localhost:8080",
    ]);

    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(0);
  });

  it("should accept localhost without port", () => {
    const result = validateOrigins(["http://localhost"]);

    expect(result.valid).toEqual(["http://localhost"]);
    expect(result.invalid).toEqual([]);
  });

  it("should accept 127.0.0.1 with port", () => {
    const result = validateOrigins(["http://127.0.0.1:3000"]);

    expect(result.valid).toEqual(["http://127.0.0.1:3000"]);
    expect(result.invalid).toEqual([]);
  });

  it("should accept IPv4 addresses", () => {
    const result = validateOrigins(["http://192.168.1.1:3000"]);

    expect(result.valid).toEqual(["http://192.168.1.1:3000"]);
    expect(result.invalid).toEqual([]);
  });

  it("should accept subdomains", () => {
    const result = validateOrigins([
      "https://api.example.com",
      "https://www.example.com",
      "https://subdomain.example.com",
    ]);

    expect(result.valid).toHaveLength(3);
    expect(result.invalid).toHaveLength(0);
  });

  it("should reject invalid URLs", () => {
    const result = validateOrigins(["not-a-url", "ftp://example.com"]);

    expect(result.valid).toEqual([]);
    expect(result.invalid).toHaveLength(2);
    expect(result.invalid[0].origin).toBe("not-a-url");
    expect(result.invalid[0].reason).toBe(
      "Must be a valid http:// or https:// URL",
    );
    expect(result.invalid[1].origin).toBe("ftp://example.com");
    expect(result.invalid[1].reason).toBe(
      "Must be a valid http:// or https:// URL",
    );
  });

  it("should reject non-http(s) protocols", () => {
    const result = validateOrigins(["ftp://example.com", "ws://example.com"]);

    expect(result.valid).toEqual([]);
    expect(result.invalid).toHaveLength(2);
  });

  it("should handle mixed valid and invalid origins", () => {
    const result = validateOrigins([
      "https://example.com",
      "not-a-url",
      "http://localhost:3000",
    ]);

    expect(result.valid).toEqual([
      "https://example.com",
      "http://localhost:3000",
    ]);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].origin).toBe("not-a-url");
  });

  it("should handle empty array", () => {
    const result = validateOrigins([]);

    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual([]);
  });

  it("should reject file:// protocol", () => {
    const result = validateOrigins(["file:///path/to/file"]);

    expect(result.valid).toEqual([]);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].origin).toBe("file:///path/to/file");
  });

  it("should trim whitespace from origins", () => {
    const result = validateOrigins([
      "  https://example.com  ",
      " http://localhost:3000 ",
    ]);

    expect(result.valid).toEqual([
      "https://example.com",
      "http://localhost:3000",
    ]);
    expect(result.invalid).toEqual([]);
  });

  it("should reject empty strings", () => {
    const result = validateOrigins(["", "  "]);

    expect(result.valid).toEqual([]);
    expect(result.invalid).toHaveLength(2);
  });
});
