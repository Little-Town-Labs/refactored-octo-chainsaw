export const TOOL_SURFACE_PUBLISH_SCOPE = "tool_surface.publish";
export const TOOL_SURFACE_DEPRECATE_SCOPE = "tool_surface.deprecate";
export const TOOL_DISPATCH_SCOPE = "tool.dispatch";
export const TOOL_SURFACE_READ_SCOPE = "tool_surface.read";

export interface ScopedPrincipal {
  readonly principal_id: string;
  readonly principal_kind: "human" | "agent" | "service";
  readonly scopes: readonly string[];
}

export class ToolScopeDeniedError extends Error {
  constructor(scope: string) {
    super(`Missing required tool scope: ${scope}`);
    this.name = "ToolScopeDeniedError";
  }
}

export function requireToolScope(principal: ScopedPrincipal, scope: string): void {
  if (!principal.scopes.includes(scope)) throw new ToolScopeDeniedError(scope);
}
