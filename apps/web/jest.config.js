// apps/web Jest config — uses the Spyglass base SWC transform.
//
// Earlier we wrapped this in `next/jest` to inherit Next-specific
// transforms, but next/jest's pnpm-aware `transformIgnorePatterns`
// blocks ESM-only packages like jose v6. The base SWC transform
// handles our test surface (no Next-specific imports here) and lets
// us control which node_modules get transformed.

import baseConfig from "../../jest.config.base.js";

/** @type {import("jest").Config} */
export default {
  ...baseConfig,
  displayName: "@spyglass/web",
  testEnvironment: "jsdom",
  setupFiles: ["<rootDir>/jest.setup.js"],
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  // Override the base transform: route .js files through SWC's
  // ecmascript parser (jose's ESM source) and .ts/.tsx through the
  // typescript parser. The base config uses one entry that runs
  // typescript on everything, which fails on jose's `export` syntax.
  transform: {
    "^.+\\.tsx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: true, decorators: false },
          target: "es2022",
          transform: {
            react: { runtime: "automatic" },
          },
        },
      },
    ],
    "^.+\\.jsx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "ecmascript", jsx: true },
          target: "es2022",
        },
        module: { type: "commonjs" },
      },
    ],
  },
  // jose ships ESM only; SWC transforms it. pnpm's nested layout means
  // the path looks like `node_modules/.pnpm/jose@x.y.z/node_modules/jose/...`.
  transformIgnorePatterns: ["node_modules/(?!(?:\\.pnpm/)?(?:jose|.*?/node_modules/jose))"],
  // jose v6 ships dual exports based on conditional resolution.
  // Force the webapi build (same one used in browsers and Node 20+).
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}", "**/?(*.)+(spec|test).{ts,tsx}"],
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/__tests__/**",
  ],
};
