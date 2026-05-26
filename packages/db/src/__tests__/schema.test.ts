// F02 T009 — Drizzle schema for `principals` and `organizations`
// (test-first). The tests assert the *type-level* shape of the
// inferred row types so consumers (`@spyglass/auth` materializer) can
// rely on stable column names and nullability across schema changes.

import {
  alphaConsentRecords,
  alphaCounselEvidenceReferences,
  alphaHumanReviewDecisions,
  alphaPostureGateDecisions,
  employerApiCredentials,
  employerApiIdempotencyRecords,
  employerWebhookDeliveryReceipts,
  employerWebhookEndpoints,
  employerWebhookEvents,
  employerWebhookSigningSecrets,
  employerOrganizationProfiles,
  incidentCorrectiveActions,
  incidentEvidenceReferences,
  incidentNotificationObligations,
  incidentRunbookExercises,
  incidentTimelineEntries,
  incidents,
  monitoringSignals,
  organizations,
  principals,
  type EmployerApiCredentialRow,
  type EmployerApiIdempotencyRecordRow,
  type EmployerOrganizationProfileRow,
  type EmployerReqTicketRow,
  type EmployerWebhookDeliveryReceiptRow,
  type EmployerWebhookEndpointRow,
  type EmployerWebhookEventRow,
  type EmployerWebhookSigningSecretRow,
  type IncidentCorrectiveActionRow,
  type IncidentEvidenceReferenceRow,
  type IncidentNotificationObligationRow,
  type IncidentRow,
  type IncidentRunbookExerciseRow,
  type IncidentTimelineEntryRow,
  type MonitoringSignalRow,
  type NewOrganizationRow,
  type NewPrincipalRow,
  type OrganizationRow,
  type PrincipalRow,
  type AlphaConsentRecordRow,
  type AlphaCounselEvidenceReferenceRow,
  type AlphaHumanReviewDecisionRow,
  type AlphaPostureGateDecisionRow,
} from "../schema/index.js";

describe("F02 schema — principals (data-model §principals)", () => {
  it("exposes the expected columns at the type level", () => {
    const sample: NewPrincipalRow = {
      kind: "human",
      external_idp: "clerk",
      external_id: "user_abc",
      tier: "seeker",
      display_name: "Test Seeker",
    };
    expect(sample.kind).toBe("human");
  });

  it("inferred Principal row carries timestamps populated by the DB", () => {
    const _typeOnly: PrincipalRow = {
      principal_id: "00000000-0000-0000-0000-000000000001",
      kind: "human",
      external_idp: "clerk",
      external_id: "user_abc",
      tier: "seeker",
      org_id: null,
      service_name: null,
      service_version: null,
      display_name: null,
      created_at: new Date(),
      updated_at: new Date(),
      disabled_at: null,
      disabled_reason: null,
    };
    expect(_typeOnly.kind).toBe("human");
  });

  it("table name is 'principals'", () => {
    // drizzle-orm exposes table metadata via Symbol.for('drizzle:Name').
    const name = (principals as unknown as Record<symbol, unknown>)[Symbol.for("drizzle:Name")];
    expect(name).toBe("principals");
  });
});

describe("F22 schema — employer admin console", () => {
  it("employer organization profiles are separate from Clerk-mirror organizations", () => {
    const _typeOnly: EmployerOrganizationProfileRow = {
      profile_id: "00000000-0000-0000-0000-000000000020",
      org_id: "00000000-0000-0000-0000-000000000010",
      company_name: "Acme Corp",
      company_summary: "Builds hiring tools",
      mission: "Match well",
      culture: "Clear",
      benefits: "Health",
      workplace_policy: "Remote",
      updated_by: "00000000-0000-0000-0000-000000000001",
      created_at: new Date(),
      updated_at: new Date(),
    };
    expect(_typeOnly.company_name).toBe("Acme Corp");
  });

  it("table name is 'employer_organization_profiles'", () => {
    const name = (employerOrganizationProfiles as unknown as Record<symbol, unknown>)[
      Symbol.for("drizzle:Name")
    ];
    expect(name).toBe("employer_organization_profiles");
  });

  it("employer req rows include F22 threshold and decision locus fields", () => {
    const _typeOnly: Pick<EmployerReqTicketRow, "threshold" | "decision_locus_jurisdiction"> = {
      threshold: 75,
      decision_locus_jurisdiction: "US-CA",
    };
    expect(_typeOnly.threshold).toBe(75);
  });
});

