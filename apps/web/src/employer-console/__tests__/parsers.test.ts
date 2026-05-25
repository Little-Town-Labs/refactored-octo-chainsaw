import { parseEmployerProfileInput, parsePaginationParams, parseReqCloseInput } from "../parsers";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("employer-console parsers", () => {
  it("parses valid profile input", () => {
    const parsed = parseEmployerProfileInput(
      form({
        company_name: "Acme",
        company_summary: "Builds hiring tools",
        mission: "Match well",
        culture: "Clear",
        benefits: "Health",
        workplace_policy: "Remote",
      }),
    );
    expect(parsed.ok).toBe(true);
    expect(parsed.value?.company_name).toBe("Acme");
  });

  it("returns field errors for missing profile fields", () => {
    const parsed = parseEmployerProfileInput(form({ company_name: "" }));
    expect(parsed.ok).toBe(false);
    expect(parsed.errors.company_summary).toBeDefined();
  });

  it("parses filled and canceled-to-closed close inputs", () => {
    const base = {
      employer_req_ticket_id: "11111111-1111-4111-8111-000000000301",
      reason_code: "cancelled_by_employer",
    };
    expect(
      parseReqCloseInput(form({ ...base, terminal_state: "filled" })).value?.terminal_state,
    ).toBe("filled");
    expect(
      parseReqCloseInput(form({ ...base, terminal_state: "closed" })).value?.terminal_state,
    ).toBe("closed");
  });

  it("bounds pagination page size and drops oversized cursor values", () => {
    expect(parsePaginationParams({ limit: "500" }).limit).toBe(100);
    expect(parsePaginationParams({ limit: "0" }).limit).toBe(1);
    expect(parsePaginationParams({ cursor: "x".repeat(600) }).cursor).toBeUndefined();
  });
});
