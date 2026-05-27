import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_BROWSER_JOURNEY_CATEGORIES,
  DEFAULT_BROWSER_JOURNEYS,
  LocalFileProductResultStore,
  SyntheticBrowserJourneyDriver,
  runBrowserJourney,
  runDefaultBrowserJourneySuite,
  validateBrowserJourney,
  type BrowserJourney,
} from "../index.js";

describe("product browser gate runner", () => {
  let directories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      directories.map((directory) => rm(directory, { recursive: true, force: true })),
    );
    directories = [];
  });

  it("defines the required PTH06 browser journey registry", () => {
    const categories = new Set(DEFAULT_BROWSER_JOURNEYS.map((journey) => journey.category));

    expect(DEFAULT_BROWSER_JOURNEY_CATEGORIES).toEqual([
      "seeker_landing",
      "seeker_auth_profile",
      "employer_console",
      "employer_req_creation",
      "employer_candidate_review",
      "operator_credential_audit",
      "alpha_consent",
      "informational_only",
    ]);
    for (const category of DEFAULT_BROWSER_JOURNEY_CATEGORIES) {
      expect(categories.has(category)).toBe(true);
    }
    expect(DEFAULT_BROWSER_JOURNEYS.every((journey) => journey.mode === "gate")).toBe(true);
    expect(DEFAULT_BROWSER_JOURNEYS.every((journey) => journey.viewports.length > 0)).toBe(true);
  });

  it("rejects incomplete or unsafe browser journeys before execution", () => {
    const [validJourney] = DEFAULT_BROWSER_JOURNEYS;
    const invalid = {
      ...validJourney,
      journey_id: "",
      app_url: "https://example.test?token=secret",
      routes: [],
      viewports: [],
      artifact_policy: {
        screenshot: "never",
        video: "never",
        trace: "never",
        console_log: "never",
        network_log: "never",
      },
    } satisfies BrowserJourney;

    expect(validateBrowserJourney(validJourney)).toEqual([]);
    expect(validateBrowserJourney(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("journey_id must be non-empty"),
        expect.stringContaining("routes must include at least one route"),
        expect.stringContaining("viewports must include at least one viewport"),
        expect.stringContaining("app_url must not contain credential-bearing values"),
        expect.stringContaining("artifact_policy must capture at least one artifact kind"),
      ]),
    );
  });

  it("runs a browser journey with deterministic artifact capture", async () => {
    const journey = DEFAULT_BROWSER_JOURNEYS[0];
    const driver = new SyntheticBrowserJourneyDriver();

    const result = await runBrowserJourney(journey, {
      driver,
      run_id: "browser-run-seeker-landing",
    });

    expect(result.run.status).toBe("passed");
    expect(result.browser_artifacts.map((artifact) => artifact.kind)).toEqual([
      "screenshot",
      "video",
      "trace",
      "console_log",
      "network_log",
      "screenshot",
      "video",
      "trace",
      "console_log",
      "network_log",
    ]);
    expect(result.snapshot.browser_artifacts).toEqual(result.browser_artifacts);
    expect(result.run.assertions.every((assertion) => assertion.status === "passed")).toBe(true);
    expect(driver.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          journey_id: journey.journey_id,
          route_path: "/",
          viewport_name: "desktop",
        }),
      ]),
    );
  });

  it("attaches failure artifacts and keeps failed browser runs persistable", async () => {
    const journey = DEFAULT_BROWSER_JOURNEYS[0];
    const driver = new SyntheticBrowserJourneyDriver({
      fail_route_paths: ["/"],
    });

    const result = await runBrowserJourney(journey, {
      driver,
      run_id: "browser-run-failure",
    });

    expect(result.run.status).toBe("failed");
    expect(result.browser_artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "screenshot",
          redaction_status: "redacted",
        }),
      ]),
    );
    expect(result.snapshot.browser_artifacts).toHaveLength(10);
  });

  it("persists and reloads the default browser journey suite", async () => {
    const directory = await tempDirectory();
    const store = new LocalFileProductResultStore({ directory });

    const suite = await runDefaultBrowserJourneySuite({
      store,
      app_url: "http://127.0.0.1:3000",
    });

    expect(suite.results).toHaveLength(DEFAULT_BROWSER_JOURNEYS.length);
    expect(suite.summary).toBe(
      `${DEFAULT_BROWSER_JOURNEYS.length}/${DEFAULT_BROWSER_JOURNEYS.length} browser journey(s) passed`,
    );

    for (const result of suite.results) {
      await expect(store.getRun(result.run.run_id)).resolves.toMatchObject({
        run: { run_id: result.run.run_id, status: "passed" },
        browser_artifacts: result.browser_artifacts,
      });
    }

    await expect(store.listRuns({ mode: "gate", status: "passed" })).resolves.toHaveLength(
      DEFAULT_BROWSER_JOURNEYS.length,
    );
  });

  async function tempDirectory(): Promise<string> {
    const directory = await mkdtemp(path.join(os.tmpdir(), "browser-gate-test-"));
    directories.push(directory);
    return directory;
  }
});
