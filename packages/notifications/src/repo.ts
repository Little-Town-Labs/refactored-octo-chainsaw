import {
  type CandidateNotificationArtifactRow,
  candidateNotificationArtifacts,
  candidateNotificationDeliveryCommands,
  candidateNotificationGateEvents,
  candidateNoticeTemplateVersions,
  type Db,
  type NewCandidateNotificationArtifactRow,
  type NewCandidateNotificationDeliveryCommandRow,
  type NewCandidateNotificationGateEventRow,
  type NewCandidateNoticeTemplateVersionRow,
  type NotificationDeliveryCommandRow,
  type NotificationGateEventRow,
  type NoticeTemplateVersionRow,
} from "@spyglass/db";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";

import type {
  CandidateNotificationArtifact,
  NewCandidateNotificationArtifact,
  NewNotificationDeliveryCommand,
  NewNotificationGateEvaluation,
  NewNoticeTemplateVersion,
  NotificationDeliveryCommand,
  NotificationGateEvaluation,
  NoticeTemplateVersion,
} from "./types.js";

export interface NotificationRepository {
  insertTemplate(input: NewNoticeTemplateVersion): Promise<NoticeTemplateVersion>;
  updateTemplateStatus(input: {
    readonly templateId: string;
    readonly version: string;
    readonly status: NoticeTemplateVersion["status"];
    readonly effectiveUntil: Date;
  }): Promise<NoticeTemplateVersion>;
  listTemplates(templateId?: string): Promise<readonly NoticeTemplateVersion[]>;
  insertArtifact(input: NewCandidateNotificationArtifact): Promise<CandidateNotificationArtifact>;
  updateArtifactStatus(input: {
    readonly artifactId: string;
    readonly status: CandidateNotificationArtifact["status"];
  }): Promise<CandidateNotificationArtifact>;
  getArtifact(artifactId: string): Promise<CandidateNotificationArtifact | null>;
  listArtifacts(matchId?: string): Promise<readonly CandidateNotificationArtifact[]>;
  appendGateEvent(input: NewNotificationGateEvaluation): Promise<NotificationGateEvaluation>;
  listGateEvents(artifactId?: string): Promise<readonly NotificationGateEvaluation[]>;
  insertDeliveryCommand(
    input: NewNotificationDeliveryCommand,
  ): Promise<NotificationDeliveryCommand>;
  getDeliveryCommandByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<NotificationDeliveryCommand | null>;
  listDeliveryCommands(artifactId?: string): Promise<readonly NotificationDeliveryCommand[]>;
}

