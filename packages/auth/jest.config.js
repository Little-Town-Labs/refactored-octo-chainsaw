import baseConfig from "../../jest.config.base.js";

/** @type {import("jest").Config} */
export default {
  ...baseConfig,
  displayName: "@spyglass/auth",
  // jose v6 ships ESM only; let SWC transform it during tests.
  // pnpm stores deps under node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/,
  // so the negative lookahead has to allow either path.
  transformIgnorePatterns: ["node_modules/(?!(?:\\.pnpm/)?(?:jose|.*?/node_modules/jose))"],
  // Default `pnpm test` runs unit tests only; integration suites are
  // routed through `pnpm test:integration` (jest.config.integration.js).
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/tests/integration/"],
};
