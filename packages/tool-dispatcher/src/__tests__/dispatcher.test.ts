import { dispatchTool } from "../dispatcher.js";
import { publishToolDescriptor, publishToolSurface } from "../publish.js";
import { resolveToolSurfaceForDispatch } from "../resolver.js";

import {
  descriptorMaterial,
  MemoryCanonicalAuditStore,
  MemoryToolRepository,
  operator,
  registryWithLookupAdapter,
  surfaceMaterial,
} from "./fixtures.js";

describe("tool dispatcher", () => {
  it("invokes supported advertised tools through the dispatcher", async () => {
    const { repo, audit, advertisement } = await setup();
    const result = await dispatchTool({
      repository: repo,
      adapters: registryWithLookupAdapter(),
      auditStore: audit,
      advertisement,
      request: {
        request_id: "request-1",
        run_id: "run-1",
        turn_id: "turn-1",
        side: "seeker",
        principal_id: "agent-1",
        principal_scopes: ["tool.dispatch"],
        contract_ref: { id: "contract", version: "1.0.0" },
        surface_ref: { id: "seeker-tools", version: "1.0.0" },
        tool_ref: { name: "lookup_profile", version: "1.0.0" },
        input: { ticket_id: "ticket-1" },
        call_index: 0,
        max_tool_calls_per_turn: 2,
      },
    });

    expect(result.status).toBe("ok");
    expect(result.principal_view).toEqual({ summary: "profile summary" });
    expect(repo.dispatchEvents).toHaveLength(1);
  });

  it("rejects invalid input and call-limit violations", async () => {
    const { repo, audit, advertisement } = await setup();
    const base = {
      request_id: "request-1",
      run_id: "run-1",
      turn_id: "turn-1",
      side: "seeker" as const,
      principal_id: "agent-1",
      principal_scopes: ["tool.dispatch"],
      contract_ref: { id: "contract", version: "1.0.0" },
      surface_ref: { id: "seeker-tools", version: "1.0.0" },
      tool_ref: { name: "lookup_profile", version: "1.0.0" },
      input: {},
      call_index: 0,
      max_tool_calls_per_turn: 2,
    };

    const invalid = await dispatchTool({
      repository: repo,
      adapters: registryWithLookupAdapter(),
      auditStore: audit,
      advertisement,
      request: base,
    });
    expect(invalid.reason_code).toBe("tool_input_schema_invalid");
    const limited = await dispatchTool({
      repository: repo,
      adapters: registryWithLookupAdapter(),
      auditStore: audit,
      advertisement,
      request: { ...base, input: { ticket_id: "ticket-1" }, call_index: 2 },
    });
    expect(limited.reason_code).toBe("tool_call_limit_exceeded");
  });
});

async function setup() {
  const repo = new MemoryToolRepository();
  const audit = new MemoryCanonicalAuditStore();
  await publishToolDescriptor(repo, audit, {
    ...descriptorMaterial(),
    operator: operator(),
    reasonCode: "initial_launch",
    correlationId: "corr-descriptor",
  });
  await publishToolSurface(repo, audit, {
    ...surfaceMaterial(),
    operator: operator(),
    reasonCode: "initial_launch",
    correlationId: "corr-surface",
  });
  const resolved = await resolveToolSurfaceForDispatch(repo, registryWithLookupAdapter(), {
    runId: "run-1",
    side: "seeker",
    contractRef: { id: "contract", version: "1.0.0" },
    surfaceRef: { id: "seeker-tools", version: "1.0.0" },
  });
  if (!resolved.advertisement) throw new Error("advertisement missing");
  return { repo, audit, advertisement: resolved.advertisement };
}
