/** @type {import("@commitlint/types").UserConfig} */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Allow conventional types plus Spyglass-specific scopes if useful.
    // Out of the box, conventional-config covers feat / fix / docs /
    // style / refactor / perf / test / chore / ci / build / revert.
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
  },
};

export default config;