export function createDrizzleNotificationRepository(db: Db): NotificationRepository {
  return {
    async insertTemplate(input) {
      const [row] = await db
        .insert(candidateNoticeTemplateVersions)
        .values(toTemplateInsert(input))
        .returning();
      if (!row) throw new Error("failed to insert notice template version");
      return toTemplate(row);
    },
    async updateTemplateStatus(input) {
      const [row] = await db
        .update(candidateNoticeTemplateVersions)
        .set({ status: input.status, effective_until: input.effectiveUntil })
        .where(
          and(
            eq(candidateNoticeTemplateVersions.template_id, input.templateId),
            eq(candidateNoticeTemplateVersions.version, input.version),
          ),
        )
        .returning();
      if (!row) throw new Error("failed to update notice template version");
      return toTemplate(row);
    },
    async listTemplates(templateId) {
      const query = db.select().from(candidateNoticeTemplateVersions);
      const rows = templateId
        ? await query
            .where(eq(candidateNoticeTemplateVersions.template_id, templateId))
            .orderBy(desc(candidateNoticeTemplateVersions.created_at))
        : await query.orderBy(desc(candidateNoticeTemplateVersions.created_at));
      return rows.map(toTemplate);
    },
    async insertArtifact(input) {
      const [row] = await db
        .insert(candidateNotificationArtifacts)
        .values(toArtifactInsert(input))
        .returning();
      if (!row) throw new Error("failed to insert candidate notification artifact");
      return toArtifact(row);
    },
    async updateArtifactStatus(input) {
      const [row] = await db
        .update(candidateNotificationArtifacts)
        .set({ status: input.status })
        .where(eq(candidateNotificationArtifacts.artifact_id, input.artifactId))
        .returning();
      if (!row) throw new Error("failed to update candidate notification artifact");
      return toArtifact(row);
    },
    async getArtifact(artifactId) {
      const rows = await db
        .select()
        .from(candidateNotificationArtifacts)
        .where(eq(candidateNotificationArtifacts.artifact_id, artifactId))
        .limit(1);
      return rows[0] ? toArtifact(rows[0]) : null;
    },
    async listArtifacts(matchId) {
      const query = db.select().from(candidateNotificationArtifacts);
      const rows = matchId
        ? await query
            .where(eq(candidateNotificationArtifacts.match_id, matchId))
            .orderBy(desc(candidateNotificationArtifacts.created_at))
        : await query.orderBy(desc(candidateNotificationArtifacts.created_at));
      return rows.map(toArtifact);
    },
    async appendGateEvent(input) {
      const [row] = await db
        .insert(candidateNotificationGateEvents)
        .values(toGateInsert(input))
        .returning();
      if (!row) throw new Error("failed to append notification gate event");
      return toGateEvent(row);
    },
    async listGateEvents(artifactId) {
      const query = db.select().from(candidateNotificationGateEvents);
      const rows = artifactId
        ? await query
            .where(eq(candidateNotificationGateEvents.artifact_id, artifactId))
            .orderBy(desc(candidateNotificationGateEvents.created_at))
        : await query.orderBy(desc(candidateNotificationGateEvents.created_at));
      return rows.map(toGateEvent);
    },
    async insertDeliveryCommand(input) {
      const [row] = await db
        .insert(candidateNotificationDeliveryCommands)
        .values(toCommandInsert(input))
        .returning();
      if (!row) throw new Error("failed to insert notification delivery command");
      return toCommand(row);
    },
    async getDeliveryCommandByIdempotencyKey(idempotencyKey) {
      const rows = await db
        .select()
        .from(candidateNotificationDeliveryCommands)
        .where(eq(candidateNotificationDeliveryCommands.idempotency_key, idempotencyKey))
        .limit(1);
      return rows[0] ? toCommand(rows[0]) : null;
    },
    async listDeliveryCommands(artifactId) {
      const query = db.select().from(candidateNotificationDeliveryCommands);
      const rows = artifactId
        ? await query
            .where(eq(candidateNotificationDeliveryCommands.artifact_id, artifactId))
            .orderBy(desc(candidateNotificationDeliveryCommands.created_at))
        : await query.orderBy(desc(candidateNotificationDeliveryCommands.created_at));
      return rows.map(toCommand);
    },
  };
}

export class InMemoryNotificationRepository implements NotificationRepository {
  readonly templates: NoticeTemplateVersion[] = [];
  readonly artifacts: CandidateNotificationArtifact[] = [];
  readonly gateEvents: NotificationGateEvaluation[] = [];
  readonly commands: NotificationDeliveryCommand[] = [];

