import {
  EMPLOYER_API_SCOPES,
  authenticateEmployerApiRequest,
  type EmployerApiCredentialRepo,
} from "./auth";
import { badRequest, jsonError, jsonResponse } from "./errors";
import { runIdempotently, fingerprintRequest, type IdempotencyRepo } from "./idempotency";
import {
  closeEmployerReqFromApi,
  createEmployerReqFromApi,
  listEmployerReqsFromApi,
  readEmployerReqFromApi,
  updateEmployerReqFromApi,
  type EmployerReqAuditSink,
  type EmployerReqRepo,
} from "./req-service";
import {
  employerReqCloseSchema,
  employerReqCreateSchema,
  employerReqUpdateSchema,
} from "./schemas";

export interface EmployerReqHandlerDeps {
  readonly credentials: EmployerApiCredentialRepo;
  readonly idempotency: IdempotencyRepo;
  readonly reqs: EmployerReqRepo;
  readonly audit: EmployerReqAuditSink;
}

export async function handleListReqs(
  request: Request,
  deps: EmployerReqHandlerDeps,
): Promise<Response> {
  try {
    const principal = await authenticateEmployerApiRequest(
      request.headers,
      deps.credentials,
      EMPLOYER_API_SCOPES.reqRead,
    );
    return jsonResponse({ data: await listEmployerReqsFromApi(deps.reqs, principal) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function handleCreateReq(
  request: Request,
  deps: EmployerReqHandlerDeps,
): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = employerReqCreateSchema.parse(body);
    const principal = await authenticateEmployerApiRequest(
      request.headers,
      deps.credentials,
      EMPLOYER_API_SCOPES.reqWrite,
    );
    const idempotencyKey = requireIdempotencyKey(request.headers);
    const result = await runIdempotently({
      org_id: principal.org_id,
      credential_id: principal.credential_id,
      operation: "req.create",
      idempotency_key: idempotencyKey,
      request_fingerprint: fingerprintRequest({ method: "POST", path: "/reqs", body }),
      repo: deps.idempotency,
      execute: async () => {
        const req = await createEmployerReqFromApi(deps.reqs, deps.audit, principal, parsed);
        return { status: 201, body: req, resource_type: "employer_req", resource_id: req.req_id };
      },
    });
    return jsonResponse(result.body, { status: result.status });
  } catch (error) {
    return jsonError(error);
  }
}

export async function handleReadReq(
  request: Request,
  deps: EmployerReqHandlerDeps,
  reqId: string,
): Promise<Response> {
  try {
    const principal = await authenticateEmployerApiRequest(
      request.headers,
      deps.credentials,
      EMPLOYER_API_SCOPES.reqRead,
    );
    return jsonResponse(await readEmployerReqFromApi(deps.reqs, principal, reqId));
  } catch (error) {
    return jsonError(error);
  }
}

export async function handleUpdateReq(
  request: Request,
  deps: EmployerReqHandlerDeps,
  reqId: string,
): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = employerReqUpdateSchema.parse(body);
    const principal = await authenticateEmployerApiRequest(
      request.headers,
      deps.credentials,
      EMPLOYER_API_SCOPES.reqWrite,
    );
    const idempotencyKey = requireIdempotencyKey(request.headers);
    const result = await runIdempotently({
      org_id: principal.org_id,
      credential_id: principal.credential_id,
      operation: "req.update",
      idempotency_key: idempotencyKey,
      request_fingerprint: fingerprintRequest({ method: "PATCH", path: `/reqs/${reqId}`, body }),
      repo: deps.idempotency,
      execute: async () => {
        const req = await updateEmployerReqFromApi(deps.reqs, deps.audit, principal, reqId, parsed);
        return { status: 200, body: req, resource_type: "employer_req", resource_id: req.req_id };
      },
    });
    return jsonResponse(result.body, { status: result.status });
  } catch (error) {
    return jsonError(error);
  }
}

export async function handleCloseReq(
  request: Request,
  deps: EmployerReqHandlerDeps,
  reqId: string,
): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = employerReqCloseSchema.parse(body);
    const principal = await authenticateEmployerApiRequest(
      request.headers,
      deps.credentials,
      EMPLOYER_API_SCOPES.reqWrite,
    );
    const idempotencyKey = requireIdempotencyKey(request.headers);
    const result = await runIdempotently({
      org_id: principal.org_id,
      credential_id: principal.credential_id,
      operation: "req.close",
      idempotency_key: idempotencyKey,
      request_fingerprint: fingerprintRequest({
        method: "POST",
        path: `/reqs/${reqId}/close`,
        body,
      }),
      repo: deps.idempotency,
      execute: async () => {
        const req = await closeEmployerReqFromApi(deps.reqs, deps.audit, principal, reqId, parsed);
        return { status: 200, body: req, resource_type: "employer_req", resource_id: req.req_id };
      },
    });
    return jsonResponse(result.body, { status: result.status });
  } catch (error) {
    return jsonError(error);
  }
}

function requireIdempotencyKey(headers: Headers): string {
  const key = headers.get("idempotency-key");
  if (!key) {
    throw badRequest("Idempotency-Key header is required.");
  }
  return key;
}
