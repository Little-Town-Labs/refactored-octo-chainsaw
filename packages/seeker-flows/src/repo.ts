import type {
  AggregateInsightReport,
  DemographicConsentPosture,
  DossierReviewDecision,
  PreferenceThresholdPosture,
  SeekerFlowAuditEvent,
  SeekerProfileDraft,
  SeekerTicketProductState,
  WorkJurisdictionAttestation,
} from "./types.js";

export interface SeekerFlowRepositories {
  getTicket(seekerId: string): SeekerTicketProductState | undefined;
  saveTicket(state: SeekerTicketProductState): void;
  saveProfile(draft: SeekerProfileDraft): void;
  getProfile(seekerId: string): SeekerProfileDraft | undefined;
  saveThreshold(posture: PreferenceThresholdPosture): void;
  getThreshold(seekerId: string): PreferenceThresholdPosture | undefined;
  saveJurisdiction(attestation: WorkJurisdictionAttestation): void;
  saveDossierReview(decision: DossierReviewDecision): void;
  saveInsight(report: AggregateInsightReport): void;
  saveDemographicConsent(posture: DemographicConsentPosture): void;
  getDemographicConsent(seekerId: string): DemographicConsentPosture | undefined;
  appendAudit(event: SeekerFlowAuditEvent): void;
  claimIdempotency(key: string): boolean;
}

export class InMemorySeekerFlowRepositories implements SeekerFlowRepositories {
  readonly tickets = new Map<string, SeekerTicketProductState>();
  readonly profiles = new Map<string, SeekerProfileDraft>();
  readonly thresholds = new Map<string, PreferenceThresholdPosture>();
  readonly jurisdictions = new Map<string, WorkJurisdictionAttestation>();
  readonly reviews = new Map<string, DossierReviewDecision>();
  readonly insights = new Map<string, AggregateInsightReport>();
  readonly demographicConsents = new Map<string, DemographicConsentPosture>();
  readonly auditEvents: SeekerFlowAuditEvent[] = [];
  readonly idempotencyKeys = new Set<string>();

  getTicket(seekerId: string): SeekerTicketProductState | undefined {
    return this.tickets.get(seekerId);
  }

  saveTicket(state: SeekerTicketProductState): void {
    this.tickets.set(state.seekerId, state);
  }

  saveProfile(draft: SeekerProfileDraft): void {
    this.profiles.set(draft.seekerId, draft);
  }

  getProfile(seekerId: string): SeekerProfileDraft | undefined {
    return this.profiles.get(seekerId);
  }

  saveThreshold(posture: PreferenceThresholdPosture): void {
    this.thresholds.set(posture.seekerId, posture);
  }

  getThreshold(seekerId: string): PreferenceThresholdPosture | undefined {
    return this.thresholds.get(seekerId);
  }

  saveJurisdiction(attestation: WorkJurisdictionAttestation): void {
    this.jurisdictions.set(attestation.seekerId, attestation);
  }

  saveDossierReview(decision: DossierReviewDecision): void {
    this.reviews.set(decision.decisionId, decision);
  }

  saveInsight(report: AggregateInsightReport): void {
    this.insights.set(report.reportId, report);
  }

  saveDemographicConsent(posture: DemographicConsentPosture): void {
    this.demographicConsents.set(posture.seekerId, posture);
  }

  getDemographicConsent(seekerId: string): DemographicConsentPosture | undefined {
    return this.demographicConsents.get(seekerId);
  }

  appendAudit(event: SeekerFlowAuditEvent): void {
    this.auditEvents.push(event);
  }

  claimIdempotency(key: string): boolean {
    if (this.idempotencyKeys.has(key)) {
      return false;
    }
    this.idempotencyKeys.add(key);
    return true;
  }
}
