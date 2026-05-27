import type {
  BrowserJourney,
  BrowserJourneyDriver,
  BrowserJourneyVisitResult,
  ProductBrowserArtifactRecord,
  ProductResultStore,
  ProductResultStoreSnapshot,
  ScenarioAssertion,
  ScenarioEnvironment,
  ScenarioRunResult,
} from "../contracts.js";
import { createProductResultStoreSnapshot } from "../results/store.js";
import { runScenario } from "../runner.js";
import { createBrowserArtifactRecords } from "./artifacts.js";
import {
  browserJourneyWithAppUrl,
  DEFAULT_BROWSER_JOURNEYS,
  DEFAULT_BROWSER_APP_URL,
} from "./journeys.js";
import { SyntheticBrowserJourneyDriver } from "./synthetic-driver.js";
import { assertValidBrowserJourney } from "./validation.js";

export interface BrowserJourneyRun {
  readonly journey: BrowserJourney;
  readonly run: ScenarioRunResult;
  readonly browser_artifacts: readonly ProductBrowserArtifactRecord[];
  readonly snapshot: ProductResultStoreSnapshot;
  readonly visits: readonly BrowserJourneyVisitResult[];
}

export interface RunBrowserJourneyOptions {
  readonly driver?: BrowserJourneyDriver;
  readonly store?: ProductResultStore;
  readonly run_id?: string;
  readonly environment?: ScenarioEnvironment;
  readonly app_url?: string;
}

export interface BrowserJourneySuiteResult {
  readonly results: readonly BrowserJourneyRun[];
  readonly summary: string;
}

export async function runBrowserJourney(
  journeyInput: BrowserJourney,
  options: RunBrowserJourneyOptions = {},
): Promise<BrowserJourneyRun> {
  const journey = options.app_url
    ? browserJourneyWithAppUrl(journeyInput, options.app_url)
    : journeyInput;
  assertValidBrowserJourney(journey);

  const driver = options.driver ?? new SyntheticBrowserJourneyDriver();
  const runId = options.run_id ?? `browser-gate-${journey.journey_id}`;
  const visits: BrowserJourneyVisitResult[] = [];
  const browserArtifacts: ProductBrowserArtifactRecord[] = [];

  const scenario = {
    scenario_id: journey.journey_id,
    version: "1.0.0",
    title: journey.title,
    description: "Product browser gate journey executed through a Playwright-compatible driver.",
    mode: journey.mode,
    owner: "product-test-harness",
    ...(journey.tags ? { tags: journey.tags } : {}),
    steps: [
      {
        step_id: "browser-journey",
        name: "Execute browser journey routes and viewports",
        run: async () => {
          for (const route of journey.routes) {
            for (const viewport of journey.viewports) {
              const visit = await driver.visit({
                run_id: runId,
                journey,
                route,
                viewport,
                url: new URL(route.path, journey.app_url).toString(),
              });
              visits.push(visit);
              browserArtifacts.push(
                ...createBrowserArtifactRecords({
                  run_id: runId,
                  scenario_id: journey.journey_id,
                  journey,
                  route,
                  viewport,
                  status: visit.status,
                }),
              );
            }
          }

          const failedVisits = visits.filter((visit) => visit.status === "failed");
          return {
            status: failedVisits.length > 0 ? ("failed" as const) : ("passed" as const),
            assertions: browserAssertions(journey, visits, browserArtifacts),
            evidence_refs: visits.flatMap((visit) => visit.evidence_refs),
            metadata: {
              driver: driver.driver_name,
              journey_id: journey.journey_id,
              route_count: journey.routes.length,
              viewport_count: journey.viewports.length,
              artifact_count: browserArtifacts.length,
            },
          };
        },
      },
    ],
  };

  const run = await runScenario(scenario, {
    run_id: runId,
    environment: options.environment ?? {
      label: "local-browser-gate",
      app_url: journey.app_url,
    },
    metadata: {
      browser_driver: driver.driver_name,
      journey_id: journey.journey_id,
      category: journey.category,
    },
    now: deterministicClock(),
  });

  const snapshot = createProductResultStoreSnapshot({
    run,
    browser_artifacts: browserArtifacts,
    created_at: "2026-05-27T12:30:00.000Z",
  });

  if (options.store) await options.store.saveRun(snapshot);

  return {
    journey,
    run,
    browser_artifacts: browserArtifacts,
    snapshot,
    visits,
  };
}

export async function runDefaultBrowserJourneySuite(
  options: RunBrowserJourneyOptions = {},
): Promise<BrowserJourneySuiteResult> {
  const results: BrowserJourneyRun[] = [];
  for (const journey of DEFAULT_BROWSER_JOURNEYS) {
    results.push(
      await runBrowserJourney(
        browserJourneyWithAppUrl(journey, options.app_url ?? DEFAULT_BROWSER_APP_URL),
        {
          ...options,
          run_id: `browser-gate-${journey.journey_id}`,
        },
      ),
    );
  }

  const passed = results.filter((result) => result.run.status === "passed").length;
  return {
    results,
    summary: `${passed}/${results.length} browser journey(s) passed`,
  };
}

function browserAssertions(
  journey: BrowserJourney,
  visits: readonly BrowserJourneyVisitResult[],
  artifacts: readonly ProductBrowserArtifactRecord[],
): readonly ScenarioAssertion[] {
  const failedVisits = visits.filter((visit) => visit.status === "failed");
  return [
    {
      assertion_id: `${journey.journey_id}.routes`,
      name: "All browser route visits passed",
      severity: "blocker",
      status: failedVisits.length === 0 ? "passed" : "failed",
      expected: "all visits passed",
      actual: failedVisits.length === 0 ? "all visits passed" : `${failedVisits.length} failed`,
    },
    {
      assertion_id: `${journey.journey_id}.artifacts`,
      name: "Browser artifacts were captured",
      severity: "major",
      status: artifacts.length > 0 ? "passed" : "failed",
      expected: "artifact refs captured",
      actual: artifacts.length > 0 ? "artifact refs captured" : "no artifacts",
    },
  ];
}

function deterministicClock(): () => Date {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 4, 27, 12, 30, tick++));
}
