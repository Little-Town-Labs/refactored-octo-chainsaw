// Spyglass Jest base config — shared across all packages.
//
// Per spec Clarification 1: Jest with @swc/jest as the transformer.
// SWC transpiles TypeScript without running tsc, so test runs do not
// type-check (editor + CI tsc cover that). This is the standard Jest
// pattern with SWC.
//
// Coverage: per global ~/.claude/rules/testing.md the long-term target
// is 80%+ coverage. F01 ships the *reporting infrastructure* — coverage
// thresholds are non-blocking warnings until F03 (when meaningful test
// surface exists). See plan §7.

/** @type {import("jest").Config} */
const baseConfig = {
  testEnvironment: "node",

  // Transform .ts/.tsx via SWC. Pass an empty options object so SWC
  // uses sensible defaults; package-level swcrc overrides are not
  // wired in F01.
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: true, decorators: false },
          target: "es2022",
        },
      },
    ],
  },

  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

  // NodeNext-style imports use ".js" suffix even for ".ts" sources.
  // Strip the suffix so Jest's resolver finds the real .ts/.tsx file.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  // Match co-located tests (foo.test.ts) and __tests__ directories.
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}", "**/?(*.)+(spec|test).{ts,tsx}"],

  // Coverage from src/ only; exclude declaration and test files.
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
  ],

  coverageProvider: "v8",
  coverageReporters: ["text-summary", "lcov", "json-summary"],
  coverageDirectory: "coverage",

  // F01: thresholds non-blocking (FR-9 / plan §7). F03 promotes.
  // Leaving coverageThreshold unset deliberately.

  clearMocks: true,
  restoreMocks: true,
};

export default baseConfig;
