import { strict as assert } from "node:assert";

import { ToolAdapterRegistry } from "../src/adapter-registry.js";
import { dispatchTool } from "../src/dispatcher.js";
import { publishToolDescriptor, publishToolSurface } from "../src/publish.js";
import { resolveToolSurfaceForDispatch } from "../src/resolver.js";
import {
  MemoryCanonicalAuditStore,
  MemoryToolRepository,
  operator,
} from "../src/__tests__/fixtures.js";

const repo = new MemoryToolRepository();
const audit = new MemoryCanonicalAuditStore();
const registry = new ToolAdapterRegistry();
registry.register({
  adapter_ref: "lookup_profile.adapter.v1",
  tool_ref: { name: "lookup_profile", version: "1.0.0" },
  invoke: () => ({ summary: "profile summary" }),
});
registry.register({
  adapter_ref: "summarize_counterparty_context.adapter.v1",
  tool_ref: { name: "summarize_counterparty_context", version: "1.0.0" },
  invoke: () => ({ summary: "raw counterparty context" }),
});
registry.register({
  adapter_ref: "read_public_policy.adapter.v1",
  tool_ref: { name: "read_public_policy", version: "1.0.0" },
  invoke: () => ({ summary: "public policy" }),
});

for (const descriptor of [
  ["lookup_profile", "principal_self"],
  ["summarize_counterparty_context", "counterparty_filtered"],
  ["read_public_policy", "platform_open"],
] as const) {
  await publishToolDescriptor(repo, audit, {
    name: descriptor[0],
    version: "1.0.0",
    input_schema: { type: "object", required: ["ticket_id"] },
    output_schema: { type: "object", required: ["summary"] },
    disclosure_class: descriptor[1],
    adapter_ref: `${descriptor[0]}.adapter.v1`,
    description: `${descriptor[0]} staged descriptor.`,
    operator: operator(),
    reasonCode: "initial_launch",
    correlationId: `corr-${descriptor[0]}`,
  });
}

await publishToolSurface(repo, audit, {
  surface_id: "seeker-tools",
  version: "1.0.0",
  side_scope: "seeker",
  description: "F08.5 staged seeker tools.",
  descriptor_refs: [
    { name: "lookup_profile", version: "1.0.0", required: true, advertisement_order: 0 },
    {
      name: "summarize_counterparty_context",
      version: "1.0.0",
      required: true,
      advertisement_order: 1,
    },
    { name: "read_public_policy", version: "1.0.0", required: true, advertisement_order: 2 },
  ],
  operator: operator(),
  reasonCode: "initial_launch",
  correlationId: "corr-surface",
});

const resolved = await resolveToolSurfaceForDispatch(repo, registry, {
  runId: "run-f08-5",
  side: "seeker",
  contractRef: { id: "seeker-contract", version: "1.0.0" },
  surfaceRef: { id: "seeker-tools", version: "1.0.0" },
});
assert.equal(resolved.decision, "allow");
assert.equal(resolved.advertisement?.descriptors.length, 3);
if (!resolved.advertisement) throw new Error("advertisement missing");

const supported = await dispatchTool({
  repository: repo,
  adapters: registry,
  auditStore: audit,
  advertisement: resolved.advertisement,
  request: request("lookup_profile", 0),
});
assert.equal(supported.status, "ok");

const unsupported = await dispatchTool({
  repository: repo,
  adapters: registry,
  auditStore: audit,
  advertisement: resolved.advertisement,
  request: request("not_advertised", 1),
});
assert.equal(unsupported.status, "tool_unsupported");
assert.equal(unsupported.continue_turn, true);

const filtered = await dispatchTool({
  repository: repo,
  adapters: registry,
  auditStore: audit,
  advertisement: resolved.advertisement,
  request: request("summarize_counterparty_context", 2),
});
assert.equal(filtered.status, "filtered_pending");
assert.equal(repo.routing.at(-1)?.route, "failed_closed");

console.log(
  JSON.stringify(
    {
      surface: resolved.advertisement.surface_ref,
      descriptors: resolved.advertisement.descriptors.length,
      supported: supported.status,
      unsupported: unsupported.status,
      filtered: filtered.status,
      dispatch_events: repo.dispatchEvents.length,
      routing_events: repo.routing.length,
    },
    null,
    2,
  ),
);

function request(name: string, callIndex: number) {
  return {
    request_id: `request-${name}`,
    run_id: "run-f08-5",
    turn_id: "turn-1",
    side: "seeker" as const,
    principal_id: "agent-1",
    principal_scopes: ["tool.dispatch"],
    contract_ref: { id: "seeker-contract", version: "1.0.0" },
    surface_ref: { id: "seeker-tools", version: "1.0.0" },
    tool_ref: { name, version: "1.0.0" },
    input: { ticket_id: "ticket-1" },
    call_index: callIndex,
    max_tool_calls_per_turn: 4,
  };
}