describe("F02 schema — organizations (data-model §organizations)", () => {
  it("inferred row type carries the discriminator", () => {
    const sample: NewOrganizationRow = {
      clerk_org_id: "org_abc",
      kind: "employer",
      display_name: "Acme Corp",
    };
    expect(sample.kind).toBe("employer");
  });

  it("organizations.kind discriminator includes 'operator'", () => {
    const sample: NewOrganizationRow = {
      clerk_org_id: "org_xyz",
      kind: "operator",
      display_name: "Spyglass Operators",
    };
    expect(sample.kind).toBe("operator");
  });

  it("inferred Organization row exposes the expected timestamps", () => {
    const _typeOnly: OrganizationRow = {
      org_id: "00000000-0000-0000-0000-000000000010",
      clerk_org_id: "org_abc",
      kind: "employer",
      display_name: "Acme Corp",
      created_at: new Date(),
      disabled_at: null,
    };
    expect(_typeOnly.kind).toBe("employer");
  });

  it("table name is 'organizations'", () => {
    const name = (organizations as unknown as Record<symbol, unknown>)[Symbol.for("drizzle:Name")];
    expect(name).toBe("organizations");
  });
});

describe("F23 schema — employer API credentials and webhooks", () => {
  it("employer API credential rows carry lifecycle and scope metadata", () => {
    const _typeOnly: Pick<
      EmployerApiCredentialRow,
      "credential_id" | "org_id" | "secret_hash" | "scopes" | "status" | "revoked_at"
    > = {
      credential_id: "00000000-0000-0000-0000-000000000023",
      org_id: "00000000-0000-0000-0000-000000000010",
      secret_hash: "sha256:test",
      scopes: ["employer.req.write"],
      status: "active",
      revoked_at: null,
    };
    expect(_typeOnly.status).toBe("active");
  });

  it("idempotency records keep stable request fingerprints and cached responses", () => {
    const _typeOnly: Pick<
      EmployerApiIdempotencyRecordRow,
      "idempotency_key" | "request_fingerprint" | "response_status" | "response_body"
    > = {
      idempotency_key: "idem_123",
      request_fingerprint: "sha256:req",
      response_status: 201,
      response_body: { req_id: "req_123" },
    };
    expect(_typeOnly.response_status).toBe(201);
  });

  it("webhook endpoint, secret, event, and receipt rows expose delivery state", () => {
    const endpoint: Pick<EmployerWebhookEndpointRow, "url" | "subscribed_events" | "status"> = {
      url: "https://example.com/webhooks/spyglass",
      subscribed_events: ["match.notification.created"],
      status: "active",
    };
    const secret: Pick<EmployerWebhookSigningSecretRow, "key_id" | "status"> = {
      key_id: "whsec_123",
      status: "active",
    };
    const event: Pick<EmployerWebhookEventRow, "event_type" | "schema_version"> = {
      event_type: "match.notification.created",
      schema_version: "1.0.0",
    };
    const receipt: Pick<
      EmployerWebhookDeliveryReceiptRow,
      "attempt" | "status" | "response_class"
    > = {
      attempt: 1,
      status: "retry_scheduled",
      response_class: "server_error",
    };

    expect([endpoint.status, secret.status, event.event_type, receipt.status]).toEqual([
      "active",
      "active",
      "match.notification.created",
      "retry_scheduled",
    ]);
  });

  it("uses expected table names for F23 persisted surfaces", () => {
    const tableNames = [
      employerApiCredentials,
      employerApiIdempotencyRecords,
      employerWebhookEndpoints,
      employerWebhookSigningSecrets,
      employerWebhookEvents,
      employerWebhookDeliveryReceipts,
    ].map((table) => (table as unknown as Record<symbol, unknown>)[Symbol.for("drizzle:Name")]);

    expect(tableNames).toEqual([
      "employer_api_credentials",
      "employer_api_idempotency_records",
      "employer_webhook_endpoints",
      "employer_webhook_signing_secrets",
      "employer_webhook_events",
      "employer_webhook_delivery_receipts",
    ]);
  });
});

