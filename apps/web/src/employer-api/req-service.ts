import { notFound } from "./errors";
import type { EmployerApiPrincipal } from "./auth";
import type {
  EmployerReqCloseInput,
  EmployerReqCreateInput,
  EmployerReqUpdateInput,
} from "./schemas";

export interface EmployerReqResource {
  readonly req_id: string;
  readonly org_id: string;
  readonly external_req_id?: string;
  readonly title: string;
  readonly description: string;
  readonly status: "open" | "closed";
  readonly updated_at: string;
}

export interface EmployerReqRepo {
  create(
    orgId: string,
    input: EmployerReqCreateInput,
    actor: EmployerApiPrincipal,
  ): Promise<EmployerReqResource>;
  list(orgId: string): Promise<readonly EmployerReqResource[]>;
  find(orgId: string, reqId: string): Promise<EmployerReqResource | null>;
  update(
    orgId: string,
    reqId: string,
    input: EmployerReqUpdateInput,
    actor: EmployerApiPrincipal,
  ): Promise<EmployerReqResource | null>;
  close(
    orgId: string,
    reqId: string,
    input: EmployerReqCloseInput,
    actor: EmployerApiPrincipal,
  ): Promise<EmployerReqResource | null>;
}

export interface EmployerReqAuditSink {
  emit(event: {
    readonly type:
      | "employer_api.req.created"
      | "employer_api.req.updated"
      | "employer_api.req.closed";
    readonly org_id: string;
    readonly req_id: string;
    readonly credential_id: string;
  }): Promise<void>;
}

export async function createEmployerReqFromApi(
  repo: EmployerReqRepo,
  audit: EmployerReqAuditSink,
  principal: EmployerApiPrincipal,
  input: EmployerReqCreateInput,
): Promise<EmployerReqResource> {
  const req = await repo.create(principal.org_id, input, principal);
  await audit.emit({
    type: "employer_api.req.created",
    org_id: principal.org_id,
    req_id: req.req_id,
    credential_id: principal.credential_id,
  });
  return req;
}

export async function listEmployerReqsFromApi(
  repo: EmployerReqRepo,
  principal: EmployerApiPrincipal,
): Promise<readonly EmployerReqResource[]> {
  return repo.list(principal.org_id);
}

export async function readEmployerReqFromApi(
  repo: EmployerReqRepo,
  principal: EmployerApiPrincipal,
  reqId: string,
): Promise<EmployerReqResource> {
  const req = await repo.find(principal.org_id, reqId);
  if (!req) {
    throw notFound("Employer req was not found.");
  }
  return req;
}

export async function updateEmployerReqFromApi(
  repo: EmployerReqRepo,
  audit: EmployerReqAuditSink,
  principal: EmployerApiPrincipal,
  reqId: string,
  input: EmployerReqUpdateInput,
): Promise<EmployerReqResource> {
  const req = await repo.update(principal.org_id, reqId, input, principal);
  if (!req) {
    throw notFound("Employer req was not found.");
  }
  await audit.emit({
    type: "employer_api.req.updated",
    org_id: principal.org_id,
    req_id: req.req_id,
    credential_id: principal.credential_id,
  });
  return req;
}

export async function closeEmployerReqFromApi(
  repo: EmployerReqRepo,
  audit: EmployerReqAuditSink,
  principal: EmployerApiPrincipal,
  reqId: string,
  input: EmployerReqCloseInput,
): Promise<EmployerReqResource> {
  const req = await repo.close(principal.org_id, reqId, input, principal);
  if (!req) {
    throw notFound("Employer req was not found.");
  }
  await audit.emit({
    type: "employer_api.req.closed",
    org_id: principal.org_id,
    req_id: req.req_id,
    credential_id: principal.credential_id,
  });
  return req;
}
