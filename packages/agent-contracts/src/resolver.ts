import type { AgentContractRepository } from "./repo.js";
import type {
  AgentContractRuntimeSettings,
  AgentContractVersion,
  ContractRef,
  ContractResolution,
  ContractResolutionReasonCode,
  DependencyResult,
  ModelRef,
  RuntimeClamp,
  VersionedRef,
} from "./types.js";

export interface ContractDependencyChecker {
  readonly checkPromptTemplate?: (ref: VersionedRef) => Promise<DependencyResult>;
  readonly checkRubric?: (ref: VersionedRef) => Promise<DependencyResult>;
  readonly checkToolSurface?: (ref: VersionedRef) => Promise<DependencyResult>;
  readonly checkModel?: (ref: ModelRef) => Promise<DependencyResult>;
}

export interface ResolveContractOptions {
  readonly now?: Date;
  readonly runtimeCeilings?: AgentContractRuntimeSettings;
  readonly dependencyResults?: readonly DependencyResult[];
  readonly dependencyChecker?: ContractDependencyChecker;
}

export async function resolveContractForDispatch(
  repository: AgentContractRepository,
  ref: ContractRef,
  options: ResolveContractOptions = {},
): Promise<ContractResolution> {
  const contract = await repository.getContractVersion(ref);
  if (!contract) return denied(ref, "missing_contract", []);

  const now = options.now ?? new Date();
  if (contract.deprecated_after && contract.deprecated_after <= now) {
    return denied(
      ref,
      "contract_deprecated",
      options.dependencyResults ?? [],
      contract.runtime_settings,
    );
  }

  const dependencyResults =
    options.dependencyResults ??
    (await checkContractDependencies(contract, options.dependencyChecker));
  const dependencyFailure = firstDependencyFailure(dependencyResults);
  const { settings, clamps } = applyRuntimeCeilings(
    contract.runtime_settings,
    options.runtimeCeilings ?? {},
  );

  if (dependencyFailure) {
    return {
      decision: "deny",
      reason_code: dependencyFailure,
      contract_ref: ref,
      contract,
      effective_runtime_settings: settings,
      runtime_clamps: clamps,
      dependency_results: dependencyResults,
    };
  }

  return {
    decision: "allow",
    reason_code: "contract_resolved",
    contract_ref: ref,
    contract,
    effective_runtime_settings: settings,
    runtime_clamps: clamps,
    dependency_results: dependencyResults,
  };
}

async function checkContractDependencies(
  contract: AgentContractVersion,
  checker: ContractDependencyChecker | undefined,
): Promise<readonly DependencyResult[]> {
  if (!checker) return [];

  const results: DependencyResult[] = [];
  if (checker.checkPromptTemplate) {
    results.push(await checker.checkPromptTemplate(contract.prompt_template_ref));
  }
  if (checker.checkRubric) {
    results.push(await checker.checkRubric(contract.rubric_ref));
  }
  if (checker.checkToolSurface) {
    results.push(await checker.checkToolSurface(contract.tool_surface_ref));
  }
  if (checker.checkModel) {
    results.push(await checker.checkModel(contract.model_ref));
  }
  return results;
}

function denied(
  ref: ContractRef,
  reasonCode: ContractResolutionReasonCode,
  dependencyResults: readonly DependencyResult[],
  runtimeSettings: AgentContractRuntimeSettings = {},
): ContractResolution {
  return {
    decision: "deny",
    reason_code: reasonCode,
    contract_ref: ref,
    contract: null,
    effective_runtime_settings: runtimeSettings,
    runtime_clamps: [],
    dependency_results: dependencyResults,
  };
}

function firstDependencyFailure(
  dependencyResults: readonly DependencyResult[],
): ContractResolutionReasonCode | null {
  for (const result of dependencyResults) {
    if (result.status === "available") continue;
    if (result.kind === "prompt_template") return "prompt_template_unresolvable";
    if (result.kind === "rubric" && result.status === "missing_bias_test") {
      return "rubric_missing_bias_test";
    }
    if (result.kind === "rubric") return "rubric_unresolvable";
    if (result.kind === "tool_surface") return "tool_version_unavailable";
    if (result.kind === "model") return "model_unavailable";
  }
  return null;
}

function applyRuntimeCeilings(
  settings: AgentContractRuntimeSettings,
  ceilings: AgentContractRuntimeSettings,
): { readonly settings: AgentContractRuntimeSettings; readonly clamps: readonly RuntimeClamp[] } {
  const effective: Record<string, number> = {};
  const clamps: RuntimeClamp[] = [];

  for (const field of ["max_rounds", "timeout_ms", "max_tool_calls_per_turn"] as const) {
    const requested = settings[field];
    if (requested === undefined) continue;
    const ceiling = ceilings[field];
    const value = ceiling === undefined ? requested : Math.min(requested, ceiling);
    effective[field] = value;
    if (value !== requested) clamps.push({ field, requested, effective: value });
  }

  return { settings: effective, clamps };
}
