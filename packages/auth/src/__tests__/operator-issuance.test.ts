// F02 T057 — Operator-driven agent-credential issuance tests.

import {
  IssuanceConflictError,
  type AgentCredentialRepo,
  type AgentCredentialRow,
  type IssueAgentInput,
} from "../issuer/issuance.js";
import { issueAgentCredentialByOperator } from "../issuer/operator-issuance.js";
import { generateEdDSAKeypair } from "../issuer/keygen.js";
import { verifyAgentCredential, type RevocationChecker } from "../verifier/verify.js";
import type { JwksProvider, SigningKeyMaterial } from "../issuer/key-source.js";
import type { AuditEventSink } from "../materialize/types.js";
import { RoleRequiredError } from "../authorize.js";
import type { AgentPrincipal, HumanPrincipal, ServicePrincipal } from "../principal.js";
import type { KeyObject } from "node:crypto";

import { TEST_CONTRACT } from "./fixtures/test-contract.js";

function makeSink() {
  const events: Array<Parameters<AuditEventSink["emit"]>[0]> = [];
  return {
    events,
    emit: async (event: Parameters<AuditEventSink["emit"]>[0]) => {
      events.push(event);
    },
  };
}

function makeRepo() {
  const rows: AgentCredentialRow[] = [];
  const repo: AgentCredentialRepo = {
    async findByIdempotencyKey(input) {
      return (
        rows.find(
          (r) =>
            r.run_id === input.run_id &&
            r.side === input.side &&
            r.contract_id === input.contract_id &&
            r.contract_version === input.contract_version,
        ) ?? null
      );
    },
    async insert(row) {
      const stored: AgentCredentialRow = { ...row, revoked_at: null };
      rows.push(stored);
      return stored;
    },
  };
  return { repo, rows };
}

const operator: HumanPrincipal = {
  kind: "human",
  principal_id: "00000000-0000-0000-0000-00000000op00",
  issued_at: 0,
  correlation_id: "c-op",
  tier: "operator",
  external_idp: "clerk",
  external_id: "user_op",
};

const seekerHuman: HumanPrincipal = {
  ...operator,
  tier: "seeker",
};

const service: ServicePrincipal = {
  kind: "service",
  principal_id: "00000000-0000-0000-0000-00000000svc0",
  issued_at: 0,
  correlation_id: "c-svc",
  service_name: "parley-runner",
  service_version: "1.0.0",
  scopes: ["auth.agent_credential.issue"],
};

const agent: AgentPrincipal = {
  kind: "agent",
  principal_id: "00000000-0000-0000-0000-00000000ag00",
  issued_at: 0,
  correlation_id: "c-ag",
  run_id: "00000000-0000-0000-0000-00000000ru00",
  side: "seeker",
  contract_id: "c-1",
  contract_version: "v1",
  ticket_id: "00000000-0000-0000-0000-00000000ti00",
  scopes: [],
};

const baseInput: IssueAgentInput = {
  run_id: "00000000-0000-0000-0000-0000000000aa",
  side: "seeker",
  contract_id: TEST_CONTRACT.contract_id,
  contract_version: TEST_CONTRACT.contract_version,
  ticket_id: "00000000-0000-0000-0000-0000000000bb",
  scope_set: [...TEST_CONTRACT.scopes],
  agent_principal_id: "00000000-0000-0000-0000-00000000ag01",
};

interface Bundle {
  signingKey: SigningKeyMaterial;
  jwks: JwksProvider;
  revocations: RevocationChecker;
}

async function makeBundle(): Promise<Bundle> {
  const kp = await generateEdDSAKeypair();
  return {
    signingKey: { kid: kp.kid, privateKey: kp.privateKey, algorithm: "EdDSA" },
    jwks: {
      async resolve(kid) {
        return kid === kp.kid ? (kp.publicKey as KeyObject) : null;
      },
    },
    revocations: {
      async isRevoked() {
        return false;
      },
    },
  };
}

function makeDeps(bundle: Bundle, sink: ReturnType<typeof makeSink>, repo: AgentCredentialRepo) {
  let n = 0;
  return {
    repo,
    sink,
    signingKey: bundle.signingKey,
    issuer: "https://spyglass.test",
    audience: "spyglass.runner",
    newCredentialId: () =>
      `00000000-0000-0000-0000-00000000c${(n++).toString(16).padStart(3, "0")}`,
    now: () => 1_700_000_000,
    correlationId: () => "c-test",
  };
}

