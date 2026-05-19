import { MissingScopeError } from "../../errors.js";
import {
  createReadRepo,
  defaultTicketProjection,
  type TicketProjectionMap,
  type TicketReadRepo,
} from "../../repo/read.js";
import {
  employerPrincipal,
  employerReqRow,
  matchRow,
  matcherPrincipal,
  operatorPrincipal,
  seekerPrincipal,
  seekerRow,
} from "./fixtures.js";
import { MemoryTicketStore, testUuid } from "./memory-store.js";

const READ_ALL_SCOPE = "tickets.read.all";

function seededReadRepo(): { repo: TicketReadRepo; store: MemoryTicketStore } {
  const store = new MemoryTicketStore();
  store.seedSeeker(seekerRow({ state: "matching" }));
  store.seedSeeker(
    seekerRow({
      seeker_ticket_id: testUuid(102),
      principal_id: testUuid(9102),
      identifier: "ST-2026-00002",
      state: "submitted",
      jurisdictions: ["US-NY"],
    }),
  );
  store.seedEmployerReq(employerReqRow({ state: "matching" }));
  store.seedEmployerReq(
    employerReqRow({
      employer_req_ticket_id: testUuid(202),
      principal_id: testUuid(9202),
      org_id: testUuid(8202),
      identifier: "ER-2026-00002",
      state: "open",
      jurisdictions: ["US-TX"],
    }),
  );
  store.seedMatch(matchRow({ state: "negotiating", run_id: testUuid(4001) }));
  return { repo: createReadRepo({ store }), store };
}

describe("ticket read primitives", () => {
  it("listByPrincipal filters to the caller's own tickets", async () => {
    const { repo } = seededReadRepo();

    await expect(
      repo.listByPrincipal(seekerPrincipal, seekerPrincipal.principal_id),
    ).resolves.toMatchObject({
      rows: [expect.objectContaining({ principal_id: seekerPrincipal.principal_id })],
      next_cursor: null,
    });
  });

  it("listByOrg returns only requisitions for the caller's organization", async () => {
    const { repo } = seededReadRepo();

    await expect(
      repo.listByOrg(employerPrincipal, employerPrincipal.org_id!, "employer_req"),
    ).resolves.toMatchObject({
      rows: [expect.objectContaining({ org_id: employerPrincipal.org_id })],
      next_cursor: null,
    });
  });

  it("listByOrg rejects a human caller outside the organization", async () => {
    const { repo } = seededReadRepo();

    await expect(repo.listByOrg(employerPrincipal, testUuid(8202), "employer_req")).rejects.toThrow(
      MissingScopeError,
    );
  });

  it("listByState requires an operator or service read scope when no tier-side filter applies", async () => {
    const { repo } = seededReadRepo();

    await expect(repo.listByState(seekerPrincipal, "match", "negotiating")).rejects.toThrow(
      MissingScopeError,
    );
    await expect(
      repo.listByState({ ...matcherPrincipal, scopes: [READ_ALL_SCOPE] }, "match", "negotiating"),
    ).resolves.toMatchObject({
      rows: [expect.objectContaining({ state: "negotiating" })],
      next_cursor: null,
    });
  });

  it("listByJurisdiction filters by jurisdiction without crossing principal boundaries", async () => {
    const { repo } = seededReadRepo();

    await expect(
      repo.listByJurisdiction(seekerPrincipal, "US-CA", "seeker"),
    ).resolves.toMatchObject({
      rows: [
        expect.objectContaining({
          principal_id: seekerPrincipal.principal_id,
          jurisdictions: ["US-CA"],
        }),
      ],
      next_cursor: null,
    });
  });

  it("fetchById returns the full row for the owning seeker", async () => {
    const { repo } = seededReadRepo();

    await expect(repo.fetchById(seekerPrincipal, "seeker", testUuid(101))).resolves.toMatchObject({
      seeker_ticket_id: testUuid(101),
      comp_band_min: 100000,
      comp_band_max: 150000,
    });
  });

  it("fetchById returns a reduced projection for cross-side employer requisitions", async () => {
    const { repo } = seededReadRepo();

    const result = await repo.fetchById(seekerPrincipal, "employer_req", testUuid(201));

    expect(result).toMatchObject({
      ticket_id: testUuid(201),
      identifier: "ER-2026-00001",
      kind: "employer_req",
      state: "matching",
      jurisdictions: ["US-CA"],
      role_title: "Senior Engineer",
    });
    expect(result).not.toHaveProperty("comp_band_min");
    expect(result).not.toHaveProperty("comp_band_max");
  });

  it("exports a default projection adapter for F09 to replace", () => {
    const projection = defaultTicketProjection.employer_req.project(
      employerReqRow({ state: "matching" }),
    );

    expect(projection).toMatchObject({
      ticket_id: testUuid(201),
      identifier: "ER-2026-00001",
      kind: "employer_req",
      state: "matching",
      jurisdictions: ["US-CA"],
      role_title: "Senior Engineer",
    });
    expect(projection).not.toHaveProperty("comp_band_min");
  });

  it("accepts a projection adapter override", async () => {
    const store = new MemoryTicketStore();
    store.seedEmployerReq(employerReqRow({ state: "matching" }));
    const projection: TicketProjectionMap = {
      ...defaultTicketProjection,
      employer_req: {
        kind: "employer_req",
        project(row) {
          return {
            ...defaultTicketProjection.employer_req.project(row),
            role_title: "redacted-by-test-adapter",
          };
        },
      },
    };
    const repo = createReadRepo({ store, projection });

    await expect(
      repo.fetchById(seekerPrincipal, "employer_req", testUuid(201)),
    ).resolves.toMatchObject({
      role_title: "redacted-by-test-adapter",
    });
  });

  it("fetchByIdentifier applies the same access rules as fetchById", async () => {
    const { repo } = seededReadRepo();

    await expect(
      repo.fetchByIdentifier(employerPrincipal, "employer_req", "ER-2026-00001"),
    ).resolves.toMatchObject({
      employer_req_ticket_id: testUuid(201),
      org_id: employerPrincipal.org_id,
    });
  });

  it("fetchMatchJoinGraph returns refs and decision locus for scoped service callers", async () => {
    const { repo } = seededReadRepo();

    await expect(
      repo.fetchMatchJoinGraph({ ...matcherPrincipal, scopes: [READ_ALL_SCOPE] }, testUuid(301)),
    ).resolves.toMatchObject({
      match: expect.objectContaining({ match_ticket_id: testUuid(301) }),
      seeker: expect.objectContaining({ seeker_ticket_id: testUuid(101) }),
      employer_req: expect.objectContaining({ employer_req_ticket_id: testUuid(201) }),
      decision_locus_jurisdiction: "US-CA",
    });
  });

  it("fetchMatchJoinGraph rejects unscoped human operators", async () => {
    const { repo } = seededReadRepo();

    await expect(repo.fetchMatchJoinGraph(operatorPrincipal, testUuid(301))).rejects.toThrow(
      MissingScopeError,
    );
  });
});
