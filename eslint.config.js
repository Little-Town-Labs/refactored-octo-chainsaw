// Spyglass ESLint flat config (ESLint 9+).
//
// Per spec Clarification 2 (revised): ESLint + Prettier replaces the
// originally-chosen Biome. ESLint's max-lines rule directly enforces
// NFR-10 (≤ 800 lines per file).
//
// Boundary enforcement is one of three independent layers (Research
// D16): this file + package.json#exports + publint in CI.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import boundaries from "eslint-plugin-boundaries";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  {
    // Files to lint
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
  },
  {
    // Files to ignore
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/*.tsbuildinfo",
      "next-env.d.ts",
    ],
  },

  // Base recommended sets
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Import + boundaries
  {
    plugins: {
      import: importPlugin,
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "apps/*" },
        { type: "pkg", pattern: "packages/*" },
      ],
      "import/resolver": {
        typescript: {
          project: ["packages/*/tsconfig.json", "apps/*/tsconfig.json"],
        },
      },
    },
    rules: {
      // FR-5: apps/* don't depend on apps/* (boundaries v6 syntax —
      // selectors are element-type strings)
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          rules: [
            {
              from: ["app"],
              disallow: ["app"],
              message: "Apps must not depend on other apps; share via packages/*",
            },
          ],
        },
      ],

      // FR-25: no deep imports ACROSS package boundaries.
      // Same-package relative imports (e.g., "../index.js") are allowed;
      // cross-package deep paths into another @spyglass/* package's
      // dist/ or src/ are not.
      "import/no-internal-modules": [
        "error",
        {
          forbid: ["@spyglass/*/dist/**", "@spyglass/*/src/**"],
        },
      ],
    },
  },

  // NFR-10: file size ≤ 800 lines
  {
    rules: {
      "max-lines": ["error", { max: 800, skipBlankLines: true, skipComments: true }],
    },
  },

  // TypeScript-specific overrides
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
    },
  },

  // Test-file relaxations
  {
    files: ["**/*.test.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
    rules: {
      "max-lines": "off",
    },
  },

  // Prettier compat — must come last so it can disable conflicting rules
  prettierConfig,
);
