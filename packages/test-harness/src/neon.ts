// Neon copy-on-write branch lifecycle for integration tests.
//
// Per-file branch granularity: each test file creates a fresh branch
// off a baseline (already migrated), exercises it, then deletes the
// branch in `afterAll`. Baseline is recreated by CI on every run from
// `main` migrations — no long-lived schema drift.
//
// API surface intentionally narrow: callers do not need to know the
// Neon REST shape, only "give me a connection URL" and "tear it down."
// Errors throw `NeonApiError` with status + body so failures are
// debuggable from CI logs without enabling verbose HTTP logging.
//
// Network/auth requirements: `NEON_API_KEY` and `NEON_PROJECT_ID`.
// If either is absent the scenario suite SKIPS rather than failing —
// integration tests are opt-in (`pnpm test:integration`), not gated
// on every developer's machine.

export interface NeonBranch {
  readonly id: string;
  readonly name: string;
  readonly connectionUrl: string;
}

export interface NeonBranchManagerOptions {
  readonly apiKey: string;
  readonly projectId: string;
  /** Branch to fork from. Defaults to the project's primary branch. */
  readonly parentBranchId?: string;
  /** Override the Neon API base. Used by tests; default is production. */
  readonly apiBase?: string;
}

export class NeonApiError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string, op: string) {
    super(`Neon API error during ${op}: HTTP ${status}: ${body}`);
    this.name = "NeonApiError";
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_API_BASE = "https://console.neon.tech/api/v2";

export class NeonBranchManager {
  private readonly opts: {
    apiKey: string;
    projectId: string;
    parentBranchId?: string;
    apiBase: string;
  };

  constructor(opts: NeonBranchManagerOptions) {
    this.opts = {
      apiKey: opts.apiKey,
      projectId: opts.projectId,
      ...(opts.parentBranchId !== undefined ? { parentBranchId: opts.parentBranchId } : {}),
      apiBase: opts.apiBase ?? DEFAULT_API_BASE,
    };
  }

  async createBranch(name: string): Promise<NeonBranch> {
    const branch = {
      name,
      ...(this.opts.parentBranchId ? { parent_id: this.opts.parentBranchId } : {}),
    };
    const body = {
      branch,
      endpoints: [{ type: "read_write" }],
    };

    const res = await this.fetch(`/projects/${this.opts.projectId}/branches`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      branch: { id: string; name: string };
      connection_uris?: Array<{ connection_uri: string }>;
    };

    const connectionUrl = json.connection_uris?.[0]?.connection_uri;
    if (!connectionUrl) {
      throw new NeonApiError(
        res.status,
        JSON.stringify(json),
        "createBranch (no connection_uri returned)",
      );
    }

    return { id: json.branch.id, name: json.branch.name, connectionUrl };
  }

  async deleteBranch(branchId: string): Promise<void> {
    await this.fetch(`/projects/${this.opts.projectId}/branches/${branchId}`, {
      method: "DELETE",
    });
  }

  private async fetch(path: string, init: RequestInit): Promise<Response> {
    const res = await fetch(`${this.opts.apiBase}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new NeonApiError(res.status, body, `${init.method ?? "GET"} ${path}`);
    }
    return res;
  }
}