describe("F24 schema — incident response and monitoring", () => {
  it("monitoring signals expose severity, dedupe, and evidence metadata", () => {
    const _typeOnly: Pick<
      MonitoringSignalRow,
      "category" | "severity" | "dedupe_key" | "evidence_ref"
    > = {
      category: "cross_side_leakage",
      severity: "sev1",
      dedupe_key: "privacy_filter:cross_side_leakage:match:m1",
      evidence_ref: { kind: "audit_event", ref: "audit_1" },
    };
    expect(_typeOnly.severity).toBe("sev1");
  });

  it("incident rows carry lifecycle, breach review, and principal attribution fields", () => {
    const incident: Pick<
      IncidentRow,
      "incident_key" | "severity" | "status" | "personal_data_involved"
    > = {
      incident_key: "INC-2026-0001",
      severity: "sev1",
      status: "triage",
      personal_data_involved: "unknown",
    };
    const timeline: Pick<IncidentTimelineEntryRow, "entry_type" | "body"> = {
      entry_type: "triage",
      body: "Opened from sev-1 signal",
    };
    const evidence: Pick<IncidentEvidenceReferenceRow, "kind" | "ref"> = {
      kind: "audit_event",
      ref: "audit_1",
    };
    const obligation: Pick<IncidentNotificationObligationRow, "obligation_type" | "status"> = {
      obligation_type: "gdpr_supervisory_authority",
      status: "counsel_review",
    };
    const action: Pick<IncidentCorrectiveActionRow, "title" | "status"> = {
      title: "Patch filter bypass",
      status: "open",
    };
    const exercise: Pick<IncidentRunbookExerciseRow, "scenario" | "status"> = {
      scenario: "cross_side_leakage",
      status: "planned",
    };

    expect([
      incident.status,
      timeline.entry_type,
      evidence.kind,
      obligation.status,
      action.status,
      exercise.scenario,
    ]).toEqual(["triage", "triage", "audit_event", "counsel_review", "open", "cross_side_leakage"]);
  });

  it("uses expected table names for F24 persisted surfaces", () => {
    const tableNames = [
      monitoringSignals,
      incidents,
      incidentTimelineEntries,
      incidentEvidenceReferences,
      incidentNotificationObligations,
      incidentCorrectiveActions,
      incidentRunbookExercises,
    ].map((table) => (table as unknown as Record<symbol, unknown>)[Symbol.for("drizzle:Name")]);

    expect(tableNames).toEqual([
      "monitoring_signals",
      "incidents",
      "incident_timeline_entries",
      "incident_evidence_references",
      "incident_notification_obligations",
      "incident_corrective_actions",
      "incident_runbook_exercises",
    ]);
  });
});

describe("F25 schema — Phase 0 alpha posture", () => {
  it("alpha posture rows expose consent, review, counsel, and gate state", () => {
    const consent: Pick<AlphaConsentRecordRow, "participant_role" | "state"> = {
      participant_role: "seeker",
      state: "consented",
    };
    const review: Pick<AlphaHumanReviewDecisionRow, "decision" | "reason"> = {
      decision: "approved",
      reason: "Informational alpha outreach only",
    };
    const counsel: Pick<AlphaCounselEvidenceReferenceRow, "transition" | "memo_path"> = {
      transition: "phase_0_to_phase_1",
      memo_path: ".specify/memory/counsel-reviews/memo.md",
    };
    const gate: Pick<AlphaPostureGateDecisionRow, "decision" | "reason_code"> = {
      decision: "block",
      reason_code: "missing_consent",
    };

    expect([consent.state, review.decision, counsel.transition, gate.reason_code]).toEqual([
      "consented",
      "approved",
      "phase_0_to_phase_1",
      "missing_consent",
    ]);
  });

  it("uses expected table names for F25 persisted surfaces", () => {
    const tableNames = [
      alphaConsentRecords,
      alphaHumanReviewDecisions,
      alphaCounselEvidenceReferences,
      alphaPostureGateDecisions,
    ].map((table) => (table as unknown as Record<symbol, unknown>)[Symbol.for("drizzle:Name")]);

    expect(tableNames).toEqual([
      "alpha_consent_records",
      "alpha_human_review_decisions",
      "alpha_counsel_evidence_references",
      "alpha_posture_gate_decisions",
    ]);
  });
});
