import type {
  BiasTestArtifactQuery,
  RubricDispatchGateEventQuery,
  RubricEventQuery,
  RubricRepository,
  RubricVersionQuery,
} from "./repo.js";
import { RUBRIC_READ_SCOPE, requireRubricScope, type ScopedPrincipal } from "./scopes.js";
import type {
  BiasTestArtifact,
  RubricDispatchGateEvent,
  RubricEvent,
  RubricVersion,
} from "./types.js";

const DEFAULT_REVIEW_LIMIT = 50;
const MAX_REVIEW_LIMIT = 200;

export interface ReadRubricVersionsInput {
  readonly principal: ScopedPrincipal;
  readonly rubricId?: string;
  readonly side?: RubricVersion["side"];
  readonly status?: RubricVersion["status"];
  readonly from?: Date;
  readonly until?: Date;
  readonly limit?: number;
}

export interface ReadBiasTestArtifactsInput {
  readonly principal: ScopedPrincipal;
  readonly rubricId?: string;
  readonly rubricVersion?: string;
  readonly status?: BiasTestArtifact["status"];
  readonly from?: Date;
  readonly until?: Date;
  readonly limit?: number;
}

export interface ReadRubricEventsInput {
  readonly principal: ScopedPrincipal;
  readonly rubricVersionId?: string;
  readonly principalId?: string;
  readonly from?: Date;
  readonly until?: Date;
  readonly limit?: number;
}

export interface ReadDispatchGateEventsInput {
  readonly principal: ScopedPrincipal;
  readonly rubricId?: string;
  readonly rubricVersion?: string;
  readonly reasonCode?: RubricDispatchGateEvent["reason_code"];
  readonly from?: Date;
  readonly until?: Date;
  readonly limit?: number;
}

export async function readRubricVersions(
  repository: RubricRepository,
  input: ReadRubricVersionsInput,
): Promise<readonly RubricVersion[]> {
  requireRubricScope(input.principal, RUBRIC_READ_SCOPE);
  return repository.listRubricVersions(toRubricVersionQuery(input));
}

export async function readBiasTestArtifacts(
  repository: RubricRepository,
  input: ReadBiasTestArtifactsInput,
): Promise<readonly BiasTestArtifact[]> {
  requireRubricScope(input.principal, RUBRIC_READ_SCOPE);
  return repository.listBiasTestArtifacts(toBiasTestQuery(input));
}

export async function readRubricEvents(
  repository: RubricRepository,
  input: ReadRubricEventsInput,
): Promise<readonly RubricEvent[]> {
  requireRubricScope(input.principal, RUBRIC_READ_SCOPE);
  return repository.listRubricEvents(toRubricEventQuery(input));
}

export async function readDispatchGateEvents(
  repository: RubricRepository,
  input: ReadDispatchGateEventsInput,
): Promise<readonly RubricDispatchGateEvent[]> {
  requireRubricScope(input.principal, RUBRIC_READ_SCOPE);
  return repository.listDispatchGateEvents(toDispatchGateQuery(input));
}

function toRubricVersionQuery(input: ReadRubricVersionsInput): RubricVersionQuery {
  return {
    ...(input.rubricId ? { rubricId: input.rubricId } : {}),
    ...(input.side ? { side: input.side } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.until ? { until: input.until } : {}),
    limit: clampLimit(input.limit),
  };
}

function toBiasTestQuery(input: ReadBiasTestArtifactsInput): BiasTestArtifactQuery {
  return {
    ...(input.rubricId ? { rubricId: input.rubricId } : {}),
    ...(input.rubricVersion ? { rubricVersion: input.rubricVersion } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.until ? { until: input.until } : {}),
    limit: clampLimit(input.limit),
  };
}

function toRubricEventQuery(input: ReadRubricEventsInput): RubricEventQuery {
  return {
    ...(input.rubricVersionId ? { rubricVersionId: input.rubricVersionId } : {}),
    ...(input.principalId ? { principalId: input.principalId } : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.until ? { until: input.until } : {}),
    limit: clampLimit(input.limit),
  };
}

function toDispatchGateQuery(input: ReadDispatchGateEventsInput): RubricDispatchGateEventQuery {
  return {
    ...(input.rubricId ? { rubricId: input.rubricId } : {}),
    ...(input.rubricVersion ? { rubricVersion: input.rubricVersion } : {}),
    ...(input.reasonCode ? { reasonCode: input.reasonCode } : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.until ? { until: input.until } : {}),
    limit: clampLimit(input.limit),
  };
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_REVIEW_LIMIT;
  if (!Number.isFinite(limit) || limit < 1) return DEFAULT_REVIEW_LIMIT;
  return Math.min(Math.floor(limit), MAX_REVIEW_LIMIT);
}
