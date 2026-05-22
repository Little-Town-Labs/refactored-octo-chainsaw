import { employerRunInputFixture } from "../fixtures.js";
import { validateEmployerRequestedTool } from "../employer-advocate.js";

describe("employer tool boundary", () => {
  test("throws for unsupported tools", async () => {
    const input = await employerRunInputFixture();

    expect(() => validateEmployerRequestedTool(input, "ask_principal_for_confirmation")).toThrow(
      "unsupported_tool",
    );
  });
});
