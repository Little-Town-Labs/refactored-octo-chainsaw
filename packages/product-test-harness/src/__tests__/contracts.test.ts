import {
  assertValidArtifact,
  assertValidScenario,
  HarnessValidationError,
  validateArtifact,
  validateScenario,
  type ProductScenario,
  type RunArtifact,
} from "../index.js";

const validScenario = (): ProductScenario => ({
  scenario_id: "pth.sample.noop",
  version: "1.0.0",
  title: "Sample no-op scenario",
  mode: "gate",
  tags: ["sample"],
  steps: [
    {
      step_id: "sample-step",
      name: "Sample step",
      run: () => ({ status: "passed" }),
    },
  ],
});

const validArtifact = (): RunArtifact => ({
  artifact_id: "artifact-json",
  label: "JSON report",
  type: "json",
  uri: "artifact://sample/result.json",
  redaction_status: "not_required",
});

describe("product harness contracts", () => {
  it("accepts a valid scenario definition", () => {
    expect(validateScenario(validScenario())).toEqual([]);
    expect(() => assertValidScenario(validScenario())).not.toThrow();
  });

  it("rejects scenarios without steps", () => {
    const scenario = { ...validScenario(), steps: [] };
    expect(validateScenario(scenario)).toContain("scenario.steps must contain at least one step");
    expect(() => assertValidScenario(scenario)).toThrow(HarnessValidationError);
  });

  it("rejects duplicate step identifiers", () => {
    const step = validScenario().steps[0]!;
    const scenario = { ...validScenario(), steps: [step, step] };
    expect(validateScenario(scenario)).toContain("duplicate step_id: sample-step");
  });

  it("accepts a valid artifact reference", () => {
    expect(validateArtifact(validArtifact())).toEqual([]);
    expect(() => assertValidArtifact(validArtifact())).not.toThrow();
  });

  it("rejects invalid artifact references", () => {
    const artifact = { ...validArtifact(), label: "", uri: "" };
    expect(validateArtifact(artifact)).toEqual([
      "artifact.label must be non-empty",
      "artifact.uri must be non-empty",
    ]);
  });

  it("preserves adapter-style metadata as safe structured values", () => {
    const artifact: RunArtifact = {
      ...validArtifact(),
      metadata: {
        adapter: "browser",
        trace_ref: "artifact://sample/browser-trace.zip",
      },
    };
    expect(validateArtifact(artifact)).toEqual([]);
    expect(artifact.metadata).toMatchObject({ adapter: "browser" });
  });
});