describe("issueAgentCredentialByOperator — happy path", () => {
  it("mints a verifiable JWT and persists the row, attributing the operator in audit", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo, rows } = makeRepo();
    const result = await issueAgentCredentialByOperator(
      operator,
      baseInput,
      makeDeps(bundle, sink, repo),
    );

    expect(rows).toHaveLength(1);
    expect(result.principal_id).toBe(baseInput.agent_principal_id);
    expect(result.scopes).toEqual(baseInput.scope_set);

    const issued = await verifyAgentCredential({
      token: result.jwt,
      expectedIssuer: "https://spyglass.test",
      expectedAudience: "spyglass.runner",
      jwks: bundle.jwks,
      revocations: bundle.revocations,
      now: () => 1_700_000_000,
    });
    expect(issued.sub).toBe(baseInput.agent_principal_id);

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]).toMatchObject({
      name: "agent_credential.issued_by_operator",
      principal_id: operator.principal_id,
      payload: { credential_id: result.credential_id, scope_count: baseInput.scope_set.length },
    });
  });
});

describe("issueAgentCredentialByOperator — caller policy", () => {
  it("denies non-operator humans and emits the operator-denied audit event", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo } = makeRepo();
    await expect(
      issueAgentCredentialByOperator(seekerHuman, baseInput, makeDeps(bundle, sink, repo)),
    ).rejects.toBeInstanceOf(RoleRequiredError);
    expect(sink.events.map((e) => e.name)).toEqual(["agent_credential.issue_by_operator_denied"]);
  });

  it("denies service principals (this surface is operator-only)", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo } = makeRepo();
    await expect(
      issueAgentCredentialByOperator(service, baseInput, makeDeps(bundle, sink, repo)),
    ).rejects.toBeInstanceOf(RoleRequiredError);
    expect(sink.events[0]!.name).toBe("agent_credential.issue_by_operator_denied");
    expect(sink.events[0]!.payload).toMatchObject({ reason: "wrong_caller_kind:service" });
  });

  it("denies agent principals", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo } = makeRepo();
    await expect(
      issueAgentCredentialByOperator(agent, baseInput, makeDeps(bundle, sink, repo)),
    ).rejects.toBeInstanceOf(RoleRequiredError);
  });
});

describe("issueAgentCredentialByOperator — idempotency", () => {
  it("returns IssuanceConflictError when an active credential already exists for the same key", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo } = makeRepo();
    const deps = makeDeps(bundle, sink, repo);
    await issueAgentCredentialByOperator(operator, baseInput, deps);
    await expect(issueAgentCredentialByOperator(operator, baseInput, deps)).rejects.toBeInstanceOf(
      IssuanceConflictError,
    );
    const denied = sink.events.filter(
      (e) => e.name === "agent_credential.issue_by_operator_denied",
    );
    expect(denied).toHaveLength(1);
    expect(denied[0]!.payload).toMatchObject({ reason: "idempotency_conflict" });
  });

  it("re-issues when the prior credential is revoked, recording reissue_of_credential_id", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo, rows } = makeRepo();
    const deps = makeDeps(bundle, sink, repo);
    const first = await issueAgentCredentialByOperator(operator, baseInput, deps);

    // Mark the prior credential revoked.
    rows[0] = { ...rows[0]!, revoked_at: new Date(1_700_000_000 * 1000 - 1000) };

    const second = await issueAgentCredentialByOperator(operator, baseInput, deps);
    expect(second.credential_id).not.toBe(first.credential_id);

    const issued = sink.events.filter((e) => e.name === "agent_credential.issued_by_operator");
    expect(issued).toHaveLength(2);
    expect(issued[1]!.payload).toMatchObject({ reissue_of_credential_id: first.credential_id });
  });
});

describe("issueAgentCredentialByOperator — TTL clamping", () => {
  it("clamps absurd TTL inputs to MAX_TTL_SECONDS", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo } = makeRepo();
    const result = await issueAgentCredentialByOperator(
      operator,
      { ...baseInput, ttl_seconds: 999_999 },
      makeDeps(bundle, sink, repo),
    );
    expect(result.expires_at - 1_700_000_000).toBeLessThanOrEqual(7200);
  });

  it("clamps non-positive TTL inputs to a minimum of 1 second", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo } = makeRepo();
    const result = await issueAgentCredentialByOperator(
      operator,
      { ...baseInput, ttl_seconds: -10 },
      makeDeps(bundle, sink, repo),
    );
    expect(result.expires_at - 1_700_000_000).toBe(1);
  });
});
