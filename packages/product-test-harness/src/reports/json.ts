import type { ScenarioRunResult } from "../contracts.js";
import { assertValidRunResult } from "../validation.js";

export function renderJsonReport(result: ScenarioRunResult): string {
  assertValidRunResult(result);
  return JSON.stringify(result, null, 2);
}
