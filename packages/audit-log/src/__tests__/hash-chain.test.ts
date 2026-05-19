import {
  canonicalizeAuditEventMaterial,
  computeEventHash,
  verifyHashChain,
  type AuditEventHashMaterial,
} from "../hash-chain.js";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

const BASE_EVENT: AuditEventHashMaterial = {
  auditEventId: "11111111-1111-4111-8111-111111111111",
  eventName: "ticket.transition",
  principalId: "22222222-2222-4222-8222-222222222222",
  principalKind: "human",
  roleOrScope: "operator",
  correlationId: "corr-001",
  payloadHash: HASH_A,
  previousHash: null,
  chainNamespace: "default",
  hashAlgorithm: "sha256",
  canonicalizationVersion: "v1",
  createdAt: "2026-05-19T12:00:00.000Z",
};

describe("F05 audit hash chain", () => {
  test("canonical serialization is deterministic regardless of object construction order", () => {
    const reordered: AuditEventHashMaterial = {
      createdAt: BASE_EVENT.createdAt,
      canonicalizationVersion: BASE_EVENT.canonicalizationVersion,
      hashAlgorithm: BASE_EVENT.hashAlgorithm,
      chainNamespace: BASE_EVENT.chainNamespace,
      previousHash: BASE_EVENT.previousHash,
      payloadHash: BASE_EVENT.payloadHash,
      correlationId: BASE_EVENT.correlationId,
      roleOrScope: BASE_EVENT.roleOrScope,
      principalKind: BASE_EVENT.principalKind,
      principalId: BASE_EVENT.principalId,
      eventName: BASE_EVENT.eventName,
      auditEventId: BASE_EVENT.auditEventId,
    };

    expect(canonicalizeAuditEventMaterial(reordered)).toBe(
      canonicalizeAuditEventMaterial(BASE_EVENT),
    );
  });

  test("event hash changes when canonical payload hash changes", () => {
    const changed = { ...BASE_EVENT, payloadHash: HASH_B };

    expect(computeEventHash(changed)).not.toBe(computeEventHash(BASE_EVENT));
  });

  test("valid chain links previous_hash to prior event_hash", () => {
    const firstHash = computeEventHash(BASE_EVENT);
    const second = {
      ...BASE_EVENT,
      auditEventId: "33333333-3333-4333-8333-333333333333",
      payloadHash: HASH_B,
      previousHash: firstHash,
      createdAt: "2026-05-19T12:00:01.000Z",
    };

    expect(
      verifyHashChain([
        { ...BASE_EVENT, eventHash: firstHash },
        { ...second, eventHash: computeEventHash(second) },
      ]),
    ).toEqual({ ok: true });
  });

  test("detects mutation at the expected audit event", () => {
    const firstHash = computeEventHash(BASE_EVENT);
    const second = {
      ...BASE_EVENT,
      auditEventId: "33333333-3333-4333-8333-333333333333",
      payloadHash: HASH_B,
      previousHash: firstHash,
      createdAt: "2026-05-19T12:00:01.000Z",
    };
    const originalSecondHash = computeEventHash(second);
    const mutatedSecond = { ...second, payloadHash: "c".repeat(64) };

    expect(
      verifyHashChain([
        { ...BASE_EVENT, eventHash: firstHash },
        { ...mutatedSecond, eventHash: originalSecondHash },
      ]),
    ).toMatchObject({
      ok: false,
      failedAuditEventId: second.auditEventId,
      reason: "hash_mismatch",
    });
  });
});
