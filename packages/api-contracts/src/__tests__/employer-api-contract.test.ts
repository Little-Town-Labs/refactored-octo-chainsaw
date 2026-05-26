import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  EMPLOYER_API_CONTRACT,
  EMPLOYER_API_REQUIRED_HEADERS,
  EMPLOYER_API_SCOPES,
  EMPLOYER_API_SUPPORTED_MAJOR_VERSIONS,
} from "../employer-api.js";
import {
  EMPLOYER_WEBHOOK_EVENT_TYPES,
  WEBHOOK_SCHEMA_VERSION,
  WEBHOOK_SIGNATURE_HEADERS,
} from "../webhook-events.js";

const apiContract = readFileSync(join(process.cwd(), "openapi", "employer-api.v1.yaml"), "utf8");
const webhookContract = readFileSync(
  join(process.cwd(), "openapi", "webhook-events.v1.yaml"),
  "utf8",
);

describe("F23 employer API contract", () => {
  it("publishes an OpenAPI 3.1 contract with auth, idempotency, errors, and lifecycle operations", () => {
    expect(apiContract).toContain("openapi: 3.1.0");
    expect(apiContract).toContain("EmployerServiceCredential");
    expect(apiContract).toContain("Idempotency-Key");
    expect(apiContract).toContain("ErrorResponse");
    expect(apiContract).toContain("operationId: createEmployerReq");
    expect(apiContract).toContain("operationId: closeEmployerReq");
    expect(apiContract).toContain("operationId: createWebhookEndpoint");
    expect(apiContract).toContain("operationId: disableWebhookEndpoint");
    expect(apiContract).toContain("operationId: deleteWebhookEndpoint");
  });

  it("exports contract metadata for version compatibility checks", () => {
    expect(EMPLOYER_API_CONTRACT.contract_id).toBe("employer-api");
    expect(EMPLOYER_API_CONTRACT.status).toBe("current");
    expect(EMPLOYER_API_CONTRACT.contract_hash).toBeTruthy();
    expect(EMPLOYER_API_SUPPORTED_MAJOR_VERSIONS).toContain(1);
    expect(EMPLOYER_API_REQUIRED_HEADERS.deprecation).toBe("Deprecation");
    expect(EMPLOYER_API_REQUIRED_HEADERS.sunset).toBe("Sunset");
  });

  it("declares N-2/deprecation support semantics in exported metadata", () => {
    expect(EMPLOYER_API_SUPPORTED_MAJOR_VERSIONS.length).toBeLessThanOrEqual(3);
    expect(EMPLOYER_API_CONTRACT.deprecated_at).toBeNull();
    expect(EMPLOYER_API_CONTRACT.sunset_at).toBeNull();
    expect(apiContract).toContain("Deprecation:");
    expect(apiContract).toContain("Sunset:");
  });

  it("rejects prohibited F23 surfaces from the contract", () => {
    expect(apiContract).not.toMatch(/greenhouse|lever|ashby|workday|icims/i);
    expect(apiContract).not.toMatch(/seeker api|\/seeker|billing|invoice|a2a runtime/i);
  });

  it("exports required scope names for consumers", () => {
    expect(EMPLOYER_API_SCOPES.reqRead).toBe("employer.req.read");
    expect(EMPLOYER_API_SCOPES.reqWrite).toBe("employer.req.write");
    expect(EMPLOYER_API_SCOPES.webhookWrite).toBe("employer.webhook.write");
  });
});

describe("F23 employer webhook event contract", () => {
  it("publishes schema version, event types, and signature headers", () => {
    expect(webhookContract).toContain("Spyglass Employer Webhook Events");
    expect(WEBHOOK_SCHEMA_VERSION).toBe("2026-05-25");
    expect(EMPLOYER_WEBHOOK_EVENT_TYPES).toContain("match.notification.created");
    expect(EMPLOYER_WEBHOOK_EVENT_TYPES).toContain("dossier.delivery.created");
    expect(WEBHOOK_SIGNATURE_HEADERS.signature).toBe("Spyglass-Signature");
  });
});
