import { dispatchTool } from "../dispatcher.js";

import {
  MemoryCanonicalAuditStore,
  MemoryToolRepository,
  registryWithLookupAdapter,
} from "./fixtures.js";

describe("unsupported tool calls", () => {
  it("return tool_unsupported and allow the turn to continue", async () => {
    const repo = new MemoryToolRepository();
    const result = await dispatchTool({
      repository: repo,
      adapters: registryWithLookupAdapter(),
      auditStore: new MemoryCanonicalAuditStore(),
      advertisement: {
        run_id: "run-1",
        side: "seeker",
        contract_ref: { id: "contract", version: "1.0.0" },
        surface_ref: { id: "seeker-tools", version: "1.0.0" },
        descriptors: [],
        resolved_at: new Date(),
      },
      request: {
        request_id: "request-unsupported",
        run_id: "run-1",
        turn_id: "turn-1",
        side: "seeker",
        principal_id: "agent-1",
        principal_scopes: ["tool.dispatch"],
        contract_ref: { id: "contract", version: "1.0.0" },
        surface_ref: { id: "seeker-tools", version: "1.0.0" },
        tool_ref: { name: "not_advertised", version: "1.0.0" },
        input: {},
        call_index: 0,
        max_tool_calls_per_turn: 2,
      },
    });

    expect(result.status).toBe("tool_unsupported");
    expect(result.continue_turn).toBe(true);
    expect(repo.dispatchEvents[0]?.reason_code).toBe("tool_unsupported");
  });
});
