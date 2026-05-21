import { manifestAllowsModel } from "../manifest.js";
import { manifestFixture, modelFixture } from "./fixtures.js";

describe("supply-chain allowlists", () => {
  test("refuses unallowlisted provider", () => {
    const refusal = manifestAllowsModel(
      manifestFixture({ provider_allowlist: ["vercel-ai-gateway"] }),
      modelFixture({ provider: "openai" }),
    );

    expect(refusal?.reason_code).toBe("provider_not_allowed");
  });
});
