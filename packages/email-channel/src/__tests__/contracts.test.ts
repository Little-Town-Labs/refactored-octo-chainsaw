import { existsSync } from "node:fs";
import { resolve } from "node:path";

describe("email contracts", () => {
  it.each([
    "email-inbound.schema.yaml",
    "email-outbound.schema.yaml",
    "email-delivery-result.schema.yaml",
    "email-audit-event.schema.yaml",
  ])("ships %s", (file) => {
    expect(
      existsSync(resolve(process.cwd(), "../../.specify/specs/018-email-channel/contracts", file)),
    ).toBe(true);
  });
});
