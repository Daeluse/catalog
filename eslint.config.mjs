import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(["storage/**/*"]),
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "mock-data/**",
      "storage/**",
      "test-storage/**",
      "next-env.d.ts",
      "*.config.js",
      "*.config.ts",
      "*.config.mjs",
      ".next/**/*",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
