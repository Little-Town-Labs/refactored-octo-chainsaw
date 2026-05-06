// Spyglass Prettier config.
//
// Aligned with the global ~/.claude/settings.json PostToolUse Prettier
// hook output to avoid format thrash between editor and CI.

/** @type {import("prettier").Config} */
const config = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: "always",
  endOfLine: "lf",
};

export default config;
