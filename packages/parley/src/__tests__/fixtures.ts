import type {
  AgentContractEvent,
  AgentContractEventQuery,
  AgentContractRepository,
  AgentContractVersion,
  AgentContractVersionQuery,
  ContractRef,
  NewAgentContractEvent,
  NewAgentContractVersion,
} from "@spyglass/agent-contracts";
import type {
  BiasTestArtifact,
  BiasTestArtifactQuery,
  NewBiasTestArtifact,
  NewRubricDispatchGateEvent,
  NewRubricEvent,
  NewRubricVersion,
  RubricDispatchGateEvent,
  RubricDispatchGateEventQuery,
  RubricEvent,
  RubricEventQuery,
  RubricRef,
  RubricRepository,
  RubricVersion,
  RubricVersionQuery,
} from "@spyglass/rubrics";
import type {
  DisclosureRoutingEvidence,
  DispatcherBypassFinding,
  NewDisclosureRoutingEvidence,
  NewDispatcherBypassFinding,
  NewToolDescriptorVersion,
  NewToolDispatchEvent,
  NewToolSurfaceEvent,
  NewToolSurfaceVersion,
  ToolDescriptorVersion,
  ToolDispatchEvent,
  ToolDispatchEventQuery,
  ToolRepository,
  ToolSurfaceEvent,
  ToolSurfaceQuery,
  ToolSurfaceRef,
  ToolSurfaceVersion,
  VersionedToolRef,
} from "@spyglass/tool-dispatcher";

export const fixedDate = new Date("2026-05-21T12:00:00.000Z");

export function testContract(input: {
  readonly contract_id: string;
  readonly side: "seeker" | "employer";
  readonly rubric_id: string;
  readonly tool_surface_id: string;
  readonly max_rounds?: number;
}): AgentContractVersion {
  return {
    agent_contract_version_id: `${input.contract_id}-v1`,
    contract_id: input.contract_id,
    version: "1.0.0",
    side: input.side,
    status: "published",
    prompt_template_ref: { id: `${input.side}-prompt`, version: "1.0.0" },
    rubric_ref: { id: input.rubric_id, version: "1.0.0" },
    tool_surface_ref: { id: input.tool_surface_id, version: "1.0.0" },
    model_ref: { provider: "fixture", model_id: "deterministic", version: "1" },
    runtime_settings: { max_rounds: input.max_rounds ?? 2, max_tool_calls_per_turn: 2 },
    extension_fields: {},
    content_hash: `${input.contract_id}-hash`,
    description: "fixture contract",
    author_principal_id: "author",
    reviewer_principal_id: "reviewer",
    published_at: fixedDate,
    deprecated_after: null,
    audit_event_id: null,
    created_at: fixedDate,
  };
}

export function testRubric(input: {
  readonly rubric_id: string;
  readonly side: "seeker" | "employer";
  readonly withBias?: boolean;
}): RubricVersion {
  return {
    rubric_version_id: `${input.rubric_id}-v1`,
    rubric_id: input.rubric_id,
    version: "1.0.0",
    side: input.side,
    status: "published",
    dimensions: [
      {
        dimension_id: "fit",
        label: "Fit",
        description: "Overall fit",
        min_score: 1,
        max_score: 9,
        weight: 1,
        required: true,
      },
      {
        dimension_id: "timing",
        label: "Timing",
        description: "Timing alignment",
        min_score: 1,
        max_score: 9,
        weight: 1,
        required: true,
      },
    ],
    aggregation_policy: {
      kind: "weighted_sum",
      weight_normalization: "sum_to_one",
      rounding: "half_away_from_zero_4dp",
    },
    bias_test_ref:
      input.withBias === false ? null : { bias_test_artifact_id: `${input.rubric_id}-bias` },
    content_hash: `${input.rubric_id}-hash`,
    description: "fixture rubric",
    author_principal_id: "author",
    reviewer_principal_id: "reviewer",
    published_at: fixedDate,
    deprecated_after: null,
    audit_event_id: null,
    created_at: fixedDate,
  };
}

