// F04 T025 — cross-cut audit event shape coverage.
//
// Every catalogued state-machine edge must be representable as a
// schema-valid transition audit event. Repo tests verify representative
// emitted events; this suite guards catalog-wide drift.

import type { Principal } from "@spyglass/auth";

import { buildTransitionAuditEvent } from "../audit.js";
import { EMPLOYER_REQ_TRANSITIONS, MATCH_TRANSITIONS, SEEKER_TRANSITIONS } from "../transitions.js";
import { assertValidTransitionEvent } from "./audit-shape.helper.js";

const principal: Principal = {
  kind: "service",
  principal_id: "11111111-1111-4111-8111-111111111111",
  issued_at: 1,
  correlation_id: "corr-shape",
  service_name: "shape-test",
  service_version: "test",
  scopes: ["tickets.match.advance", "tickets.transition.operator"],
};

function contractEvent(event: ReturnType<typeof buildTransitionAuditEvent>) {
  return {
    event_name: event.event_name,
    principal_id: event.principal_id,
    correlation_id: event.correlation_id,
    payload: event.payload,
  };
}

describe("ticket transition audit shape coverage", () => {
  test.each(SEEKER_TRANSITIONS)("seeker %s -> %s", (transition) => {
    const event = buildTransitionAuditEvent({
      kind: "seeker_ticket",
      ticketId: "22222222-2222-4222-8222-222222222222",
      identifier: "ST-2026-00001",
      from: transition.from,
      to: transition.to,
      principal,
      ...(transition.operator ? { reason_code: "policy" } : {}),
    });

    expect(() => assertValidTransitionEvent(contractEvent(event))).not.toThrow();
  });

  test.each(EMPLOYER_REQ_TRANSITIONS)("employer req %s -> %s", (transition) => {
    const event = buildTransitionAuditEvent({
      kind: "employer_req_ticket",
      ticketId: "33333333-3333-4333-8333-333333333333",
      identifier: "ER-2026-00001",
      from: transition.from,
      to: transition.to,
      principal,
      ...(transition.operator ? { reason_code: "policy" } : {}),
    });

    expect(() => assertValidTransitionEvent(contractEvent(event))).not.toThrow();
  });

  test.each(MATCH_TRANSITIONS)("match %s -> %s", (transition) => {
    const event = buildTransitionAuditEvent({
      kind: "match_ticket",
      ticketId: "44444444-4444-4444-8444-444444444444",
      identifier: "MT-2026-00001",
      from: transition.from,
      to: transition.to,
      principal,
      extra: {
        run_id: "55555555-5555-4555-8555-555555555555",
        dossier_id: transition.to === "delivered" ? "66666666-6666-4666-8666-666666666666" : null,
        attempt: 1,
        seeker_ticket_id: "22222222-2222-4222-8222-222222222222",
        employer_req_ticket_id: "33333333-3333-4333-8333-333333333333",
      },
    });

    expect(() => assertValidTransitionEvent(contractEvent(event))).not.toThrow();
  });
});
