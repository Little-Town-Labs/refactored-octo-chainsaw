// F02 T042 — Agent-credential issuance tests (FR-17, FR-19, FR-20, EC-8).

import {
  AGENT_CREDENTIAL_ISSUE_SCOPE,
  DEFAULT_TTL_SECONDS,
  IssuanceConflictError,
  issueAgentCredential,
  UniqueViolationError,
  type AgentCredentialRepo,
  type AgentCredentialRow,
  type IssueAgentInput,
} from "../issuer/issuance.js";
import { generateEdDSAKeypair } from "../issuer/keygen.js";
import { verifyAgentCredential, type RevocationChecker } from "../verifier/verify.js";
import type { JwksProvider, SigningKeyMaterial } from "../issuer/key-source.js";
import type { AuditEventSink } from "../materialize/types.js";
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
  let inserts = 0;
  let nextInsertThrows: Error | null = null;
  const repo: AgentCredentialRepo = {
    async findByIdempotencyKey(input) {
      // Production semantics: return any matching row regardless of
      // revocation status; orchestrator gates on the row state.
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
      if (nextInsertThrows !== null) {
        const err = nextInsertThrows;
        nextInsertThrows = null;
        throw err;
      }
      inserts += 1;
      const stored: AgentCredentialRow = { ...row, revoked_at: null };
      rows.push(stored);
      return stored;
    },
  };
  return {
    repo,
    rows,
    insertCount: () => inserts,
    setNextInsertThrow: (err: Error) => {
      nextInsertThrows = err;
    },
  };
}

const service: ServicePrincipal = {
  principal_id: "00000000-0000-0000-0000-00000000000s",
  issued_at: 0,
  correlation_id: "c1",
  kind: "service",
  service_name: "parley-runner",
  service_version: "1.0.0",
  scopes: [AGENT_CREDENTIAL_ISSUE_SCOPE],
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

describe("issueAgentCredential — happy path", () => {
  it("mints a verifiable JWT and persists the row", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo, rows } = makeRepo();
    const result = await issueAgentCredential(service, baseInput, makeDeps(bundle, sink, repo));

    expect(rows).toHaveLength(1);
    expect(result.principal_id).toBe(baseInput.agent_principal_id);
    expect(result.scopes).toEqual(baseInput.scope_set);
    expect(result.expires_at - 1_700_000_000).toBe(DEFAULT_TTL_SECONDS);

    const claims = await verifyAgentCredential({
      token: result.jwt,
      expectedIssuer: "https://spyglass.test",
      expectedAudience: "spyglass.runner",
      jwks: bundle.jwks,
      revocations: bundle.revocations,
      now: () => 1_700_000_000 + 60,
    });
    expect(claims.jti).toBe(result.credential_id);

    expect(sink.events.map((e) => e.name)).toEqual(["agent_credential.issued"]);
  });

  it("clamps ttl_seconds to the FR-20 ceiling", async () => {
    const bundle = await makeBundle();
    const { repo } = makeRepo();
    const result = await issueAgentCredential(
      service,
      { ...baseInput, ttl_seconds: 999_999 },
      makeDeps(bundle, makeSink(), repo),
    );
    expect(result.expires_at - 1_700_000_000).toBe(7200);
  });
});

describe("issueAgentCredential — authorization", () => {
  const human: HumanPrincipal = {
    principal_id: "00000000-0000-0000-0000-00000000h001",
    issued_at: 0,
    correlation_id: "c1",
    kind: "human",
    tier: "operator",
    external_idp: "clerk",
    external_id: "user_x",
  };
  const agent: AgentPrincipal = {
    principal_id: "00000000-0000-0000-0000-00000000a001",
    issued_at: 0,
    correlation_id: "c1",
    kind: "agent",
    run_id: "r",
    side: "seeker",
    contract_id: "k",
    contract_version: "v",
    ticket_id: "t",
    scopes: [AGENT_CREDENTIAL_ISSUE_SCOPE],
  };

  it("rejects a human caller and emits issue_denied", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo, rows } = makeRepo();
    await expect(
      issueAgentCredential(human, baseInput, makeDeps(bundle, sink, repo)),
    ).rejects.toThrow(/Role/i);
    expect(rows).toHaveLength(0);
    expect(sink.events.map((e) => e.name)).toEqual(["agent_credential.issue_denied"]);
    expect(sink.events[0]?.payload.reason).toBe("wrong_caller_kind:human");
  });

  it("rejects an agent caller", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo } = makeRepo();
    await expect(
      issueAgentCredential(agent, baseInput, makeDeps(bundle, sink, repo)),
    ).rejects.toThrow();
    expect(sink.events[0]?.name).toBe("agent_credential.issue_denied");
  });

  it("rejects a service caller missing the scope and emits issue_denied", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const lowScope: ServicePrincipal = { ...service, scopes: ["other.scope"] };
    const { repo } = makeRepo();
    await expect(
      issueAgentCredential(lowScope, baseInput, makeDeps(bundle, sink, repo)),
    ).rejects.toThrow(/Scope/i);
    expect(sink.events[0]?.payload.reason).toBe("scope_insufficient");
  });

  it("audit-sink failure does not mask the typed deny (T068/MEDIUM-1, T070 regression)", async () => {
    // Sink that throws on every emit; the typed deny error must
    // still reach the caller — sink failures route to stderr only.
    const failingSink: AuditEventSink = {
      async emit() {
        throw new Error("simulated audit sink outage");
      },
    };
    const lowScope: ServicePrincipal = { ...service, scopes: ["other.scope"] };
    const bundle = await makeBundle();
    const { repo } = makeRepo();
    const deps = makeDeps(bundle, failingSink as unknown as ReturnType<typeof makeSink>, repo);
    const originalErr = console.error;
    console.error = () => {};
    try {
      await expect(issueAgentCredential(lowScope, baseInput, deps)).rejects.toThrow(/Scope/i);
    } finally {
      console.error = originalErr;
    }
  });
});

