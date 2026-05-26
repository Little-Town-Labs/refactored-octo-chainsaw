export type EmployerApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unprocessable_entity"
  | "rate_limited"
  | "internal_error";

export interface EmployerApiErrorBody {
  readonly error: {
    readonly code: EmployerApiErrorCode;
    readonly message: string;
    readonly correlation_id?: string;
    readonly details?: readonly string[];
  };
}

export class EmployerApiError extends Error {
  constructor(
    readonly code: EmployerApiErrorCode,
    readonly status: number,
    message: string,
    readonly details: readonly string[] = [],
  ) {
    super(message);
    this.name = "EmployerApiError";
  }
}

export function errorBody(error: EmployerApiError, correlationId?: string): EmployerApiErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(correlationId ? { correlation_id: correlationId } : {}),
      ...(error.details.length > 0 ? { details: error.details } : {}),
    },
  };
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });
}

export function jsonError(error: unknown, correlationId?: string): Response {
  if (error instanceof EmployerApiError) {
    return jsonResponse(errorBody(error, correlationId), { status: error.status });
  }

  return jsonResponse(
    errorBody(
      new EmployerApiError("internal_error", 500, "The request could not be completed."),
      correlationId,
    ),
    { status: 500 },
  );
}

export function badRequest(message: string, details: readonly string[] = []): EmployerApiError {
  return new EmployerApiError("bad_request", 400, message, details);
}

export function unauthorized(
  message = "Missing or invalid employer API credential.",
): EmployerApiError {
  return new EmployerApiError("unauthorized", 401, message);
}

export function forbidden(
  message = "The credential is not allowed to perform this operation.",
): EmployerApiError {
  return new EmployerApiError("forbidden", 403, message);
}

export function notFound(message = "The requested resource was not found."): EmployerApiError {
  return new EmployerApiError("not_found", 404, message);
}

export function conflict(message: string): EmployerApiError {
  return new EmployerApiError("conflict", 409, message);
}

export function unprocessable(message: string, details: readonly string[] = []): EmployerApiError {
  return new EmployerApiError("unprocessable_entity", 422, message, details);
}
