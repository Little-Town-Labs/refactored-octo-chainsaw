// In-memory `AuditEventSink` double — assertable from tests.
//
// Mirrors the @spyglass/auth `AuditEventSink` interface structurally
// so we don't take a hard dependency on @spyglass/auth from the
// harness (the harness must remain consumable by every package,
// including @spyglass/auth itself, without circular imports).

export interface RecordedAuditEvent {
  readonly name: string;
  readonly principal_id?: string;
  readonly correlation_id: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export class InMemoryAuditSink {
  private readonly _events: RecordedAuditEvent[] = [];

  get events(): readonly RecordedAuditEvent[] {
    return this._events;
  }

  // Matches @spyglass/auth's `AuditEventSink.emit` shape structurally.
  async emit(event: {
    name: string;
    principal_id?: string;
    correlation_id: string;
    payload: Readonly<Record<string, unknown>>;
  }): Promise<void> {
    this._events.push({
      name: event.name,
      ...(event.principal_id !== undefined ? { principal_id: event.principal_id } : {}),
      correlation_id: event.correlation_id,
      payload: event.payload,
    });
  }

  byName(name: string): readonly RecordedAuditEvent[] {
    return this._events.filter((e) => e.name === name);
  }
}