export function testBiasArtifact(rubric: RubricVersion): BiasTestArtifact {
  return {
    bias_test_artifact_id: `${rubric.rubric_id}-bias`,
    rubric_id: rubric.rubric_id,
    rubric_version: rubric.version,
    rubric_content_hash: rubric.content_hash,
    methodology_ref: { methodology_id: "fixture", version: "1" },
    status: "completed",
    jurisdiction_coverage: ["US"],
    reviewer_principal_id: "reviewer",
    completed_at: fixedDate,
    expires_at: null,
    artifact_uri: null,
    audit_event_id: null,
    created_at: fixedDate,
  };
}

export function testDescriptor(name = "lookup_profile"): ToolDescriptorVersion {
  return {
    tool_descriptor_id: `${name}-v1`,
    name,
    version: "1.0.0",
    input_schema: { type: "object" },
    output_schema: { type: "object" },
    disclosure_class: "platform_open",
    adapter_ref: `${name}-adapter`,
    status: "published",
    description: "Fixture tool.",
    content_hash: `${name}-hash`,
    audit_event_id: null,
    published_at: fixedDate,
    deprecated_at: null,
    created_at: fixedDate,
  };
}

export function testSurface(id: string, descriptor = testDescriptor()): ToolSurfaceVersion {
  return {
    tool_surface_version_id: `${id}-v1`,
    surface_id: id,
    version: "1.0.0",
    side_scope: "both",
    status: "published",
    description: "Fixture surface",
    descriptor_refs: [
      {
        name: descriptor.name,
        version: descriptor.version,
        required: false,
        advertisement_order: 0,
      },
    ],
    content_hash: `${id}-hash`,
    audit_event_id: null,
    published_at: fixedDate,
    deprecated_at: null,
    created_at: fixedDate,
  };
}

export class MemoryContractRepo implements AgentContractRepository {
  readonly contracts = new Map<string, AgentContractVersion>();
  constructor(contracts: readonly AgentContractVersion[]) {
    contracts.forEach((contract) => this.contracts.set(contractKey(contract), contract));
  }
  async getContractVersion(ref: ContractRef) {
    return this.contracts.get(`${ref.contract_id}@${ref.version}`) ?? null;
  }
  async insertContractVersion(input: NewAgentContractVersion) {
    const contract = { ...input, agent_contract_version_id: "inserted", created_at: fixedDate };
    this.contracts.set(contractKey(contract), contract);
    return contract;
  }
  async updateContractDeprecatedAfter(): Promise<AgentContractVersion> {
    throw new Error("not implemented");
  }
  async appendContractEvent(input: NewAgentContractEvent): Promise<AgentContractEvent> {
    return { ...input, agent_contract_event_id: "event", created_at: fixedDate };
  }
  async listContractVersions(_query: AgentContractVersionQuery) {
    return [...this.contracts.values()];
  }
  async listContractEvents(
    _query: AgentContractEventQuery,
  ): Promise<readonly AgentContractEvent[]> {
    return [];
  }
}

export class MemoryRubricRepo implements RubricRepository {
  readonly rubrics = new Map<string, RubricVersion>();
  readonly artifacts = new Map<string, BiasTestArtifact>();
  constructor(rubrics: readonly RubricVersion[]) {
    rubrics.forEach((rubric) => {
      this.rubrics.set(`${rubric.rubric_id}@${rubric.version}`, rubric);
      if (rubric.bias_test_ref) {
        this.artifacts.set(rubric.bias_test_ref.bias_test_artifact_id, testBiasArtifact(rubric));
      }
    });
  }
  async getRubricVersion(ref: RubricRef) {
    return this.rubrics.get(`${ref.rubric_id}@${ref.version}`) ?? null;
  }
  async getBiasTestArtifact(artifactId: string) {
    return this.artifacts.get(artifactId) ?? null;
  }
  async insertRubricVersion(input: NewRubricVersion) {
    const rubric = { ...input, rubric_version_id: "inserted", created_at: fixedDate };
    this.rubrics.set(`${rubric.rubric_id}@${rubric.version}`, rubric);
    return rubric;
  }
  async updateRubricBiasTestRef(): Promise<RubricVersion> {
    throw new Error("not implemented");
  }
  async updateRubricDeprecatedAfter(): Promise<RubricVersion> {
    throw new Error("not implemented");
  }
  async appendRubricEvent(input: NewRubricEvent): Promise<RubricEvent> {
    return { ...input, rubric_event_id: "event", created_at: fixedDate };
  }
  async insertBiasTestArtifact(input: NewBiasTestArtifact): Promise<BiasTestArtifact> {
    this.artifacts.set(input.bias_test_artifact_id, { ...input, created_at: fixedDate });
    return { ...input, created_at: fixedDate };
  }
  async appendDispatchGateEvent(
    input: NewRubricDispatchGateEvent,
  ): Promise<RubricDispatchGateEvent> {
    return { ...input, gate_event_id: input.gate_event_id ?? "gate", created_at: fixedDate };
  }
  async listRubricVersions(_query: RubricVersionQuery) {
    return [...this.rubrics.values()];
  }
  async listBiasTestArtifacts(_query: BiasTestArtifactQuery) {
    return [...this.artifacts.values()];
  }
  async listRubricEvents(_query: RubricEventQuery): Promise<readonly RubricEvent[]> {
    return [];
  }
  async listDispatchGateEvents(
    _query: RubricDispatchGateEventQuery,
  ): Promise<readonly RubricDispatchGateEvent[]> {
    return [];
  }
}

