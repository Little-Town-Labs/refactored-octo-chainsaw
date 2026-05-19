// F04 T014 — Audit-event payload-shape helper.
//
// Loads the JSON Schema contract from
// `.specify/specs/04-ticket-store-state-machines/contracts/transition-event.schema.yaml`,
// compiles it with ajv (draft 2020-12 + format validators), and
// exports a single assertion `assertValidTransitionEvent(event)` that
// throws on validation failure with a readable error path.
//
// Used by B5's repo tests (T019/T021/T023) and by T025's cross-cut
// shape test. Ships RED-friendly: this helper compiles + runs even
// before any emitter exists, since it is purely a validator.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { load as loadYaml } from "js-yaml";

const SCHEMA_PATH = resolve(
  process.cwd(),
  "../../.specify/specs/04-ticket-store-state-machines/contracts/transition-event.schema.yaml",
);

let cachedValidate: ReturnType<Ajv2020["compile"]> | null = null;

function getValidator(): ReturnType<Ajv2020["compile"]> {
  if (cachedValidate) return cachedValidate;

  const yamlText = readFileSync(SCHEMA_PATH, "utf8");
  const schema = loadYaml(yamlText) as object;

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  cachedValidate = ajv.compile(schema);
  return cachedValidate;
}

export class AuditShapeError extends Error {
  readonly errors: unknown;
  constructor(message: string, errors: unknown) {
    super(message);
    this.name = "AuditShapeError";
    this.errors = errors;
  }
}

/**
 * Throws `AuditShapeError` if `event` does not validate against the
 * `spyglass/ticket-transition-event.v1` schema. Returns void otherwise.
 */
export function assertValidTransitionEvent(event: unknown): void {
  const validate = getValidator();
  const ok = validate(event);
  if (!ok) {
    const detail = (validate.errors ?? [])
      .map((e) => `${e.instancePath || "(root)"} ${e.message}`)
      .join("; ");
    throw new AuditShapeError(`audit event failed schema validation: ${detail}`, validate.errors);
  }
}
