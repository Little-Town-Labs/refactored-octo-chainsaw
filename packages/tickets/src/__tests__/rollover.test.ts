// F04 T017 — Annual-rollover function tests (RED → GREEN).
//
// Verifies `bootstrapYearSequences(executor, year)`:
//   - Creates exactly three sequences on a fresh year.
//   - Is idempotent — a second invocation creates nothing new.
//   - Reports a per-sequence audit-event payload list per call so the
//     Inngest wrapper can emit `identifier_sequences.bootstrapped`
//     events for created sequences only.
//   - Surfaces unexpected errors from the executor.

import { bootstrapYearSequences, type SequenceBootstrapExecutor } from "../rollover.js";

class FakeBootstrapExecutor implements SequenceBootstrapExecutor {
  readonly existing = new Set<string>();
  readonly attempts: string[] = [];

  async createIfNotExists(sequenceName: string): Promise<{ created: boolean }> {
    this.attempts.push(sequenceName);
    if (this.existing.has(sequenceName)) {
      return { created: false };
    }
    this.existing.add(sequenceName);
    return { created: true };
  }
}

describe("bootstrapYearSequences", () => {
  test("creates 3 sequences on a fresh year and reports them as created", async () => {
    const exec = new FakeBootstrapExecutor();
    const result = await bootstrapYearSequences(exec, 2027);
    expect(result.year).toBe(2027);
    expect(result.created.sort()).toEqual(
      ["employer_req_tickets_2027_seq", "match_tickets_2027_seq", "seeker_tickets_2027_seq"].sort(),
    );
    expect(result.skipped).toEqual([]);
  });

  test("is idempotent — second call reports skipped, not created", async () => {
    const exec = new FakeBootstrapExecutor();
    await bootstrapYearSequences(exec, 2027);
    const second = await bootstrapYearSequences(exec, 2027);
    expect(second.created).toEqual([]);
    expect(second.skipped.sort()).toEqual(
      ["employer_req_tickets_2027_seq", "match_tickets_2027_seq", "seeker_tickets_2027_seq"].sort(),
    );
  });

  test("emits one audit-payload entry per *created* sequence", async () => {
    const exec = new FakeBootstrapExecutor();
    // Pre-populate one of three to verify the partial path.
    exec.existing.add("match_tickets_2028_seq");
    const result = await bootstrapYearSequences(exec, 2028);
    expect(result.created.sort()).toEqual(
      ["employer_req_tickets_2028_seq", "seeker_tickets_2028_seq"].sort(),
    );
    expect(result.skipped).toEqual(["match_tickets_2028_seq"]);
    expect(result.auditEvents).toHaveLength(2);
    for (const event of result.auditEvents) {
      expect(event.event_name).toBe("identifier_sequences.bootstrapped");
      expect(event.payload.year).toBe(2028);
      expect(result.created).toContain(event.payload.sequence_name);
    }
  });

  test("propagates unexpected executor errors", async () => {
    const exec: SequenceBootstrapExecutor = {
      async createIfNotExists() {
        throw new Error("connection refused");
      },
    };
    await expect(bootstrapYearSequences(exec, 2029)).rejects.toThrow("connection refused");
  });

  test("rejects invalid year inputs", async () => {
    const exec = new FakeBootstrapExecutor();
    await expect(bootstrapYearSequences(exec, 0)).rejects.toThrow();
    await expect(bootstrapYearSequences(exec, -1)).rejects.toThrow();
    await expect(bootstrapYearSequences(exec, 1.5)).rejects.toThrow();
  });
});
