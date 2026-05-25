import type {
  AuditEventsBufferRow,
  EmployerReqTicketRow,
  MatchTicketRow,
  NewEmployerReqTicketRow,
  NewMatchTicketRow,
  NewSeekerTicketRow,
  SeekerTicketRow,
} from "@spyglass/db";

import type { InsertAuditEvent } from "../../audit.js";
import type { TicketStore, TicketTransactionStore } from "../../repo/store.js";

const NOW = new Date("2026-05-14T12:00:00.000Z");

function clone<T>(value: T): T {
  return structuredClone(value);
}

function uuid(n: number): string {
  return `11111111-1111-4111-8111-${String(n).padStart(12, "0")}`;
}

interface State {
  nextId: number;
  seekers: SeekerTicketRow[];
  employerReqs: EmployerReqTicketRow[];
  matches: MatchTicketRow[];
  audits: AuditEventsBufferRow[];
}

class MemoryTx implements TicketTransactionStore {
  constructor(
    private readonly state: State,
    private readonly options: { auditInsertShouldFail?: boolean } = {},
  ) {}

  async insertSeekerDraft(values: NewSeekerTicketRow): Promise<SeekerTicketRow> {
    const row: SeekerTicketRow = {
      seeker_ticket_id: values.seeker_ticket_id ?? uuid(this.state.nextId++),
      principal_id: values.principal_id,
      identifier: values.identifier,
      state: values.state,
      role_family: values.role_family,
      comp_band_min: values.comp_band_min,
      comp_band_max: values.comp_band_max,
      currency: values.currency,
      jurisdictions: values.jurisdictions,
      work_mode: values.work_mode,
      flags: values.flags ?? [],
      created_at: NOW,
      updated_at: NOW,
      disabled_at: null,
    };
    this.state.seekers.push(row);
    return clone(row);
  }

  async getSeeker(id: string): Promise<SeekerTicketRow | null> {
    return clone(this.state.seekers.find((r) => r.seeker_ticket_id === id) ?? null);
  }

  async findSeekerByIdentifier(identifier: string): Promise<SeekerTicketRow | null> {
    return clone(this.state.seekers.find((r) => r.identifier === identifier) ?? null);
  }

  async listSeekers(): Promise<SeekerTicketRow[]> {
    return clone(this.state.seekers);
  }

  async updateSeeker(id: string, values: Partial<SeekerTicketRow>): Promise<SeekerTicketRow> {
    const idx = this.state.seekers.findIndex((r) => r.seeker_ticket_id === id);
    if (idx < 0) throw new Error(`seeker ticket not found: ${id}`);
    this.state.seekers[idx] = { ...this.state.seekers[idx], ...values };
    return clone(this.state.seekers[idx]);
  }

  async insertEmployerReqDraft(values: NewEmployerReqTicketRow): Promise<EmployerReqTicketRow> {
    const row: EmployerReqTicketRow = {
      employer_req_ticket_id: values.employer_req_ticket_id ?? uuid(this.state.nextId++),
      principal_id: values.principal_id,
      org_id: values.org_id,
      identifier: values.identifier,
      state: values.state,
      role_title: values.role_title,
      role_level: values.role_level,
      comp_band_min: values.comp_band_min,
      comp_band_max: values.comp_band_max,
      currency: values.currency,
      jurisdictions: values.jurisdictions,
      decision_locus_jurisdiction: values.decision_locus_jurisdiction,
      work_mode: values.work_mode,
      headcount_total: values.headcount_total,
      headcount_filled: values.headcount_filled ?? 0,
      threshold: values.threshold ?? 75,
      flags: values.flags ?? [],
      created_at: NOW,
      updated_at: NOW,
      disabled_at: null,
    };
    this.state.employerReqs.push(row);
    return clone(row);
  }

  async getEmployerReq(id: string): Promise<EmployerReqTicketRow | null> {
    return clone(this.state.employerReqs.find((r) => r.employer_req_ticket_id === id) ?? null);
  }

  async findEmployerReqByIdentifier(identifier: string): Promise<EmployerReqTicketRow | null> {
    return clone(this.state.employerReqs.find((r) => r.identifier === identifier) ?? null);
  }

  async listEmployerReqs(): Promise<EmployerReqTicketRow[]> {
    return clone(this.state.employerReqs);
  }

