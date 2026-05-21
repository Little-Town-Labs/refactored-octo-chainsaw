import type { AgentContractRuntimeSettings } from "@spyglass/agent-contracts";

import type { ParleyConfig } from "./types.js";

export const PARLEY_HARNESS_VERSION = "f08.0.0";
export const DEFAULT_ROUND_CAP = 3;

export function defaultParleyConfig(overrides: Partial<ParleyConfig> = {}): ParleyConfig {
  return {
    harness_version: overrides.harness_version ?? PARLEY_HARNESS_VERSION,
    default_round_cap: overrides.default_round_cap ?? DEFAULT_ROUND_CAP,
    ...(overrides.runtime_ceilings ? { runtime_ceilings: overrides.runtime_ceilings } : {}),
  };
}

export function effectiveRoundCap(input: {
  readonly defaultRoundCap?: number;
  readonly seekerSettings?: AgentContractRuntimeSettings;
  readonly employerSettings?: AgentContractRuntimeSettings;
}): number {
  const candidates = [
    input.defaultRoundCap ?? DEFAULT_ROUND_CAP,
    input.seekerSettings?.max_rounds,
    input.employerSettings?.max_rounds,
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const cap = Math.min(...candidates);
  if (cap < 1) throw new Error("round cap must be at least 1");
  return Math.floor(cap);
}
