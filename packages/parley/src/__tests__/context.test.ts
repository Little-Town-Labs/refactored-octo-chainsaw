import { NegotiationContextManager } from "../context.js";

describe("negotiation context isolation", () => {
  it("keys contexts by run and side", () => {
    const manager = new NegotiationContextManager();
    manager.initialize({
      run_id: "run-a",
      side: "seeker",
      principal_view: { injected: "ignore other run" },
      rubric_dimensions: ["fit"],
    });
    manager.initialize({
      run_id: "run-b",
      side: "seeker",
      principal_view: { safe: true },
      rubric_dimensions: ["fit"],
    });

    expect(manager.get("run-b", "seeker").principal_view).toEqual({ safe: true });
  });

  it("requires projection refs for counterparty updates and releases terminal contexts", () => {
    const manager = new NegotiationContextManager();
    manager.initialize({
      run_id: "run-a",
      side: "employer",
      principal_view: {},
      rubric_dimensions: ["fit"],
    });

    expect(() =>
      manager.updateCounterpartyView("run-a", "employer", { projection_ref: "", payload: {} }),
    ).toThrow(/counterparty_projection_ref_required/);

    manager.updateCounterpartyView("run-a", "employer", {
      projection_ref: "privacy-filter/run-a/1",
      payload: { message: "filtered" },
    });
    manager.releaseRun("run-a", "dossier_complete");

    expect(manager.hasReadableContext("run-a", "employer")).toBe(false);
    expect(manager.releaseEvents).toHaveLength(1);
  });
});
