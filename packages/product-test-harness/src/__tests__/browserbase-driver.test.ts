import {
  BrowserbaseBrowserJourneyDriver,
  BrowserbaseDriverConfigError,
  browserbaseDriverConfigFromEnv,
  DEFAULT_BROWSER_JOURNEYS,
  runBrowserJourney,
  type BrowserbaseCreateSessionInput,
  type BrowserbasePlaywrightConnector,
  type BrowserbasePlaywrightVisitInput,
  type BrowserbaseSession,
  type BrowserbaseSessionClient,
} from "../index.js";

describe("Browserbase browser journey driver", () => {
  it("creates Browserbase sessions, delegates visits, returns safe evidence, and cleans up", async () => {
    const sessionClient = new FakeBrowserbaseSessionClient();
    const connector = new FakeBrowserbasePlaywrightConnector();
    const driver = new BrowserbaseBrowserJourneyDriver({
      config: browserbaseDriverConfigFromEnv({
        BROWSERBASE_PROJECT_ID: "project_alpha",
        BROWSERBASE_API_KEY: "secret_value",
        BROWSERBASE_REGION: "us-east-1",
      }),
      sessionClient,
      connector,
    });

    const visit = await driver.visit({
      run_id: "browserbase-run-1",
      journey: DEFAULT_BROWSER_JOURNEYS[0]!,
      route: DEFAULT_BROWSER_JOURNEYS[0]!.routes[0]!,
      viewport: DEFAULT_BROWSER_JOURNEYS[0]!.viewports[0]!,
      url: "https://preview.spyglass.test/",
    });

    expect(visit).toMatchObject({
      status: "passed",
      evidence_refs: [
        "browserbase://session/session-1",
        "https://browserbase.test/replay/session-1",
        "browserbase://artifact/session-1/trace",
        "browserbase://artifact/session-1/screenshot",
      ],
      console_messages: ["Browserbase visit completed"],
      network_entries: ["GET https://preview.spyglass.test/ 200"],
    });
    expect(sessionClient.created).toEqual([
      expect.objectContaining({
        project_id: "project_alpha",
        run_id: "browserbase-run-1",
        journey_id: "browser.seeker-landing",
        route_id: "landing",
        browser: "chromium",
        headless: true,
        region: "us-east-1",
        metadata: expect.objectContaining({
          journey_category: "seeker_landing",
          route_path: "/",
          viewport_name: "desktop",
        }),
      }),
    ]);
    expect(connector.visits).toEqual([
      expect.objectContaining({
        session: expect.objectContaining({ session_id: "session-1" }),
        url: "https://preview.spyglass.test/",
        expected_status: 200,
      }),
    ]);
    expect(sessionClient.closed).toEqual(["session-1"]);
  });

  it("maps connector failures to safe failed visit results", async () => {
    const sessionClient = new FakeBrowserbaseSessionClient();
    const driver = new BrowserbaseBrowserJourneyDriver({
      config: browserbaseDriverConfigFromEnv({
        BROWSERBASE_PROJECT_ID: "project_alpha",
        BROWSERBASE_API_KEY: "secret_value",
      }),
      sessionClient,
      connector: new FakeBrowserbasePlaywrightConnector({
        throwError: new Error("connect failed with token=super-secret"),
      }),
    });

    const visit = await driver.visit({
      run_id: "browserbase-run-failed",
      journey: DEFAULT_BROWSER_JOURNEYS[0]!,
      route: DEFAULT_BROWSER_JOURNEYS[0]!.routes[0]!,
      viewport: DEFAULT_BROWSER_JOURNEYS[0]!.viewports[0]!,
      url: "https://preview.spyglass.test/",
    });

    expect(visit).toEqual({
      status: "failed",
      evidence_refs: ["browserbase://session/session-1"],
      console_messages: ["Browserbase Playwright visit failed"],
      network_entries: [],
      error: "Browserbase driver error redacted",
    });
    expect(sessionClient.closed).toEqual(["session-1"]);
  });

  it("fails fast on missing or unsafe Browserbase config", () => {
    expect(() =>
      browserbaseDriverConfigFromEnv({ BROWSERBASE_PROJECT_ID: "project_alpha" }),
    ).toThrow(BrowserbaseDriverConfigError);
    expect(
      () =>
        new BrowserbaseBrowserJourneyDriver({
          config: {
            project_id: "project_alpha",
            api_key_ref: "raw-secret",
            browser: "chromium",
            headless: true,
          },
          sessionClient: new FakeBrowserbaseSessionClient(),
          connector: new FakeBrowserbasePlaywrightConnector(),
        }),
    ).toThrow("must not contain raw secrets");
    expect(
      () =>
        new BrowserbaseBrowserJourneyDriver({
          config: browserbaseDriverConfigFromEnv({
            BROWSERBASE_PROJECT_ID: "project_alpha",
            BROWSERBASE_API_KEY: "secret_value",
          }),
          sessionClient: undefined as unknown as FakeBrowserbaseSessionClient,
          connector: new FakeBrowserbasePlaywrightConnector(),
        }),
    ).toThrow("sessionClient.createSession is required");
    expect(
      () =>
        new BrowserbaseBrowserJourneyDriver({
          config: browserbaseDriverConfigFromEnv({
            BROWSERBASE_PROJECT_ID: "project_alpha",
            BROWSERBASE_API_KEY: "secret_value",
          }),
          sessionClient: new FakeBrowserbaseSessionClient(),
          connector: undefined as unknown as FakeBrowserbasePlaywrightConnector,
        }),
    ).toThrow("connector.runVisit is required");
  });

  it("runs existing browser journeys through the Browserbase driver contract", async () => {
    const result = await runBrowserJourney(DEFAULT_BROWSER_JOURNEYS[0]!, {
      run_id: "browserbase-runner",
      app_url: "https://preview.spyglass.test",
      driver: new BrowserbaseBrowserJourneyDriver({
        config: browserbaseDriverConfigFromEnv({
          BROWSERBASE_PROJECT_ID: "project_alpha",
          BROWSERBASE_API_KEY: "secret_value",
        }),
        sessionClient: new FakeBrowserbaseSessionClient(),
        connector: new FakeBrowserbasePlaywrightConnector(),
      }),
    });

    expect(result.run.status).toBe("passed");
    expect(result.run.metadata).toMatchObject({
      browser_driver: "browserbase-playwright",
    });
    expect(result.visits).toHaveLength(2);
    expect(result.visits[0]?.evidence_refs).toContain("browserbase://session/session-1");
    expect(result.snapshot.browser_artifacts.length).toBeGreaterThan(0);
  });
});

