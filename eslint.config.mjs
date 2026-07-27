import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Jest coverage report (see .gitignore) - not source.
    "coverage/**",
  ]),
  {
    // Jest's config loader resolves `jest.config.js` via CommonJS `require`,
    // so this file can't use ESM `import` even though the rest of the repo
    // does. Scoped to just this file rather than disabled repo-wide.
    files: ["jest.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // No `console.*` calls in app code - use `lib/utils/logger.ts` instead,
    // which no-ops in production. See Technical Requirements: "Security musts".
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-console": "error",
    },
  },
  {
    // logger.ts is the single sanctioned place console methods may appear.
    files: ["src/lib/utils/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
