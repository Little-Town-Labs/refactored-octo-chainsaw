import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  API_WEBHOOK_GATE_IDS,
  DEFAULT_API_WEBHOOK_GATES,
  LocalFileProductResultStore,
  SyntheticWebhookReceiver,
  assertWebhookPayloadBoundary,
  createEmployerApiCredential,
  evaluateEmployerApiOperation,
  runApiWebhookGate,
  runDefaultApiWebhookGateSuite,
  signWebhookPayload,
  withSignedWebhookHeaders,
  type EmployerApiRequest,
} from "../index.js";

const TEST_SIGNING_KEY_MATERIAL = ["pth07", "test", "signing", "key"].join("-");

describe("employer API and webhook gate scenarios", () => {
  let directories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      directories.map((directory) => rm(directory, { recursive: true, force: true })),
    );
    directories = [];
  });

  it("defines the required PTH07 API/webhook gate registry", () => {
    expect(DEFAULT_API_WEBHOOK_GATES.map((gate) => gate.gate_id)).toEqual(API_WEBHOOK_GATE_IDS);
    expect(
      DEFAULT_API_WEBHOOK_GATES.every((gate) => gate.scenario_id.startsWith("api-webhook.")),
    ).toBe(true);
    expect(DEFAULT_API_WEBHOOK_GATES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ gate_id: "authorized-req-lifecycle" }),
        expect.objectContaining({ gate_id: "missing-scope-denial" }),
        expect.objectContaining({ gate_id: "signed-webhook-delivery" }),
        expect.objectContaining({ gate_id: "duplicate-webhook-idempotency" }),
        expect.objectContaining({ gate_id: "webhook-failure-evidence" }),
        expect.objectContaining({ gate_id: "forbidden-payload-boundary" }),
      ]),
    );
  });

  it("authorizes scoped credentials and denies missing authorization deterministically", () => {
    const request: EmployerApiRequest = {
      request_id: "req-op-test-create",
      action: "create",
      req_ref: "req://alpha/test",
      credential: createEmployerApiCredential(),
      required_scopes: ["req:write"],
      submitted_at: "2026-05-27T13:00:00.000Z",
      payload: { title: "Synthetic req" },
    };

    expect(evaluateEmployerApiOperation(request)).toMatchObject({
      status: "authorized",
      emitted_event_refs: ["webhook-event://req://alpha/test/create"],
    });
    expect(evaluateEmployerApiOperation({ ...request, credential: undefined })).toMatchObject({
      status: "denied",
      reason_code: "missing_authorization",
      emitted_event_refs: [],
    });
  });

  it("signs webhook deliveries and captures valid receiver evidence", () => {
    const delivery = withSignedWebhookHeaders({
      event_id: "evt-test-valid",
      delivery_id: "del-test-valid",
      event_type: "employer.req.created",
      target_url_ref: "webhook-endpoint://test",
      sent_at: "2026-05-27T13:00:00.000Z",
      payload: { event_id: "evt-test-valid", req_ref: "req://alpha/test" },
      signing_secret_ref: "signing-key://redacted/test",
      signing_secret: TEST_SIGNING_KEY_MATERIAL,
      expected_status: "delivered",
    });
    const receiver = new SyntheticWebhookReceiver({
      run_id: "run-test",
      scenario_id: "api-webhook.test",
    });

    expect(delivery.headers["x-spyglass-signature"]).toBe(
      signWebhookPayload({
        payload: delivery.payload,
        secret: TEST_SIGNING_KEY_MATERIAL,
        timestamp: delivery.sent_at,
      }),
    );
    expect(receiver.receive(delivery)).toMatchObject({
      event_id: "evt-test-valid",
      delivery_id: "del-test-valid",
      signature_valid: true,
      payload_boundary_valid: true,
      idempotency_status: "accepted",
      delivery_status: "delivered",
    });
  });

  it("detects duplicate deliveries and forbidden payload fields", () => {
    const delivery = withSignedWebhookHeaders({
      event_id: "evt-test-duplicate",
      delivery_id: "del-test-duplicate-first",
      event_type: "employer.req.updated",
      target_url_ref: "webhook-endpoint://test",
      sent_at: "2026-05-27T13:00:00.000Z",
      payload: { event_id: "evt-test-duplicate", req_ref: "req://alpha/test" },
      signing_secret_ref: "signing-key://redacted/test",
      signing_secret: TEST_SIGNING_KEY_MATERIAL,
      expected_status: "delivered",
    });
    const duplicateDelivery = {
      ...delivery,
      delivery_id: "del-test-duplicate-second",
    };
    const receiver = new SyntheticWebhookReceiver({
      run_id: "run-test",
      scenario_id: "api-webhook.test",
    });

    expect(receiver.receive(delivery).idempotency_status).toBe("accepted");
    expect(receiver.receive(duplicateDelivery).idempotency_status).toBe("duplicate");
    expect(
      assertWebhookPayloadBoundary({
        req_ref: "req://alpha/test",
        nested: { protected_class: "forbidden-synthetic-marker" },
      }),
    ).toEqual({
      valid: false,
      forbidden_paths: ["$.nested.protected_class"],
    });
  });

  it("runs and persists the default API/webhook gate suite", async () => {
    const directory = await tempDirectory();
    const store = new LocalFileProductResultStore({ directory });

    const suite = await runDefaultApiWebhookGateSuite({ store });

    expect(suite.results).toHaveLength(DEFAULT_API_WEBHOOK_GATES.length);
    expect(suite.summary).toBe(
      `${DEFAULT_API_WEBHOOK_GATES.length}/${DEFAULT_API_WEBHOOK_GATES.length} API/webhook gate(s) passed`,
    );
    expect(
      suite.results.find((result) => result.gate.gate_id === "missing-scope-denial")?.operations[0],
    ).toMatchObject({
      status: "denied",
      reason_code: "missing_scope",
    });
    expect(
      suite.results.find((result) => result.gate.gate_id === "duplicate-webhook-idempotency")
        ?.webhook_captures,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ idempotency_status: "accepted" }),
        expect.objectContaining({ idempotency_status: "duplicate" }),
      ]),
    );
    expect(
      suite.results.find((result) => result.gate.gate_id === "webhook-failure-evidence")
        ?.webhook_captures[0],
    ).toMatchObject({
      delivery_status: "failed",
      failure_reason: "receiver_unavailable",
    });
    expect(
      suite.results.find((result) => result.gate.gate_id === "forbidden-payload-boundary")
        ?.webhook_captures[0],
    ).toMatchObject({
      delivery_status: "failed",
      payload_boundary_valid: false,
      failure_reason: "forbidden_payload_fields",
    });

    for (const result of suite.results) {
      await expect(store.getRun(result.run.run_id)).resolves.toMatchObject({
        run: { run_id: result.run.run_id, status: "passed" },
        webhook_captures: result.webhook_captures,
      });
    }
    await expect(store.listRuns({ mode: "gate", status: "passed" })).resolves.toHaveLength(
      DEFAULT_API_WEBHOOK_GATES.length,
    );
  });

  it("keeps individual gate snapshots persistable", async () => {
    const gate = DEFAULT_API_WEBHOOK_GATES.find(
      (entry) => entry.gate_id === "signed-webhook-delivery",
    );
    expect(gate).toBeDefined();

    const result = await runApiWebhookGate(gate!, {
      run_id: "api-webhook-gate-single",
    });

    expect(result.run.status).toBe("passed");
    expect(result.snapshot.webhook_captures).toEqual(result.webhook_captures);
    expect(result.snapshot.webhook_captures).toHaveLength(1);
  });

  async function tempDirectory(): Promise<string> {
    const directory = await mkdtemp(path.join(os.tmpdir(), "api-webhook-gate-test-"));
    directories.push(directory);
    return directory;
  }
});
