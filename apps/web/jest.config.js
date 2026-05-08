// apps/web Jest config — uses next/jest for Next.js-aware transforms,
// then merges Spyglass base settings.

import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Path to load next.config and .env files in tests.
  dir: "./",
});

/** @type {import("jest").Config} */
const customJestConfig = {
  displayName: "@spyglass/web",
  testEnvironment: "jsdom",
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}", "**/?(*.)+(spec|test).{ts,tsx}"],
  // NodeNext-style imports use ".js" suffix even for ".ts" sources.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/__tests__/**",
  ],
  coverageProvider: "v8",
  coverageReporters: ["text-summary", "lcov", "json-summary"],
  coverageDirectory: "coverage",
  clearMocks: true,
  restoreMocks: true,
};

export default createJestConfig(customJestConfig);
