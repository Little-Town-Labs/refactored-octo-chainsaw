import type { EmployerApiPrincipal } from "../auth";
import {
  closeEmployerReqFromApi,
  createEmployerReqFromApi,
  listEmployerReqsFromApi,
  readEmployerReqFromApi,
  updateEmployerReqFromApi,
  type EmployerReqAuditSink,
  type EmployerReqRepo,
  type EmployerReqResource,
} from "../req-service";

class MemoryReqRepo implements EmployerReqRepo {
  readonly rows = new Map<string, EmployerReqResource>();

  async create(
    orgId: string,
    input: Parameters<EmployerReqRepo["create"]>[1],
  ): Promise<EmployerReqResource> {
    const row: EmployerReqResource = {
      req_id: `req_${this.rows.size + 1}`,
      org_id: orgId,
      ...(input.external_req_id ? { external_req_id: input.external_req_id } : {}),
      title: input.title,
      description: input.description,
      status: "open",
      updated_at: new Date("2026-05-25T12:00:00Z").toISOString(),
    };
    this.rows.set(row.req_id, row);
    return row;
  }

  async list(orgId: string): Promise<readonly EmployerReqResource[]> {
    return [...this.rows.values()].filter((row) => row.org_id === orgId);
  }

  async find(orgId: string, reqId: string): Promise<EmployerReqResource | null> {
    const row = this.rows.get(reqId);
    return row?.org_id === orgId ? row : null;
  }

  async update(
    orgId: string,
    reqId: string,
    input: Parameters<EmployerReqRepo["update"]>[2],
  ): Promise<EmployerReqResource | null> {
    const row = await this.find(orgId, reqId);
    if (!row) return null;
    const updated: EmployerReqResource = {
      ...row,
      ...(input.external_req_id ? { external_req_id: input.external_req_id } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.description ? { description: input.description } : {}),
      status: row.status,
    };
    this.rows.set(reqId, updated);
    return updated;
  }

  async close(orgId: string, reqId: string): Promise<EmployerReqResource | null> {
    const row = await this.find(orgId, reqId);
    if (!row) return null;
    const closed = { ...row, status: "closed" as const };
    this.rows.set(reqId, closed);
    return closed;
  }
}

describe("F23 employer req service", () => {
  it("creates, lists, reads, updates, and closes org-scoped reqs with audit events", async () => {
    const repo = new MemoryReqRepo();
    const events: Parameters<EmployerReqAuditSink["emit"]>[0][] = [];
    const audit: EmployerReqAuditSink = { emit: async (event) => void events.push(event) };
    const principal: EmployerApiPrincipal = {
      kind: "service",
      principal_id: "00000000-0000-0000-0000-000000000001",
      credential_id: "cred_1",
      org_id: "org_1",
      display_name: "ATS",
      scopes: ["employer.req.write"],
    };

    const created = await createEmployerReqFromApi(repo, audit, principal, {
      title: "Staff Engineer",
      description: "Build product systems",
      must_have_skills: [],
      nice_to_have_skills: [],
    });
    const updated = await updateEmployerReqFromApi(repo, audit, principal, created.req_id, {
      title: "Principal Engineer",
    });
    const closed = await closeEmployerReqFromApi(repo, audit, principal, created.req_id, {
      reason: "filled",
    });

    await expect(readEmployerReqFromApi(repo, principal, "missing")).rejects.toMatchObject({
      code: "not_found",
    });
    expect(await listEmployerReqsFromApi(repo, principal)).toHaveLength(1);
    expect(updated.title).toBe("Principal Engineer");
    expect(closed.status).toBe("closed");
    expect(events.map((event) => event.type)).toEqual([
      "employer_api.req.created",
      "employer_api.req.updated",
      "employer_api.req.closed",
    ]);
  });
});
