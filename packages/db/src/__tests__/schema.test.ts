// F02 T009 — Drizzle schema for `principals` and `organizations`
// (test-first). The tests assert the *type-level* shape of the
// inferred row types so consumers (`@spyglass/auth` materializer) can
// rely on stable column names and nullability across schema changes.

import {
  organizations,
  principals,
  type NewOrganization,
  type NewPrincipal,
  type Organization,
  type Principal,
} from "../schema/index.js";

describe("F02 schema — principals (data-model §principals)", () => {
  it("exposes the expected columns at the type level", () => {
    const sample: NewPrincipal = {
      kind: "human",
      external_idp: "clerk",
      external_id: "user_abc",
      tier: "seeker",
      display_name: "Test Seeker",
    };
    expect(sample.kind).toBe("human");
  });

  it("inferred Principal row carries timestamps populated by the DB", () => {
    const _typeOnly: Principal = {
      principal_id: "00000000-0000-0000-0000-000000000001",
      kind: "human",
      external_idp: "clerk",
      external_id: "user_abc",
      tier: "seeker",
      org_id: null,
      service_name: null,
      service_version: null,
      display_name: null,
      created_at: new Date(),
      updated_at: new Date(),
      disabled_at: null,
      disabled_reason: null,
    };
    expect(_typeOnly.kind).toBe("human");
  });

  it("table name is 'principals'", () => {
    // drizzle-orm exposes table metadata via Symbol.for('drizzle:Name').
    const name = (principals as unknown as Record<symbol, unknown>)[Symbol.for("drizzle:Name")];
    expect(name).toBe("principals");
  });
});

describe("F02 schema — organizations (data-model §organizations)", () => {
  it("inferred row type carries the discriminator", () => {
    const sample: NewOrganization = {
      clerk_org_id: "org_abc",
      kind: "employer",
      display_name: "Acme Corp",
    };
    expect(sample.kind).toBe("employer");
  });

  it("organizations.kind discriminator includes 'operator'", () => {
    const sample: NewOrganization = {
      clerk_org_id: "org_xyz",
      kind: "operator",
      display_name: "Spyglass Operators",
    };
    expect(sample.kind).toBe("operator");
  });

  it("inferred Organization row exposes the expected timestamps", () => {
    const _typeOnly: Organization = {
      org_id: "00000000-0000-0000-0000-000000000010",
      clerk_org_id: "org_abc",
      kind: "employer",
      display_name: "Acme Corp",
      created_at: new Date(),
      disabled_at: null,
    };
    expect(_typeOnly.kind).toBe("employer");
  });

  it("table name is 'organizations'", () => {
    const name = (organizations as unknown as Record<symbol, unknown>)[Symbol.for("drizzle:Name")];
    expect(name).toBe("organizations");
  });
});
