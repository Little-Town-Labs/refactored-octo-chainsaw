// F02 T034b — `test-contract-v1` fixture stub.
//
// Stand-in for an F07a agent-contract definition. F07a will replace
// this with a real registry lookup; until then, B4/B8 tests pin
// against this stable shape so they don't break when the registry
// surface lands.

export const TEST_CONTRACT = {
  contract_id: "test-contract-v1",
  contract_version: "1.0.0",
  scopes: ["dossier.view", "ticket.respond"] as const,
} as const;

export type TestContract = typeof TEST_CONTRACT;
