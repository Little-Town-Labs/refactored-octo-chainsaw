// F04 T014 — Smoke tests for the audit-shape helper.
//
// Verifies the helper compiles the YAML schema and correctly accepts a
// minimal valid event while rejecting common invalid shapes. B5 will
// drive every named transition through this validator (T025).

import { AuditShapeError, assertValidTransitionEvent } from "./audit-shape.helper.js";

const VALID_EVENT = {
  event_name: "seeker_ticket.submitted",
  principal_id: "11111111-1111-4111-8111-111111111111",
  correlation_id: "corr-001",
  payload: {
    ticket_id: "22222222-2222-4222-8222-222222222222",
    ticket_identifier: "ST-2026-00001",
    ticket_kind: "seeker",
    from_state: "draft",
    to_state: "submitted",
  },
};

describe("assertValidTransitionEvent", () => {
  test("accepts a minimal valid event", () => {
    expect(() => assertValidTransitionEvent(VALID_EVENT)).not.toThrow();
  });

  test("rejects events with malformed event_name", () => {
    const bad = { ...VALID_EVENT, event_name: "not_a_valid_event_name" };
    expect(() => assertValidTransitionEvent(bad)).toThrow(AuditShapeError);
  });

  test("rejects events with non-UUID principal_id", () => {
    const bad = { ...VALID_EVENT, principal_id: "not-a-uuid" };
    expect(() => assertValidTransitionEvent(bad)).toThrow(AuditShapeError);
  });

  test("rejects payloads with malformed ticket_identifier", () => {
    const bad = {
      ...VALID_EVENT,
      payload: { ...VALID_EVENT.payload, ticket_identifier: "WRONG-2026-1" },
    };
    expect(() => assertValidTransitionEvent(bad)).toThrow(AuditShapeError);
  });

  test("rejects events missing required correlation_id", () => {
    const { correlation_id: _drop, ...bad } = VALID_EVENT;
    void _drop;
    expect(() => assertValidTransitionEvent(bad)).toThrow(AuditShapeError);
  });
});
