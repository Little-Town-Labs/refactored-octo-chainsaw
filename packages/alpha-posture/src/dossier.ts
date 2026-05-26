import {
  ALPHA_BANNER,
  ALPHA_PHASE,
  DEFAULT_ALPHA_POSTURE_VERSION,
  type AlphaDossierPosture,
  type AlphaPosturedPayload,
  type AlphaPostureGateResult,
} from "./types.js";

export function alphaDossierPosture(appliedAt: string): AlphaDossierPosture {
  return {
    phase: ALPHA_PHASE,
    banner: ALPHA_BANNER,
    posture_version: DEFAULT_ALPHA_POSTURE_VERSION,
    non_production_decision: true,
    applied_at: appliedAt,
  };
}

export function applyAlphaDossierPosture<T extends Record<string, unknown>>(
  payload: T,
  appliedAt = new Date().toISOString(),
): AlphaPosturedPayload<T> {
  if (hasAlphaDossierPosture(payload)) return payload as AlphaPosturedPayload<T>;
  return { ...payload, alpha_posture: alphaDossierPosture(appliedAt) };
}

export function hasAlphaDossierPosture(payload: Record<string, unknown>): boolean {
  const posture = payload.alpha_posture as Partial<AlphaDossierPosture> | undefined;
  return (
    posture?.phase === ALPHA_PHASE &&
    posture.banner === ALPHA_BANNER &&
    posture.non_production_decision === true &&
    typeof posture.posture_version === "string"
  );
}

export function evaluateDossierPosture(
  payload: Record<string, unknown>,
  checkedAt = new Date().toISOString(),
): AlphaPostureGateResult {
  if (!hasAlphaDossierPosture(payload)) {
    return { decision: "block", reason_code: "missing_dossier_posture", checked_at: checkedAt };
  }
  return { decision: "allow", reason_code: "alpha_posture_allowed", checked_at: checkedAt };
}
