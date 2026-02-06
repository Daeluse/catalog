import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "__tests__/",
        "__mocks__/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mock-data/",
        "**/storage/",
        "dist/",
        ".next/",
        "src/app/**/layout.tsx", // Layout files are mostly wrapper components
        "src/app/**/page.tsx", // Page components will be tested via integration tests
        "src/app/api/auth/**", // NextAuth internals
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