export class MemoryToolRepo implements ToolRepository {
  readonly descriptors = new Map<string, ToolDescriptorVersion>();
  readonly surfaces = new Map<string, ToolSurfaceVersion>();
  constructor(
    surfaces: readonly ToolSurfaceVersion[],
    descriptors: readonly ToolDescriptorVersion[],
  ) {
    surfaces.forEach((surface) =>
      this.surfaces.set(`${surface.surface_id}@${surface.version}`, surface),
    );
    descriptors.forEach((descriptor) =>
      this.descriptors.set(`${descriptor.name}@${descriptor.version}`, descriptor),
    );
  }
  async getDescriptor(ref: VersionedToolRef) {
    return this.descriptors.get(`${ref.name}@${ref.version}`) ?? null;
  }
  async getSurface(ref: ToolSurfaceRef) {
    return this.surfaces.get(`${ref.id}@${ref.version}`) ?? null;
  }
  async insertDescriptor(input: NewToolDescriptorVersion) {
    const descriptor = { ...input, tool_descriptor_id: "inserted", created_at: fixedDate };
    this.descriptors.set(`${descriptor.name}@${descriptor.version}`, descriptor);
    return descriptor;
  }
  async insertSurface(input: NewToolSurfaceVersion) {
    const surface = { ...input, tool_surface_version_id: "inserted", created_at: fixedDate };
    this.surfaces.set(`${surface.surface_id}@${surface.version}`, surface);
    return surface;
  }
  async updateDescriptorDeprecated(): Promise<ToolDescriptorVersion> {
    throw new Error("not implemented");
  }
  async updateSurfaceDeprecated(): Promise<ToolSurfaceVersion> {
    throw new Error("not implemented");
  }
  async appendToolSurfaceEvent(input: NewToolSurfaceEvent): Promise<ToolSurfaceEvent> {
    return { ...input, tool_surface_event_id: "event", created_at: fixedDate };
  }
  async appendToolDispatchEvent(input: NewToolDispatchEvent): Promise<ToolDispatchEvent> {
    return { ...input, tool_dispatch_event_id: "dispatch", created_at: fixedDate };
  }
  async appendDisclosureRoutingEvidence(
    input: NewDisclosureRoutingEvidence,
  ): Promise<DisclosureRoutingEvidence> {
    return { ...input, routing_id: "routing", created_at: fixedDate };
  }
  async appendBypassFinding(input: NewDispatcherBypassFinding): Promise<DispatcherBypassFinding> {
    return { ...input, finding_id: "finding", created_at: fixedDate };
  }
  async listSurfaces(_query: ToolSurfaceQuery) {
    return [...this.surfaces.values()];
  }
  async listDispatchEvents(_query: ToolDispatchEventQuery): Promise<readonly ToolDispatchEvent[]> {
    return [];
  }
  async listDisclosureRoutingEvidence(): Promise<readonly DisclosureRoutingEvidence[]> {
    return [];
  }
  async listBypassFindings(): Promise<readonly DispatcherBypassFinding[]> {
    return [];
  }
}

function contractKey(contract: { readonly contract_id: string; readonly version: string }): string {
  return `${contract.contract_id}@${contract.version}`;
}
