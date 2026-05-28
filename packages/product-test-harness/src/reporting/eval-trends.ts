import type {
  ProductAgentInvocationRecord,
  ProductEvalTrendPoint,
  ProductEvalTrendSummary,
  ProductResultStoreSnapshot,
  RunStatus,
} from "../contracts.js";

export function extractProductEvalTrendPoints(
  snapshots: readonly ProductResultStoreSnapshot[],
): readonly ProductEvalTrendPoint[] {
  return snapshots.flatMap((snapshot) =>
    snapshot.agent_invocations.flatMap((record) => toTrendPoint(snapshot, record)),
  );
}

export function summarizeProductEvalTrends(
  points: readonly ProductEvalTrendPoint[],
): ProductEvalTrendSummary {
  const totalLatency = points.reduce((sum, point) => sum + point.latency_ms, 0);
  return {
    eval_run_count: points.length,
    passed_eval_run_count: points.filter((point) => point.status === "passed").length,
    failed_eval_run_count: points.filter((point) => point.status === "failed").length,
    total_cost_usd: roundUsd(points.reduce((sum, point) => sum + point.cost_usd, 0)),
    average_latency_ms: points.length > 0 ? Math.round(totalLatency / points.length) : 0,
    total_tokens: points.reduce((sum, point) => sum + point.total_tokens, 0),
    tool_refusal_count: points.reduce((sum, point) => sum + point.tool_refusal_count, 0),
    outcomes: countBy(points, (point) => point.outcome ?? "unknown"),
    providers: countBy(points, (point) => point.provider),
    models: countBy(points, (point) => point.model),
  };
}

function toTrendPoint(
  snapshot: ProductResultStoreSnapshot,
  record: ProductAgentInvocationRecord,
): readonly ProductEvalTrendPoint[] {
  const metadata = record.metadata;
  if (!metadata) return [];
  const provider = stringValue(metadata.provider);
  const model = stringValue(metadata.model);
  const latency = numberValue(metadata.latency_ms);
  const cost = numberValue(metadata.cost_usd);
  if (!provider || !model || latency === undefined || cost === undefined) return [];
  const modelVersion = stringValue(metadata.model_version);
  const outcome = stringValue(metadata.outcome);
  const evaluatorScore = numberValue(metadata.evaluator_score);

  return [
    {
      run_id: snapshot.run.run_id,
      scenario_id: record.scenario_id,
      created_at: snapshot.created_at,
      status: normalizeStatus(record.status),
      persona_id: record.persona_id ?? "unknown-persona",
      provider,
      model,
      ...(modelVersion ? { model_version: modelVersion } : {}),
      ...(outcome ? { outcome } : {}),
      latency_ms: latency,
      cost_usd: cost,
      total_tokens: totalTokens(metadata.usage),
      tool_refusal_count: toolRefusalCount(metadata.tool_traces),
      ...(evaluatorScore !== undefined ? { evaluator_score: evaluatorScore } : {}),
    },
  ];
}

function normalizeStatus(status: ProductAgentInvocationRecord["status"]): RunStatus {
  if (status === "passed" || status === "failed") return status;
  return "invalid";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function totalTokens(value: unknown): number {
  if (!isRecord(value)) return 0;
  return numberValue(value.total_tokens) ?? 0;
}

function toolRefusalCount(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.filter((entry) => isRecord(entry) && entry.decision === "refused").length;
}

function countBy<T>(
  values: readonly T[],
  key: (value: T) => string,
): Readonly<Record<string, number>> {
  return values.reduce<Record<string, number>>((counts, value) => {
    const current = key(value);
    counts[current] = (counts[current] ?? 0) + 1;
    return counts;
  }, {});
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function roundUsd(value: number): number {
  return Math.round(value * 10000) / 10000;
}
