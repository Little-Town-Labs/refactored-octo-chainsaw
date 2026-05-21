import {
  assertNoHumanInputToolSemantics,
  scanToolCatalogForHumanInputSemantics,
} from "../tool-scan.js";
import { testDescriptor } from "./fixtures.js";

describe("tool semantic scan", () => {
  it("allows normal descriptors", () => {
    expect(() => assertNoHumanInputToolSemantics([testDescriptor("lookup_profile")])).not.toThrow();
  });

  it("rejects descriptors that wait for human confirmation", () => {
    const descriptor = {
      ...testDescriptor("ask_candidate"),
      description: "Ask the principal for human confirmation before continuing.",
    };
    expect(scanToolCatalogForHumanInputSemantics([descriptor])).toHaveLength(1);
    expect(() => assertNoHumanInputToolSemantics([descriptor])).toThrow(
      /tool_human_input_semantics/,
    );
  });
});
