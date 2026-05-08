// F02 T033 — Operator role registry (FR-32).
//
// The three operator scopes that gate the operator console. Declared
// at module load so the scope registry knows about them before any
// route consults `requireScope`. Adding a new operator scope is one
// `declareScope` call; F02 does not need to be modified to extend
// the registry (FR-31).
//
// Operator roles are assigned outside Clerk via Spyglass-side
// configuration (FR-9 / FR-32) — only operators with the relevant
// scope on their session may invoke the corresponding action.

import { declareScope, type Scope } from "./scopes.js";

/** Read-only access to the seeker dossier surface. */
export const OPERATOR_DOSSIER_VIEWER: Scope = declareScope(
  "operator.dossier_viewer",
  "Read-only access to seeker dossiers from the operator console (FR-32).",
);

/** Authority to vote on policy-gate transitions in the operator review queue. */
export const OPERATOR_POLICY_GATE: Scope = declareScope(
  "operator.policy_gate_operator",
  "Vote on policy-gate transitions in the operator review queue (FR-32).",
);

/** Authority to issue agent and service credentials. */
export const OPERATOR_CREDENTIAL_ISSUER: Scope = declareScope(
  "operator.credential_issuer",
  "Issue agent and service credentials from the operator console (FR-32).",
);

/** Stable list for documentation, audit, and snapshot tests. */
export const OPERATOR_SCOPES: ReadonlyArray<Scope> = [
  OPERATOR_DOSSIER_VIEWER,
  OPERATOR_POLICY_GATE,
  OPERATOR_CREDENTIAL_ISSUER,
];
