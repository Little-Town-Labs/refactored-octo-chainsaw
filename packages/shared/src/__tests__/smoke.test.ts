import { __pkg } from "../index.js";

describe("@spyglass/shared", () => {
  it("exports the package marker", () => {
    expect(__pkg).toBe("@spyglass/shared");
  });
});
