import { routeToolOutput } from "../disclosure.js";

import { MemoryToolRepository } from "./fixtures.js";

describe("disclosure routing", () => {
  it("routes principal_self and platform_open outputs without privacy filtering", async () => {
    const repo = new MemoryToolRepository();
    const principal = await routeToolOutput({
      repository: repo,
      dispatchEventId: "11111111-1111-4111-8111-111111111111",
      auditEventId: "22222222-2222-4222-8222-222222222222",
      runId: "run-1",
      toolRef: { name: "lookup_profile", version: "1.0.0" },
      disclosureClass: "principal_self",
      output: { summary: "self" },
      durationMs: 1,
    });
    const open = await routeToolOutput({
      repository: repo,
      dispatchEventId: "33333333-3333-4333-8333-333333333333",
      auditEventId: "44444444-4444-4444-8444-444444444444",
      runId: "run-1",
      toolRef: { name: "read_public_policy", version: "1.0.0" },
      disclosureClass: "platform_open",
      output: { summary: "open" },
      durationMs: 1,
    });

    expect(principal.principal_view).toEqual({ summary: "self" });
    expect(open.principal_view).toEqual({ summary: "open" });
    expect(repo.routing.map((row) => row.route)).toEqual(["principal_only", "platform_open"]);
  });
});
