// F02 T051 + T055 — Service-credential issuance + rotation tests
// (FR-23..FR-26a, FR-25, NFR-5, EC-7).
//
// Bootstrap exchange (FR-26 / FR-26a): a deploy-time process holding
// a one-shot env-manifest secret exchanges it for an F02-signed
// service credential. There is no calling `Principal`; the secret IS
// the auth. Rotation (FR-25) is principal-authenticated via the
// existing live credential and bumps `rotation_generation` so old
// generations remain verifiable until their `expires_at` (NFR-5).

import { generateEdDSAKeypair } from "../issuer/keygen.js";
import {
  bootstrapServiceCredential,
  rotateServiceCredential,
  SERVICE_CREDENTIAL_ROTATION_SCOPE,
  ServiceIssuanceConflictError,
  InvalidBootstrapSecretError,
  ServiceUniqueViolationError,
  type BootstrapServiceInput,
  type RotateServiceInput,
  type ServiceCredentialRepo,
  type ServiceCredentialRow,
  type BootstrapSecretChecker,
} from "../issuer/service-issuance.js";
import { verifyServiceCredential } from "../verifier/service-verify.js";
import type { JwksProvider, SigningKeyMaterial } from "../issuer/key-source.js";
import type { AuditEventSink } from "../materialize/types.js";
import type { ServicePrincipal } from "../principal.js";
import type { RevocationChecker } from "../verifier/verify.js";
import type { KeyObject } from "node:crypto";

const SERVICE_PRINCIPAL_ID = "00000000-0000-0000-0000-0000000serv01";
const BOOTSTRAP_SECRET = "boot-secret-v1";

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
  const rows: ServiceCredentialRow[] = [];
  let inserts = 0;
  let nextInsertThrows: Error | null = null;
  const repo: ServiceCredentialRepo = {
    async findByPrincipalAndGeneration(input) {
      return (
        rows.find(
          (r) =>
            r.principal_id === input.principal_id &&
            r.rotation_generation === input.rotation_generation,
        ) ?? null
      );
    },
    async findLatestActiveByPrincipal(input) {
      const live = rows.filter(
        (r) =>
          r.principal_id === input.principal_id &&
          r.revoked_at === null &&
          r.expires_at.getTime() > input.now.getTime(),
      );
      if (live.length === 0) return null;
      return live.reduce((a, b) => (a.rotation_generation >= b.rotation_generation ? a : b));
    },
    async insert(row) {
      if (nextInsertThrows !== null) {
        const err = nextInsertThrows;
        nextInsertThrows = null;
        throw err;
      }
      inserts += 1;
      const stored: ServiceCredentialRow = { ...row, revoked_at: null };
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

const validSecret: BootstrapSecretChecker = {
  async check(input) {
    return (
      input.service_principal_id === SERVICE_PRINCIPAL_ID &&
      input.presented_secret === BOOTSTRAP_SECRET
    );
  },
};

const baseBootstrap: BootstrapServiceInput = {
  service_principal_id: SERVICE_PRINCIPAL_ID,
  bootstrap_secret: BOOTSTRAP_SECRET,
  scope_set: ["service.dossier.sign", "service.audit.write"],
};

function makeDeps(
  bundle: Bundle,
  sink: ReturnType<typeof makeSink>,
  repo: ServiceCredentialRepo,
  bootstrapChecker: BootstrapSecretChecker = validSecret,
) {
  let n = 0;
  return {
    repo,
    sink,
    signingKey: bundle.signingKey,
    issuer: "https://spyglass.test",
    audience: "spyglass.services",
    bootstrapChecker,
    newCredentialId: () =>
      `00000000-0000-0000-0000-00000000s${(n++).toString(16).padStart(3, "0")}`,
    now: () => 1_700_000_000,
    correlationId: () => "c-test",
  };
}

// ---------------------------------------------------------------------
// Bootstrap exchange (T051 — FR-26, FR-26a)
// ---------------------------------------------------------------------

describe("bootstrapServiceCredential — happy path", () => {
  it("mints a verifiable service JWT and persists row at generation 1", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo, rows } = makeRepo();

    const result = await bootstrapServiceCredential(baseBootstrap, makeDeps(bundle, sink, repo));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.rotation_generation).toBe(1);
    expect(rows[0]?.principal_id).toBe(SERVICE_PRINCIPAL_ID);
    expect(result.principal_id).toBe(SERVICE_PRINCIPAL_ID);
    expect(result.rotation_generation).toBe(1);
    expect(result.scopes).toEqual(baseBootstrap.scope_set);

    const claims = await verifyServiceCredential({
      token: result.jwt,
      expectedIssuer: "https://spyglass.test",
      expectedAudience: "spyglass.services",
      jwks: bundle.jwks,
      revocations: bundle.revocations,
      now: () => 1_700_000_000 + 60,
    });
    expect(claims.jti).toBe(result.credential_id);
    expect(claims.sub).toBe(SERVICE_PRINCIPAL_ID);
    expect(claims.scopes).toEqual(baseBootstrap.scope_set);
    expect(claims.generation).toBe(1);

    expect(sink.events.map((e) => e.name)).toEqual(["service_credential.bootstrapped"]);
  });

  it("clamps ttl_seconds to the FR-20 ceiling (7200s)", async () => {
    const bundle = await makeBundle();
    const { repo } = makeRepo();
    const result = await bootstrapServiceCredential(
      { ...baseBootstrap, ttl_seconds: 999_999 },
      makeDeps(bundle, makeSink(), repo),
    );
    expect(result.expires_at - 1_700_000_000).toBe(7200);
  });
});

