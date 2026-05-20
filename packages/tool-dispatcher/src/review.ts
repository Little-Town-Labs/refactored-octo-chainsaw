import type { ToolDispatchEventQuery, ToolRepository, ToolSurfaceQuery } from "./repo.js";
import { TOOL_SURFACE_READ_SCOPE, requireToolScope, type ScopedPrincipal } from "./scopes.js";
import type {
  DisclosureRoutingEvidence,
  DispatcherBypassFinding,
  ToolDispatchEvent,
  ToolSurfaceVersion,
} from "./types.js";

const DEFAULT_REVIEW_LIMIT = 50;
const MAX_REVIEW_LIMIT = 200;

export interface ReadToolSurfacesInput {
  readonly principal: ScopedPrincipal;
  readonly surfaceId?: string;
  readonly status?: ToolSurfaceVersion["status"];
  readonly from?: Date;
  readonly until?: Date;
  readonly limit?: number;
}

export interface ReadToolDispatchEventsInput {
  readonly principal: ScopedPrincipal;
  readonly runId?: string;
  readonly reasonCode?: ToolDispatchEvent["reason_code"];
  readonly from?: Date;
  readonly until?: Date;
  readonly limit?: number;
}

export async function readToolSurfaces(
  repository: ToolRepository,
  input: ReadToolSurfacesInput,
): Promise<readonly ToolSurfaceVersion[]> {
  requireToolScope(input.principal, TOOL_SURFACE_READ_SCOPE);
  return repository.listSurfaces(toSurfaceQuery(input));
}

export async function readToolDispatchEvents(
  repository: ToolRepository,
  input: ReadToolDispatchEventsInput,
): Promise<readonly ToolDispatchEvent[]> {
  requireToolScope(input.principal, TOOL_SURFACE_READ_SCOPE);
  return repository.listDispatchEvents(toDispatchQuery(input));
}

export async function readDisclosureRoutingEvidence(
  repository: ToolRepository,
  principal: ScopedPrincipal,
  runId?: string,
): Promise<readonly DisclosureRoutingEvidence[]> {
  requireToolScope(principal, TOOL_SURFACE_READ_SCOPE);
  return repository.listDisclosureRoutingEvidence(runId);
}

export async function readDispatcherBypassFindings(
  repository: ToolRepository,
  principal: ScopedPrincipal,
): Promise<readonly DispatcherBypassFinding[]> {
  requireToolScope(principal, TOOL_SURFACE_READ_SCOPE);
  return repository.listBypassFindings();
}

function toSurfaceQuery(input: ReadToolSurfacesInput): ToolSurfaceQuery {
  return {
    ...(input.surfaceId ? { surfaceId: input.surfaceId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.until ? { until: input.until } : {}),
    limit: clampLimit(input.limit),
  };
}

function toDispatchQuery(input: ReadToolDispatchEventsInput): ToolDispatchEventQuery {
  return {
    ...(input.runId ? { runId: input.runId } : {}),
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