class FakeBrowserbaseSessionClient implements BrowserbaseSessionClient {
  readonly created: BrowserbaseCreateSessionInput[] = [];
  readonly closed: string[] = [];

  async createSession(input: BrowserbaseCreateSessionInput): Promise<BrowserbaseSession> {
    this.created.push(input);
    const sessionId = `session-${this.created.length}`;
    return {
      session_id: sessionId,
      connect_url: `wss://connect.browserbase.test/${sessionId}?token=redacted`,
      replay_url: `https://browserbase.test/replay/${sessionId}`,
      artifact_refs: [`browserbase://artifact/${sessionId}/trace`],
    };
  }

  async closeSession(sessionId: string): Promise<void> {
    this.closed.push(sessionId);
  }
}

class FakeBrowserbasePlaywrightConnector implements BrowserbasePlaywrightConnector {
  readonly visits: BrowserbasePlaywrightVisitInput[] = [];

  constructor(private readonly options: { readonly throwError?: Error } = {}) {}

  async runVisit(input: BrowserbasePlaywrightVisitInput) {
    this.visits.push(input);
    if (this.options.throwError) throw this.options.throwError;
    return {
      status: "passed" as const,
      evidence_refs: [`browserbase://artifact/${input.session.session_id}/screenshot`],
      console_messages: ["Browserbase visit completed"],
      network_entries: [`GET ${input.url} ${input.expected_status ?? 200}`],
    };
  }
}
