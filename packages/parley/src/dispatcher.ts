import {
  type AgentContractRepository,
  resolveContractForDispatch,
} from "@spyglass/agent-contracts";
import { resolveRubricForDispatch, type RubricRepository } from "@spyglass/rubrics";
import type { ToolRepository, ToolSurfaceVersion } from "@spyglass/tool-dispatcher";

import { defaultParleyConfig, effectiveRoundCap } from "./config.js";
import type { ParleyRunRepository } from "./repo.js";
import { assertNoHumanInputToolSemantics } from "./tool-scan.js";
import type {
  FrozenParleyRefs,
  ParleyConfig,
  ParleyDispatchRequest,
  ParleyRun,
  ParleyTerminalEvent,
  ToolSurfaceResolution,
} from "./types.js";

export interface DispatchParleyOptions {
  readonly request: ParleyDispatchRequest;
  readonly runRepository: ParleyRunRepository;
  readonly contractRepository: AgentContractRepository;
  readonly rubricRepository: RubricRepository;
  readonly toolRepository: ToolRepository;
  readonly config?: Partial<ParleyConfig>;
  readonly now?: Date;
}

export type DispatchParleyResult =
  | {
      readonly decision: "allow";
      readonly run: ParleyRun;
      readonly frozen_refs: FrozenParleyRefs;
      readonly emitted_event: "negotiation.dispatch.requested";
    }
  | {
      readonly decision: "deny";
      readonly reason_code: string;
      readonly terminal_event: ParleyTerminalEvent;
    };

export async function dispatchParley(
  options: DispatchParleyOptions,
): Promise<DispatchParleyResult> {
  const config = defaultParleyConfig(options.config);
  const rubricGateOptions = {
    production: true,
    correlationId: options.request.correlation_id,
    principalId: "parley-dispatcher",
    ...(options.now ? { now: options.now } : {}),
  };
  const common = {
    ...(options.now ? { now: options.now } : {}),
    ...(config.runtime_ceilings ? { runtimeCeilings: config.runtime_ceilings } : {}),
    dependencyChecker: {
      checkRubric: async (ref: { readonly id: string; readonly version: string }) => {
        const result = await resolveRubricForDispatch(
          options.rubricRepository,
          { rubric_id: ref.id, version: ref.version },
          rubricGateOptions,
        );
        if (result.decision === "allow") {
          return { kind: "rubric" as const, status: "available" as const, ref: { ...ref } };
        }
        if (result.reason_code === "rubric_missing_bias_test") {
          return {
            kind: "rubric" as const,
            status: "missing_bias_test" as const,
            ref: { ...ref },
          };
        }
        return { kind: "rubric" as const, status: "unavailable" as const, ref: { ...ref } };
      },
      checkToolSurface: async (ref: { readonly id: string; readonly version: string }) => {
        const surface = await options.toolRepository.getSurface(ref);
        return {
          kind: "tool_surface" as const,
          status:
            surface?.status === "published" ? ("available" as const) : ("unavailable" as const),
          ref,
        };
      },
    },
  };
  const [seekerResolution, employerResolution] = await Promise.all([
    resolveContractForDispatch(
      options.contractRepository,
      options.request.seeker_contract_ref,
      common,
    ),
    resolveContractForDispatch(
      options.contractRepository,
      options.request.employer_contract_ref,
      common,
    ),
  ]);

  const denied = [seekerResolution, employerResolution].find(
    (resolution) => resolution.decision === "deny",
  );
  if (denied || !seekerResolution.contract || !employerResolution.contract) {
    return deny(options, denied?.reason_code ?? "missing_contract");
  }

  let seekerTools: ToolSurfaceResolution;
  let employerTools: ToolSurfaceResolution;
  const [seekerRubric, employerRubric] = await Promise.all([
    options.rubricRepository.getRubricVersion({
      rubric_id: seekerResolution.contract.rubric_ref.id,
      version: seekerResolution.contract.rubric_ref.version,
    }),
    options.rubricRepository.getRubricVersion({
      rubric_id: employerResolution.contract.rubric_ref.id,
      version: employerResolution.contract.rubric_ref.version,
    }),
  ]);
  try {
    [seekerTools, employerTools] = await Promise.all([
      resolveToolSurface(options.toolRepository, seekerResolution.contract.tool_surface_ref),
      resolveToolSurface(options.toolRepository, employerResolution.contract.tool_surface_ref),
    ]);
  } catch {
    return deny(options, "tool_version_unavailable");
  }
  if (!seekerRubric || !employerRubric) return deny(options, "rubric_unresolvable");

  try {
    assertNoHumanInputToolSemantics([...seekerTools.descriptors, ...employerTools.descriptors]);
  } catch {
    return deny(options, "tool_human_input_semantics");
  }

  const run = await options.runRepository.claimRun({
    run_id: options.request.correlation_id,
    match_ticket_id: options.request.match_ticket_id,
    match_ticket_identifier: options.request.match_ticket_identifier,
    attempt: options.request.attempt,
    round_cap: effectiveRoundCap({
      defaultRoundCap: config.default_round_cap,
      seekerSettings: seekerResolution.effective_runtime_settings,
      employerSettings: employerResolution.effective_runtime_settings,
    }),
    seeker_contract_ref: options.request.seeker_contract_ref,
    employer_contract_ref: options.request.employer_contract_ref,
    privacy_ruleset_ref: options.request.privacy_ruleset_ref,
    harness_version: config.harness_version,
    ...(options.now ? { now: options.now } : {}),
  });

  return {
    decision: "allow",
    run,
    frozen_refs: {
      seeker_contract: seekerResolution.contract,
      employer_contract: employerResolution.contract,
      seeker_rubric: seekerRubric,
      employer_rubric: employerRubric,
      seeker_tools: seekerTools.descriptors,
      employer_tools: employerTools.descriptors,
    },
    emitted_event: "negotiation.dispatch.requested",
  };
}

async function resolveToolSurface(
  repository: ToolRepository,
  ref: { readonly id: string; readonly version: string },
): Promise<ToolSurfaceResolution> {
  const surface = await repository.getSurface(ref);
  if (!surface || surface.status !== "published") throw new Error("tool_surface_unavailable");
  return {
    ref,
    descriptors: await descriptorsForSurface(repository, surface),
  };
}

async function descriptorsForSurface(repository: ToolRepository, surface: ToolSurfaceVersion) {
  const descriptors = await Promise.all(
    surface.descriptor_refs.map((ref) =>
      repository.getDescriptor({ name: ref.name, version: ref.version }),
    ),
  );
  if (descriptors.some((descriptor) => !descriptor)) {
    throw new Error("tool_descriptor_unavailable");
  }
  return descriptors as readonly NonNullable<(typeof descriptors)[number]>[];
}

async function deny(
  options: DispatchParleyOptions,
  reasonCode: string,
): Promise<DispatchParleyResult> {
  const terminal: ParleyTerminalEvent = {
    event_name: "negotiation.run.terminated",
    event_version: 1,
    run_id: options.request.correlation_id,
    match_ticket_id: options.request.match_ticket_id,
    terminal_state: "dispatch_refused",
    reason_code: reasonCode,
  };
  return { decision: "deny", reason_code: reasonCode, terminal_event: terminal };
}