  async updateEmployerReq(
    id: string,
    values: Partial<EmployerReqTicketRow>,
  ): Promise<EmployerReqTicketRow> {
    const idx = this.state.employerReqs.findIndex((r) => r.employer_req_ticket_id === id);
    if (idx < 0) throw new Error(`employer req ticket not found: ${id}`);
    this.state.employerReqs[idx] = { ...this.state.employerReqs[idx], ...values };
    return clone(this.state.employerReqs[idx]);
  }

  async insertMatch(values: NewMatchTicketRow): Promise<MatchTicketRow> {
    const row: MatchTicketRow = {
      match_ticket_id: values.match_ticket_id ?? uuid(this.state.nextId++),
      identifier: values.identifier,
      seeker_ticket_id: values.seeker_ticket_id,
      employer_req_ticket_id: values.employer_req_ticket_id,
      state: values.state,
      round: values.round ?? 0,
      round_cap: values.round_cap,
      run_id: values.run_id ?? null,
      attempt: values.attempt ?? 1,
      seeker_contract_id: values.seeker_contract_id,
      seeker_contract_version: values.seeker_contract_version,
      employer_contract_id: values.employer_contract_id,
      employer_contract_version: values.employer_contract_version,
      privacy_ruleset_id: values.privacy_ruleset_id,
      privacy_ruleset_version: values.privacy_ruleset_version,
      decision_locus_jurisdiction: values.decision_locus_jurisdiction,
      flags: values.flags ?? [],
      dossier_id: values.dossier_id ?? null,
      created_at: NOW,
      updated_at: NOW,
      disabled_at: null,
    };
    this.state.matches.push(row);
    return clone(row);
  }

  async getMatch(id: string): Promise<MatchTicketRow | null> {
    return clone(this.state.matches.find((r) => r.match_ticket_id === id) ?? null);
  }

  async findMatchByIdentifier(identifier: string): Promise<MatchTicketRow | null> {
    return clone(this.state.matches.find((r) => r.identifier === identifier) ?? null);
  }

  async findMatchByPair(
    seekerTicketId: string,
    employerReqTicketId: string,
    attempt: number,
  ): Promise<MatchTicketRow | null> {
    return clone(
      this.state.matches.find(
        (r) =>
          r.seeker_ticket_id === seekerTicketId &&
          r.employer_req_ticket_id === employerReqTicketId &&
          r.attempt === attempt &&
          r.disabled_at === null,
      ) ?? null,
    );
  }

  async listMatches(): Promise<MatchTicketRow[]> {
    return clone(this.state.matches);
  }

  async updateMatch(id: string, values: Partial<MatchTicketRow>): Promise<MatchTicketRow> {
    const idx = this.state.matches.findIndex((r) => r.match_ticket_id === id);
    if (idx < 0) throw new Error(`match ticket not found: ${id}`);
    this.state.matches[idx] = { ...this.state.matches[idx], ...values };
    return clone(this.state.matches[idx]);
  }

  async insertAuditEvent(event: InsertAuditEvent): Promise<void> {
    if (this.options.auditInsertShouldFail) throw new Error("audit insert failed");
    this.state.audits.push({
      event_id: uuid(this.state.nextId++),
      created_at: NOW,
      ...event,
    });
  }
}

export class MemoryTicketStore implements TicketStore {
  private state: State = {
    nextId: 1,
    seekers: [],
    employerReqs: [],
    matches: [],
    audits: [],
  };

  constructor(private readonly options: { auditInsertShouldFail?: boolean } = {}) {}

  get seekers(): SeekerTicketRow[] {
    return clone(this.state.seekers);
  }
  get employerReqs(): EmployerReqTicketRow[] {
    return clone(this.state.employerReqs);
  }
  get matches(): MatchTicketRow[] {
    return clone(this.state.matches);
  }
  get audits(): AuditEventsBufferRow[] {
    return clone(this.state.audits);
  }

  seedSeeker(row: SeekerTicketRow): void {
    this.state.seekers.push(clone(row));
  }
  seedEmployerReq(row: EmployerReqTicketRow): void {
    this.state.employerReqs.push(clone(row));
  }
  seedMatch(row: MatchTicketRow): void {
    this.state.matches.push(clone(row));
  }

  async transaction<T>(fn: (tx: TicketTransactionStore) => Promise<T>): Promise<T> {
    const snapshot = clone(this.state);
    try {
      return await fn(new MemoryTx(this.state, this.options));
    } catch (err) {
      this.state = snapshot;
      throw err;
    }
  }
}

export const TEST_NOW = NOW;
export const testUuid = uuid;