describe("bootstrapServiceCredential — secret + scope validation", () => {
  it("rejects an invalid bootstrap secret and emits bootstrap_denied", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo, rows } = makeRepo();

    await expect(
      bootstrapServiceCredential(
        { ...baseBootstrap, bootstrap_secret: "wrong" },
        makeDeps(bundle, sink, repo),
      ),
    ).rejects.toBeInstanceOf(InvalidBootstrapSecretError);

    expect(rows).toHaveLength(0);
    expect(sink.events.map((e) => e.name)).toEqual(["service_credential.bootstrap_denied"]);
    expect(sink.events[0]?.payload.reason).toBe("invalid_bootstrap_secret");
  });

  it("rejects an empty scope_set (FR-19 by analogy)", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo, rows } = makeRepo();

    await expect(
      bootstrapServiceCredential({ ...baseBootstrap, scope_set: [] }, makeDeps(bundle, sink, repo)),
    ).rejects.toThrow(/scope/i);

    expect(rows).toHaveLength(0);
    expect(sink.events[0]?.name).toBe("service_credential.bootstrap_denied");
    expect(sink.events[0]?.payload.reason).toBe("empty_scope_set");
  });
});

describe("bootstrapServiceCredential — idempotency / race", () => {
  it("rejects a second bootstrap once generation 1 already exists", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo, insertCount } = makeRepo();
    const deps = makeDeps(bundle, sink, repo);

    await bootstrapServiceCredential(baseBootstrap, deps);
    await expect(bootstrapServiceCredential(baseBootstrap, deps)).rejects.toBeInstanceOf(
      ServiceIssuanceConflictError,
    );

    expect(insertCount()).toBe(1);
    const names = sink.events.map((e) => e.name);
    expect(names).toEqual([
      "service_credential.bootstrapped",
      "service_credential.bootstrap_denied",
    ]);
    expect(sink.events[1]?.payload.reason).toBe("generation_conflict");
  });

  it("maps a ServiceUniqueViolationError on insert (race) to ServiceIssuanceConflictError", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();

    const racedRow: ServiceCredentialRow = {
      credential_id: "00000000-0000-0000-0000-0000000000aa",
      principal_id: SERVICE_PRINCIPAL_ID,
      scope_set: baseBootstrap.scope_set,
      kid: bundle.signingKey.kid,
      rotation_generation: 1,
      expires_at: new Date((1_700_000_000 + 1800) * 1000),
      revoked_at: null,
    };
    let firstFindReturnedNull = false;
    const racyRepo: ServiceCredentialRepo = {
      async findByPrincipalAndGeneration() {
        if (!firstFindReturnedNull) {
          firstFindReturnedNull = true;
          return null;
        }
        return racedRow;
      },
      async findLatestActiveByPrincipal() {
        return null;
      },
      async insert() {
        throw new ServiceUniqueViolationError();
      },
    };

    const deps = makeDeps(bundle, sink, racyRepo);
    await expect(bootstrapServiceCredential(baseBootstrap, deps)).rejects.toBeInstanceOf(
      ServiceIssuanceConflictError,
    );
    expect(sink.events.map((e) => e.name)).toEqual(["service_credential.bootstrap_denied"]);
    expect(sink.events[0]?.payload.reason).toBe("generation_race");
  });
});

