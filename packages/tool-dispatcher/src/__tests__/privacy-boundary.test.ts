import { routeToolOutput } from "../disclosure.js";

import { MemoryToolRepository } from "./fixtures.js";

describe("counterparty_filtered privacy boundary", () => {
  it("fails closed when the F09 privacy filter port is unavailable", async () => {
    const repo = new MemoryToolRepository();
    const result = await routeToolOutput({
      repository: repo,
      dispatchEventId: "11111111-1111-4111-8111-111111111111",
      auditEventId: "22222222-2222-4222-8222-222222222222",
      runId: "run-1",
      toolRef: { name: "summarize_counterparty_context", version: "1.0.0" },
      disclosureClass: "counterparty_filtered",
      output: { summary: "raw counterparty context" },
      durationMs: 1,
    });

    expect(result.status).toBe("filtered_pending");
    expect(result.principal_view).toBeUndefined();
    expect(result.counterparty_view_ref).toBeUndefined();
    expect(repo.routing[0]?.route).toBe("failed_closed");
  });

  it("returns only a filtered reference when the privacy filter port completes", async () => {
    const repo = new MemoryToolRepository();
    const result = await routeToolOutput({
      repository: repo,
      dispatchEventId: "11111111-1111-4111-8111-111111111111",
      auditEventId: "22222222-2222-4222-8222-222222222222",
      runId: "run-1",
      toolRef: { name: "summarize_counterparty_context", version: "1.0.0" },
      disclosureClass: "counterparty_filtered",
      output: { summary: "raw counterparty context" },
      durationMs: 1,
      privacyFilter: {
        filterToolOutput: async () => ({
          ref: "privacy-filter://result-1",
          output: { summary: "filtered" },
        }),
      },
    });

    expect(result.status).toBe("ok");
    expect(result.counterparty_view_ref).toBe("privacy-filter://result-1");
    expect(result.principal_view).toBeUndefined();
  });
});
