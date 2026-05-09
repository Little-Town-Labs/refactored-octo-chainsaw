// Integration-test runner for @spyglass/auth.
//
// Runs ONLY files under `tests/integration/` (e.g. Quickstart-scenario
// gates). Default `pnpm test` excludes this folder; integration runs
// are opt-in via `pnpm test:integration`.

import baseConfig from "../../jest.config.base.js";

/** @type {import("jest").Config} */
export default {
  ...baseConfig,
  displayName: "@spyglass/auth (integration)",
  transformIgnorePatterns: ["node_modules/(?!(?:\\.pnpm/)?(?:jose|.*?/node_modules/jose))"],
  testMatch: ["<rootDir>/tests/integration/**/*.integration.test.{ts,tsx}"],
  // Integration tests may apply real migrations / open Neon branches.
  // 60s is a comfortable ceiling; bump per-test if a scenario justifies.
  testTimeout: 60_000,
};