describe("issueAgentCredential — idempotency (EC-8)", () => {
  it("throws IssuanceConflictError on a duplicate within TTL and emits issue_denied", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo, insertCount } = makeRepo();
    const deps = makeDeps(bundle, sink, repo);

    await issueAgentCredential(service, baseInput, deps);
    await expect(issueAgentCredential(service, baseInput, deps)).rejects.toBeInstanceOf(
      IssuanceConflictError,
    );

    expect(insertCount()).toBe(1);
    const names = sink.events.map((e) => e.name);
    expect(names).toEqual(["agent_credential.issued", "agent_credential.issue_denied"]);
    expect(sink.events[1]?.payload.reason).toBe("idempotency_conflict");
  });

  it("re-issues a fresh credential when the existing row is revoked, marking the reissue", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo, rows, insertCount } = makeRepo();
    const deps = makeDeps(bundle, sink, repo);

    const first = await issueAgentCredential(service, baseInput, deps);
    rows[0]!.revoked_at = new Date();
    const second = await issueAgentCredential(service, baseInput, deps);

    expect(second.credential_id).not.toBe(first.credential_id);
    expect(insertCount()).toBe(2);
    const reissueEvent = sink.events.find(
      (e) =>
        e.name === "agent_credential.issued" && e.payload.reissue_of_credential_id !== undefined,
    );
    expect(reissueEvent?.payload.reissue_of_credential_id).toBe(first.credential_id);
  });

  it("maps a UniqueViolationError on insert (race) to IssuanceConflictError", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();

    // Hand-rolled racy repo: first find returns null (we lose the
    // race window), insert throws UniqueViolationError, second find
    // returns the row another worker just wrote.
    const racedRow: AgentCredentialRow = {
      credential_id: "00000000-0000-0000-0000-0000000000aa",
      principal_id: baseInput.agent_principal_id,
      run_id: baseInput.run_id,
      side: baseInput.side,
      contract_id: baseInput.contract_id,
      contract_version: baseInput.contract_version,
      scope_set: baseInput.scope_set,
      kid: bundle.signingKey.kid,
      expires_at: new Date((1_700_000_000 + 1800) * 1000),
      revoked_at: null,
    };
    let finds = 0;
    const racyRepo: AgentCredentialRepo = {
      async findByIdempotencyKey() {
        finds += 1;
        return finds === 1 ? null : racedRow;
      },
      async insert() {
        throw new UniqueViolationError();
      },
    };

    const deps = makeDeps(bundle, sink, racyRepo);
    await expect(issueAgentCredential(service, baseInput, deps)).rejects.toBeInstanceOf(
      IssuanceConflictError,
    );
    expect(sink.events.map((e) => e.name)).toEqual(["agent_credential.issue_denied"]);
    expect(sink.events[0]?.payload.reason).toBe("idempotency_race");
  });
});

describe("issueAgentCredential — failure compensation", () => {
  it("does NOT persist a row when minting fails", async () => {
    const sink = makeSink();
    const { repo, rows } = makeRepo();
    // Build deps with a deliberately-bad signing key so mint throws.
    const badKey: SigningKeyMaterial = {
      kid: "bad",
      // @ts-expect-error - intentionally invalid for this failure test.
      privateKey: { type: "private", asymmetricKeyType: "ed25519" },
      algorithm: "EdDSA",
    };
    const deps = {
      repo,
      sink,
      signingKey: badKey,
      issuer: "https://spyglass.test",
      audience: "spyglass.runner",
      newCredentialId: () => "00000000-0000-0000-0000-0000000000c0",
      now: () => 1_700_000_000,
      correlationId: () => "c-test",
    };
    await expect(issueAgentCredential(service, baseInput, deps)).rejects.toThrow();
    expect(rows).toHaveLength(0);
    expect(sink.events[0]?.name).toBe("agent_credential.issue_denied");
    expect(String(sink.events[0]?.payload.reason)).toMatch(/^mint_failed:/);
  });
});
