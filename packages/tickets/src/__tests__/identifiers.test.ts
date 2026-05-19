// F04 T015 — `nextIdentifier(kind)` tests (RED phase).
//
// Validates:
//   - Returns properly-shaped `ST-/ER-/MT-YYYY-NNNNN` (FR-7).
//   - Year matches the UTC year passed in (current year by default).
//   - Sequence increments monotonically across calls.
//   - Throws `SequenceNotFoundError` if the year's sequence is missing
//     (plan §3 R-3; EC-9 missed-rollover recovery surface).
//
// Uses an in-memory fake `SequenceExecutor` so the test runs without
// a Postgres connection. The Drizzle adapter is a separate, thin
// wrapper exercised by integration tests later in B5.

import {
  SequenceNotFoundError,
  nextIdentifier,
  type SequenceExecutor,
  type TicketIdentifierKind,
} from "../identifiers.js";

class FakeSequenceExecutor implements SequenceExecutor {
  private counters = new Map<string, number>();
  private existing = new Set<string>();

  /** Pre-create sequences for one or more (kind, year) tuples. */
  bootstrap(names: ReadonlyArray<string>): void {
    for (const n of names) {
      if (!this.existing.has(n)) {
        this.existing.add(n);
        this.counters.set(n, 0);
      }
    }
  }

  async nextval(sequenceName: string): Promise<number> {
    if (!this.existing.has(sequenceName)) {
      throw new SequenceNotFoundError(sequenceName);
    }
    const next = (this.counters.get(sequenceName) ?? 0) + 1;
    this.counters.set(sequenceName, next);
    return next;
  }
}

const YEAR = 2026;
const SEQUENCES = [
  "seeker_tickets_2026_seq",
  "employer_req_tickets_2026_seq",
  "match_tickets_2026_seq",
];

describe("nextIdentifier — shape", () => {
  test.each<[TicketIdentifierKind, RegExp]>([
    ["seeker_ticket", /^ST-2026-\d{5}$/],
    ["employer_req_ticket", /^ER-2026-\d{5}$/],
    ["match_ticket", /^MT-2026-\d{5}$/],
  ])("%s produces an identifier matching %p", async (kind, pattern) => {
    const exec = new FakeSequenceExecutor();
    exec.bootstrap(SEQUENCES);
    const id = await nextIdentifier({ kind, year: YEAR, executor: exec });
    expect(id).toMatch(pattern);
  });

  test("five-digit zero-padding", async () => {
    const exec = new FakeSequenceExecutor();
    exec.bootstrap(SEQUENCES);
    const id = await nextIdentifier({
      kind: "seeker_ticket",
      year: YEAR,
      executor: exec,
    });
    expect(id).toBe("ST-2026-00001");
  });
});

describe("nextIdentifier — year selection", () => {
  test("defaults to current UTC year when year omitted", async () => {
    const currentYear = new Date().getUTCFullYear();
    const exec = new FakeSequenceExecutor();
    exec.bootstrap([
      `seeker_tickets_${currentYear}_seq`,
      `employer_req_tickets_${currentYear}_seq`,
      `match_tickets_${currentYear}_seq`,
    ]);
    const id = await nextIdentifier({ kind: "seeker_ticket", executor: exec });
    expect(id.startsWith(`ST-${currentYear}-`)).toBe(true);
  });

  test("explicit year overrides default", async () => {
    const exec = new FakeSequenceExecutor();
    exec.bootstrap(["seeker_tickets_2030_seq"]);
    const id = await nextIdentifier({
      kind: "seeker_ticket",
      year: 2030,
      executor: exec,
    });
    expect(id).toMatch(/^ST-2030-\d{5}$/);
  });
});

describe("nextIdentifier — monotonic increment", () => {
  test("subsequent calls increment the sequence", async () => {
    const exec = new FakeSequenceExecutor();
    exec.bootstrap(SEQUENCES);
    const a = await nextIdentifier({ kind: "seeker_ticket", year: YEAR, executor: exec });
    const b = await nextIdentifier({ kind: "seeker_ticket", year: YEAR, executor: exec });
    const c = await nextIdentifier({ kind: "seeker_ticket", year: YEAR, executor: exec });
    expect(a).toBe("ST-2026-00001");
    expect(b).toBe("ST-2026-00002");
    expect(c).toBe("ST-2026-00003");
  });

  test("different kinds maintain independent sequences", async () => {
    const exec = new FakeSequenceExecutor();
    exec.bootstrap(SEQUENCES);
    const seeker = await nextIdentifier({ kind: "seeker_ticket", year: YEAR, executor: exec });
    const employer = await nextIdentifier({
      kind: "employer_req_ticket",
      year: YEAR,
      executor: exec,
    });
    const match = await nextIdentifier({ kind: "match_ticket", year: YEAR, executor: exec });
    expect(seeker).toBe("ST-2026-00001");
    expect(employer).toBe("ER-2026-00001");
    expect(match).toBe("MT-2026-00001");
  });
});

describe("nextIdentifier — missing sequence", () => {
  test("throws SequenceNotFoundError when the year's sequence is absent", async () => {
    const exec = new FakeSequenceExecutor(); // nothing bootstrapped
    await expect(
      nextIdentifier({ kind: "seeker_ticket", year: 2099, executor: exec }),
    ).rejects.toBeInstanceOf(SequenceNotFoundError);
  });

  test("error carries the missing sequence name", async () => {
    const exec = new FakeSequenceExecutor();
    try {
      await nextIdentifier({ kind: "match_ticket", year: 2099, executor: exec });
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(SequenceNotFoundError);
      expect((e as SequenceNotFoundError).sequenceName).toBe("match_tickets_2099_seq");
    }
  });
});
