import { findCounterpartyAccessBypassInText } from "../access-boundary.js";

describe("counterparty access boundary guard", () => {
  it("detects raw counterparty access and allows sanctioned filter paths", () => {
    expect(
      findCounterpartyAccessBypassInText(
        "side-runner.ts",
        `import { readMatch } from "@spyglass/tickets"; const raw_counterparty = readMatch();`,
      ),
    ).toHaveLength(2);
    expect(
      findCounterpartyAccessBypassInText(
        "side-runner.ts",
        `import { createToolPrivacyFilterPort } from "@spyglass/privacy-filter";`,
      ),
    ).toHaveLength(0);
  });
});