  async insertTemplate(input: NewNoticeTemplateVersion): Promise<NoticeTemplateVersion> {
    const template: NoticeTemplateVersion = {
      ...input,
      notice_template_version_id: input.notice_template_version_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.templates.push(template);
    return template;
  }

  async updateTemplateStatus(input: {
    readonly templateId: string;
    readonly version: string;
    readonly status: NoticeTemplateVersion["status"];
    readonly effectiveUntil: Date;
  }): Promise<NoticeTemplateVersion> {
    const index = this.templates.findIndex(
      (template) => template.template_id === input.templateId && template.version === input.version,
    );
    if (index < 0) throw new Error("template not found");
    const current = this.templates[index]!;
    const updated: NoticeTemplateVersion = {
      ...current,
      status: input.status,
      effective_until: input.effectiveUntil,
    };
    this.templates[index] = updated;
    return updated;
  }

  async listTemplates(templateId?: string): Promise<readonly NoticeTemplateVersion[]> {
    return templateId
      ? this.templates.filter((template) => template.template_id === templateId)
      : [...this.templates];
  }

  async insertArtifact(
    input: NewCandidateNotificationArtifact,
  ): Promise<CandidateNotificationArtifact> {
    const artifact: CandidateNotificationArtifact = {
      ...input,
      artifact_id: input.artifact_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.artifacts.push(artifact);
    return artifact;
  }

  async updateArtifactStatus(input: {
    readonly artifactId: string;
    readonly status: CandidateNotificationArtifact["status"];
  }): Promise<CandidateNotificationArtifact> {
    const index = this.artifacts.findIndex((artifact) => artifact.artifact_id === input.artifactId);
    if (index < 0) throw new Error("artifact not found");
    const current = this.artifacts[index]!;
    const updated: CandidateNotificationArtifact = { ...current, status: input.status };
    this.artifacts[index] = updated;
    return updated;
  }

  async getArtifact(artifactId: string): Promise<CandidateNotificationArtifact | null> {
    return this.artifacts.find((artifact) => artifact.artifact_id === artifactId) ?? null;
  }

  async listArtifacts(matchId?: string): Promise<readonly CandidateNotificationArtifact[]> {
    return matchId
      ? this.artifacts.filter((artifact) => artifact.match_id === matchId)
      : [...this.artifacts];
  }

  async appendGateEvent(input: NewNotificationGateEvaluation): Promise<NotificationGateEvaluation> {
    const event: NotificationGateEvaluation = {
      ...input,
      gate_event_id: input.gate_event_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.gateEvents.push(event);
    return event;
  }

  async listGateEvents(artifactId?: string): Promise<readonly NotificationGateEvaluation[]> {
    return artifactId
      ? this.gateEvents.filter((event) => event.artifact_id === artifactId)
      : [...this.gateEvents];
  }

  async insertDeliveryCommand(
    input: NewNotificationDeliveryCommand,
  ): Promise<NotificationDeliveryCommand> {
    const command: NotificationDeliveryCommand = {
      ...input,
      command_id: input.command_id ?? randomUUID(),
      created_at: input.created_at ?? new Date(),
    };
    this.commands.push(command);
    return command;
  }

  async getDeliveryCommandByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<NotificationDeliveryCommand | null> {
    return this.commands.find((command) => command.idempotency_key === idempotencyKey) ?? null;
  }

  async listDeliveryCommands(artifactId?: string): Promise<readonly NotificationDeliveryCommand[]> {
    return artifactId
      ? this.commands.filter((command) => command.artifact_id === artifactId)
      : [...this.commands];
  }
}

function toTemplate(row: NoticeTemplateVersionRow): NoticeTemplateVersion {
  return row as unknown as NoticeTemplateVersion;
}

function toArtifact(row: CandidateNotificationArtifactRow): CandidateNotificationArtifact {
  return row as unknown as CandidateNotificationArtifact;
}

function toGateEvent(row: NotificationGateEventRow): NotificationGateEvaluation {
  return row as unknown as NotificationGateEvaluation;
}

function toCommand(row: NotificationDeliveryCommandRow): NotificationDeliveryCommand {
  return row as unknown as NotificationDeliveryCommand;
}

function toTemplateInsert(input: NewNoticeTemplateVersion): NewCandidateNoticeTemplateVersionRow {
  return input as unknown as NewCandidateNoticeTemplateVersionRow;
}

function toArtifactInsert(
  input: NewCandidateNotificationArtifact,
): NewCandidateNotificationArtifactRow {
  return input as unknown as NewCandidateNotificationArtifactRow;
}

function toGateInsert(input: NewNotificationGateEvaluation): NewCandidateNotificationGateEventRow {
  return input as unknown as NewCandidateNotificationGateEventRow;
}

function toCommandInsert(
  input: NewNotificationDeliveryCommand,
): NewCandidateNotificationDeliveryCommandRow {
  return input as unknown as NewCandidateNotificationDeliveryCommandRow;
}
