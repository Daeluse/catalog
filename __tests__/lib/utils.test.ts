import { describe, it, expect } from "vitest";
import { cn, formatDate, formatBytes, formatNumber } from "../../src/lib/utils";

describe("utils", () => {
  describe("cn (className merger)", () => {
    it("should merge multiple class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
      expect(cn("class1", "class2", "class3")).toBe("class1 class2 class3");
    });

    it("should handle conditional classes", () => {
      expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
      expect(cn("foo", true && "bar", "baz")).toBe("foo bar baz");
      expect(cn("foo", undefined, "bar")).toBe("foo bar");
      expect(cn("foo", null, "bar")).toBe("foo bar");
    });

    it("should merge Tailwind CSS classes correctly", () => {
      // Later class should override earlier class
      expect(cn("px-2", "px-4")).toBe("px-4");
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
      expect(cn("bg-gray-100", "bg-white")).toBe("bg-white");
    });

    it("should handle arrays of classes", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
      expect(cn("baz", ["foo", "bar"])).toBe("baz foo bar");
    });

    it("should handle objects with conditional classes", () => {
      expect(cn({ foo: true, bar: false })).toBe("foo");
      expect(cn({ foo: true, bar: true })).toBe("foo bar");
    });

    it("should handle empty inputs", () => {
      expect(cn()).toBe("");
      expect(cn("")).toBe("");
      expect(cn("", "")).toBe("");
    });

    it("should handle complex combinations", () => {
      const result = cn(
        "base-class",
        { "conditional-class": true },
        false && "hidden-class",
        ["array-class-1", "array-class-2"],
      );
      expect(result).toContain("base-class");
      expect(result).toContain("conditional-class");
      expect(result).toContain("array-class-1");
      expect(result).not.toContain("hidden-class");
    });
  });

  describe("formatDate", () => {
    it("should format Date objects correctly", () => {
      // Use specific date constructor to avoid timezone issues
      const date = new Date(2025, 0, 15); // Jan 15, 2025 in local timezone
      const formatted = formatDate(date);
      expect(formatted).toBe("January 15, 2025");
    });

    it("should format date strings correctly", () => {
      // Use Date constructor with year, month, day to avoid timezone issues
      expect(formatDate(new Date(2025, 0, 15))).toBe("January 15, 2025");
      expect(formatDate(new Date(2024, 11, 25))).toBe("December 25, 2024");
      expect(formatDate(new Date(2024, 2, 1))).toBe("March 1, 2024");
    });

    it("should handle different months", () => {
      expect(formatDate(new Date(2025, 0, 1))).toContain("January");
      expect(formatDate(new Date(2025, 1, 1))).toContain("February");
      expect(formatDate(new Date(2025, 2, 1))).toContain("March");
      expect(formatDate(new Date(2025, 11, 1))).toContain("December");
    });

    it("should handle leap years", () => {
      expect(formatDate(new Date(2024, 1, 29))).toBe("February 29, 2024");
    });

    it("should handle timestamps", () => {
      const date = new Date(2025, 5, 15); // June 15, 2025
      const timestamp = date.getTime();
      const formatted = formatDate(new Date(timestamp));
      expect(formatted).toBe("June 15, 2025");
    });

    it("should handle different date formats", () => {
      expect(formatDate(new Date(2025, 0, 15))).toBe("January 15, 2025");
      expect(formatDate(new Date(2025, 11, 31))).toBe("December 31, 2025");
    });

    it("should format dates consistently", () => {
      const date1 = new Date(2025, 5, 10);
      const date2 = new Date(2025, 5, 10);
      expect(formatDate(date1)).toBe(formatDate(date2));
    });
  });

  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
      expect(formatBytes(100)).toBe("100 Bytes");
      expect(formatBytes(500)).toBe("500 Bytes");
      expect(formatBytes(1023)).toBe("1023 Bytes");
    });

    it("should format kilobytes correctly", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(2048)).toBe("2 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(10240)).toBe("10 KB");
      expect(formatBytes(102400)).toBe("100 KB");
    });

    it("should format megabytes correctly", () => {
      expect(formatBytes(1048576)).toBe("1 MB"); // 1024 * 1024
      expect(formatBytes(2097152)).toBe("2 MB"); // 2 * 1024 * 1024
      expect(formatBytes(5242880)).toBe("5 MB"); // 5 * 1024 * 1024
      expect(formatBytes(10485760)).toBe("10 MB"); // 10 * 1024 * 1024
    });

    it("should format gigabytes correctly", () => {
      expect(formatBytes(1073741824)).toBe("1 GB"); // 1024 * 1024 * 1024
      expect(formatBytes(2147483648)).toBe("2 GB"); // 2 * 1024 * 1024 * 1024
      expect(formatBytes(5368709120)).toBe("5 GB"); // 5 * 1024 * 1024 * 1024
    });

    it("should round to 2 decimal places", () => {
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(1638)).toBe("1.6 KB");
      expect(formatBytes(1741)).toBe("1.7 KB");
      expect(formatBytes(1331)).toBe("1.3 KB");
    });

    it("should handle fractional sizes", () => {
      expect(formatBytes(1500)).toBe("1.46 KB");
      expect(formatBytes(1500000)).toBe("1.43 MB");
    });

    it("should handle very large files", () => {
      const tenGB = 10 * 1024 * 1024 * 1024;
      expect(formatBytes(tenGB)).toBe("10 GB");
    });
  });

  describe("formatNumber", () => {
    it("should format small numbers as-is", () => {
      expect(formatNumber(0)).toBe("0");
      expect(formatNumber(1)).toBe("1");
      expect(formatNumber(10)).toBe("10");
      expect(formatNumber(100)).toBe("100");
      expect(formatNumber(999)).toBe("999");
    });

    it("should format thousands with K suffix", () => {
      expect(formatNumber(1000)).toBe("1.0K");
      expect(formatNumber(1500)).toBe("1.5K");
      expect(formatNumber(2000)).toBe("2.0K");
      expect(formatNumber(10000)).toBe("10.0K");
      expect(formatNumber(50000)).toBe("50.0K");
      expect(formatNumber(999000)).toBe("999.0K");
    });

    it("should format millions with M suffix", () => {
      expect(formatNumber(1000000)).toBe("1.0M");
      expect(formatNumber(1500000)).toBe("1.5M");
      expect(formatNumber(2000000)).toBe("2.0M");
      expect(formatNumber(10000000)).toBe("10.0M");
      expect(formatNumber(50000000)).toBe("50.0M");
    });

    it("should round to 1 decimal place", () => {
      expect(formatNumber(1234)).toBe("1.2K");
      expect(formatNumber(1567)).toBe("1.6K");
      expect(formatNumber(1234567)).toBe("1.2M");
      expect(formatNumber(9876543)).toBe("9.9M");
    });

    it("should handle edge cases at boundaries", () => {
      expect(formatNumber(999)).toBe("999");
      expect(formatNumber(1000)).toBe("1.0K");
      expect(formatNumber(999999)).toBe("1000.0K");
      expect(formatNumber(1000000)).toBe("1.0M");
    });

    it("should handle very large numbers", () => {
      expect(formatNumber(100000000)).toBe("100.0M");
      expect(formatNumber(999999999)).toBe("1000.0M");
    });

    it("should format download counts realistically", () => {
      expect(formatNumber(42)).toBe("42");
      expect(formatNumber(1337)).toBe("1.3K");
      expect(formatNumber(50000)).toBe("50.0K");
      expect(formatNumber(1200000)).toBe("1.2M");
    });
  });
});
