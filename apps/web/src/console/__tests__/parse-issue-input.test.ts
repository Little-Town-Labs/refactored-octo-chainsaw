// F02 T057 — Tests for `parseIssueInput`.

import { parseIssueInput } from "../parse-issue-input.js";

const VALID = {
  run_id: "00000000-0000-0000-0000-0000000000aa",
  agent_principal_id: "00000000-0000-0000-0000-00000000a001",
  side: "seeker",
  contract_id: "c-1",
  contract_version: "v1",
  ticket_id: "00000000-0000-0000-0000-0000000000bb",
  ttl_minutes: "30",
};

function makeForm(fields: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) v.forEach((item) => fd.append(k, item));
    else fd.append(k, v);
  }
  return fd;
}

describe("parseIssueInput", () => {
  it("accepts a valid input and converts ttl_minutes to ttl_seconds", () => {
    const result = parseIssueInput(makeForm({ ...VALID, scope_set: ["dossier.read"] }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ttl_seconds).toBe(1800);
    expect(result.value.scope_set).toEqual(["dossier.read"]);
    expect(result.value.side).toBe("seeker");
  });

  it("flags non-UUID run_id, agent_principal_id, and ticket_id", () => {
    const result = parseIssueInput(
      makeForm({
        ...VALID,
        run_id: "nope",
        agent_principal_id: "nope2",
        ticket_id: "nope3",
        scope_set: ["x"],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.run_id).toBeDefined();
    expect(result.errors.agent_principal_id).toBeDefined();
    expect(result.errors.ticket_id).toBeDefined();
  });

  it("requires side to be 'seeker' or 'employer'", () => {
    const result = parseIssueInput(makeForm({ ...VALID, side: "platform", scope_set: ["x"] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.side).toBeDefined();
  });

  it("rejects empty scope_set (FR-19)", () => {
    const result = parseIssueInput(makeForm({ ...VALID }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.scope_set).toBeDefined();
  });

  it("rejects ttl_minutes outside [1, 120] (FR-20)", () => {
    const tooHigh = parseIssueInput(makeForm({ ...VALID, ttl_minutes: "121", scope_set: ["x"] }));
    expect(tooHigh.ok).toBe(false);
    if (tooHigh.ok) return;
    expect(tooHigh.errors.ttl_minutes).toBeDefined();

    const tooLow = parseIssueInput(makeForm({ ...VALID, ttl_minutes: "0", scope_set: ["x"] }));
    expect(tooLow.ok).toBe(false);
    if (tooLow.ok) return;
    expect(tooLow.errors.ttl_minutes).toBeDefined();
  });

  it("rejects non-integer ttl_minutes (e.g. '30.5', 'abc')", () => {
    const fractional = parseIssueInput(
      makeForm({ ...VALID, ttl_minutes: "30.5", scope_set: ["x"] }),
    );
    expect(fractional.ok).toBe(false);

    const word = parseIssueInput(makeForm({ ...VALID, ttl_minutes: "abc", scope_set: ["x"] }));
    expect(word.ok).toBe(false);
  });

  it("requires non-empty contract_id and contract_version", () => {
    const result = parseIssueInput(
      makeForm({ ...VALID, contract_id: "", contract_version: "", scope_set: ["x"] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.contract_id).toBeDefined();
    expect(result.errors.contract_version).toBeDefined();
  });

  it("trims whitespace and accepts multi-scope checkbox arrays", () => {
    const result = parseIssueInput(
      makeForm({ ...VALID, scope_set: ["dossier.read", "dossier.write", " "] }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Empty-after-trim filtered out.
    expect(result.value.scope_set).toEqual(["dossier.read", "dossier.write"]);
  });
});