describe("bootstrapServiceCredential — audit-sink resilience", () => {
  it("surfaces the typed denial error even if the audit sink emit fails", async () => {
    const bundle = await makeBundle();
    const { repo } = makeRepo();
    const failingSink: AuditEventSink = {
      async emit() {
        throw new Error("audit pipeline unhealthy");
      },
    };
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(
        bootstrapServiceCredential(
          { ...baseBootstrap, bootstrap_secret: "wrong" },
          {
            ...makeDeps(bundle, makeSink(), repo),
            sink: failingSink,
          },
        ),
      ).rejects.toBeInstanceOf(InvalidBootstrapSecretError);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------
// Rotation (T055 — FR-25, NFR-5)
// ---------------------------------------------------------------------

const callerWithRotationScope: ServicePrincipal = {
  principal_id: SERVICE_PRINCIPAL_ID,
  issued_at: 0,
  correlation_id: "c1",
  kind: "service",
  service_name: "dossier-signer",
  service_version: "1.0.0",
  scopes: [SERVICE_CREDENTIAL_ROTATION_SCOPE],
};

const rotateInput: RotateServiceInput = {
  service_principal_id: SERVICE_PRINCIPAL_ID,
  scope_set: ["service.dossier.sign", "service.audit.write"],
};

describe("rotateServiceCredential — FR-25 / NFR-5", () => {
  it("increments rotation_generation and returns a verifiable JWT", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo, rows } = makeRepo();
    const deps = makeDeps(bundle, sink, repo);

    const initial = await bootstrapServiceCredential(baseBootstrap, deps);
    expect(initial.rotation_generation).toBe(1);

    const rotated = await rotateServiceCredential(callerWithRotationScope, rotateInput, deps);

    expect(rotated.rotation_generation).toBe(2);
    expect(rotated.credential_id).not.toBe(initial.credential_id);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.rotation_generation).sort()).toEqual([1, 2]);

    const newClaims = await verifyServiceCredential({
      token: rotated.jwt,
      expectedIssuer: "https://spyglass.test",
      expectedAudience: "spyglass.services",
      jwks: bundle.jwks,
      revocations: bundle.revocations,
      now: () => 1_700_000_000 + 60,
    });
    expect(newClaims.generation).toBe(2);

    const namesEmitted = sink.events.map((e) => e.name);
    expect(namesEmitted).toEqual(["service_credential.bootstrapped", "service_credential.rotated"]);
    const rotatedEvent = sink.events.find((e) => e.name === "service_credential.rotated");
    expect(rotatedEvent?.payload.from_generation).toBe(1);
    expect(rotatedEvent?.payload.to_generation).toBe(2);
  });

  it("leaves the prior credential verifiable until its expires_at (NFR-5)", async () => {
    const bundle = await makeBundle();
    const { repo } = makeRepo();
    const deps = makeDeps(bundle, makeSink(), repo);

    const initial = await bootstrapServiceCredential(baseBootstrap, deps);
    await rotateServiceCredential(callerWithRotationScope, rotateInput, deps);

    // The first credential's JWT must still verify before its expiry.
    const claims = await verifyServiceCredential({
      token: initial.jwt,
      expectedIssuer: "https://spyglass.test",
      expectedAudience: "spyglass.services",
      jwks: bundle.jwks,
      revocations: bundle.revocations,
      now: () => 1_700_000_000 + 60,
    });
    expect(claims.generation).toBe(1);
  });

  it("rejects rotation when no prior credential exists", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo, rows } = makeRepo();
    const deps = makeDeps(bundle, sink, repo);

    await expect(
      rotateServiceCredential(callerWithRotationScope, rotateInput, deps),
    ).rejects.toThrow(/bootstrap|prior|no credential/i);

    expect(rows).toHaveLength(0);
    expect(sink.events[0]?.name).toBe("service_credential.rotation_denied");
    expect(sink.events[0]?.payload.reason).toBe("no_prior_credential");
  });

  it("rejects rotation by a caller missing the rotation scope", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo } = makeRepo();
    const deps = makeDeps(bundle, sink, repo);

    await bootstrapServiceCredential(baseBootstrap, deps);

    const lowScope: ServicePrincipal = { ...callerWithRotationScope, scopes: ["other.scope"] };
    await expect(rotateServiceCredential(lowScope, rotateInput, deps)).rejects.toThrow(/Scope/i);

    expect(
      sink.events.find((e) => e.name === "service_credential.rotation_denied")?.payload.reason,
    ).toBe("scope_insufficient");
  });

  it("rejects rotation when the latest credential is revoked (FR-25 revoke semantics)", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo, rows } = makeRepo();
    const deps = makeDeps(bundle, sink, repo);

    await bootstrapServiceCredential(baseBootstrap, deps);
    rows[0]!.revoked_at = new Date();

    await expect(
      rotateServiceCredential(callerWithRotationScope, rotateInput, deps),
    ).rejects.toThrow(/bootstrap|prior|no credential/i);

    expect(rows).toHaveLength(1);
    expect(
      sink.events.find((e) => e.name === "service_credential.rotation_denied")?.payload.reason,
    ).toBe("no_prior_credential");
  });

  it("rejects rotation when the latest credential is expired", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo, rows } = makeRepo();

    // First bootstrap with default deps (now=1_700_000_000, ttl=1800).
    await bootstrapServiceCredential(baseBootstrap, makeDeps(bundle, sink, repo));
    expect(rows[0]?.expires_at.getTime()).toBe((1_700_000_000 + 1800) * 1000);

    // Build a second deps with a clock past expiry.
    const lateDeps = {
      ...makeDeps(bundle, sink, repo),
      now: () => 1_700_000_000 + 1801,
    };
    await expect(
      rotateServiceCredential(callerWithRotationScope, rotateInput, lateDeps),
    ).rejects.toThrow(/bootstrap|prior|no credential/i);

    expect(
      sink.events.find((e) => e.name === "service_credential.rotation_denied")?.payload.reason,
    ).toBe("no_prior_credential");
  });

  it("rejects rotation when the caller is not the principal being rotated", async () => {
    const bundle = await makeBundle();
    const sink = makeSink();
    const { repo } = makeRepo();
    const deps = makeDeps(bundle, sink, repo);

    await bootstrapServiceCredential(baseBootstrap, deps);

    const otherCaller: ServicePrincipal = {
      ...callerWithRotationScope,
      principal_id: "00000000-0000-0000-0000-0000000serv99",
    };
    await expect(rotateServiceCredential(otherCaller, rotateInput, deps)).rejects.toThrow(
      /principal|caller/i,
    );

    expect(
      sink.events.find((e) => e.name === "service_credential.rotation_denied")?.payload.reason,
    ).toBe("principal_mismatch");
  });
});
