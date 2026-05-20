import { findDispatcherBypassInText } from "../import-boundary.js";

describe("dispatcher import boundary", () => {
  it("detects direct side-runner adapter imports", () => {
    const findings = findDispatcherBypassInText(
      "packages/parley-runner/src/side-runner.ts",
      "import { registry } from '@spyglass/tool-dispatcher/src/adapter-registry';",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.forbidden_import).toContain("adapter-registry");
  });
});
