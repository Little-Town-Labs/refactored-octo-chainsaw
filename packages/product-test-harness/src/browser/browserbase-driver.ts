import type {
  BrowserJourneyDriver,
  BrowserJourneyVisitInput,
  BrowserJourneyVisitResult,
  BrowserViewport,
} from "../contracts.js";

export interface BrowserbaseDriverConfig {
  readonly project_id: string;
  readonly api_key_ref: string;
  readonly browser: "chromium";
  readonly headless: boolean;
  readonly region?: string;
}

export interface BrowserbaseSession {
  readonly session_id: string;
  readonly connect_url: string;
  readonly replay_url?: string;
  readonly artifact_refs?: readonly string[];
}

export interface BrowserbaseCreateSessionInput {
  readonly project_id: string;
  readonly run_id: string;
  readonly journey_id: string;
  readonly route_id: string;
  readonly viewport: BrowserViewport;
  readonly browser: BrowserbaseDriverConfig["browser"];
  readonly headless: boolean;
  readonly region?: string;
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
}

export interface BrowserbaseSessionClient {
  createSession(input: BrowserbaseCreateSessionInput): Promise<BrowserbaseSession>;
  closeSession?(sessionId: string): Promise<void>;
}

export interface BrowserbasePlaywrightVisitInput {
  readonly session: BrowserbaseSession;
  readonly run_id: string;
  readonly journey_id: string;
  readonly route_id: string;
  readonly url: string;
  readonly viewport: BrowserViewport;
  readonly expected_status?: number;
  readonly expected_text?: string;
}

export interface BrowserbasePlaywrightVisitResult {
  readonly status: BrowserJourneyVisitResult["status"];
  readonly evidence_refs?: readonly string[];
  readonly console_messages?: readonly string[];
  readonly network_entries?: readonly string[];
  readonly error?: string;
}

export interface BrowserbasePlaywrightConnector {
  runVisit(input: BrowserbasePlaywrightVisitInput): Promise<BrowserbasePlaywrightVisitResult>;
}

export interface BrowserbaseBrowserJourneyDriverOptions {
  readonly config: BrowserbaseDriverConfig;
  readonly sessionClient: BrowserbaseSessionClient;
  readonly connector: BrowserbasePlaywrightConnector;
}

export class BrowserbaseDriverConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrowserbaseDriverConfigError";
  }
}

export class BrowserbaseBrowserJourneyDriver implements BrowserJourneyDriver {
  readonly driver_name = "browserbase-playwright";

  constructor(private readonly options: BrowserbaseBrowserJourneyDriverOptions) {
    assertValidBrowserbaseDriverConfig(options.config);
    if (typeof options.sessionClient?.createSession !== "function") {
      throw new BrowserbaseDriverConfigError("Browserbase sessionClient.createSession is required");
    }
    if (typeof options.connector?.runVisit !== "function") {
      throw new BrowserbaseDriverConfigError("Browserbase connector.runVisit is required");
    }
  }

  async visit(input: BrowserJourneyVisitInput): Promise<BrowserJourneyVisitResult> {
    let session: BrowserbaseSession | undefined;
    try {
      session = await this.options.sessionClient.createSession({
        project_id: this.options.config.project_id,
        run_id: input.run_id,
        journey_id: input.journey.journey_id,
        route_id: input.route.route_id,
        viewport: input.viewport,
        browser: this.options.config.browser,
        headless: this.options.config.headless,
        ...(this.options.config.region ? { region: this.options.config.region } : {}),
        metadata: {
          journey_category: input.journey.category,
          route_path: input.route.path,
          viewport_name: input.viewport.name,
        },
      });

      const result = await this.options.connector.runVisit({
        session,
        run_id: input.run_id,
        journey_id: input.journey.journey_id,
        route_id: input.route.route_id,
        url: input.url,
        viewport: input.viewport,
        ...(input.route.expected_status ? { expected_status: input.route.expected_status } : {}),
        ...(input.route.expected_text ? { expected_text: input.route.expected_text } : {}),
      });

      return {
        status: result.status,
        evidence_refs: uniqueEvidenceRefs([
          browserbaseSessionRef(session.session_id),
          session.replay_url,
          ...(session.artifact_refs ?? []),
          ...(result.evidence_refs ?? []),
        ]),
        ...(result.console_messages ? { console_messages: result.console_messages } : {}),
        ...(result.network_entries ? { network_entries: result.network_entries } : {}),
        ...(result.error ? { error: safeMessage(result.error) } : {}),
      };
    } catch (error) {
      return {
        status: "failed",
        evidence_refs: uniqueEvidenceRefs(
          session ? [browserbaseSessionRef(session.session_id)] : [],
        ),
        console_messages: ["Browserbase Playwright visit failed"],
        network_entries: [],
        error: safeMessage(error),
      };
    } finally {
      if (session && this.options.sessionClient.closeSession) {
        try {
          await this.options.sessionClient.closeSession(session.session_id);
        } catch {
          // Visit results remain authoritative; cleanup failures are surfaced by the session client.
        }
      }
    }
  }
}

export function browserbaseDriverConfigFromEnv(
  env: Readonly<Record<string, string | undefined>>,
): BrowserbaseDriverConfig {
  const projectId = env.BROWSERBASE_PROJECT_ID?.trim();
  const apiKey = env.BROWSERBASE_API_KEY?.trim();
  const missing = [
    ...(projectId ? [] : ["BROWSERBASE_PROJECT_ID"]),
    ...(apiKey ? [] : ["BROWSERBASE_API_KEY"]),
  ];
  if (missing.length > 0 || !projectId || !apiKey) {
    throw new BrowserbaseDriverConfigError(
      `Missing Browserbase configuration: ${missing.join(", ")}`,
    );
  }
  const region = env.BROWSERBASE_REGION?.trim();

  return {
    project_id: projectId,
    api_key_ref: "env:BROWSERBASE_API_KEY",
    browser: "chromium",
    headless: true,
    ...(region ? { region } : {}),
  };
}

export function assertValidBrowserbaseDriverConfig(config: BrowserbaseDriverConfig): void {
  const missing = [
    ...(config.project_id.trim() ? [] : ["project_id"]),
    ...(config.api_key_ref.trim() ? [] : ["api_key_ref"]),
  ];
  if (missing.length > 0) {
    throw new BrowserbaseDriverConfigError(
      `Invalid Browserbase driver config: ${missing.join(", ")}`,
    );
  }
  if (config.api_key_ref !== "env:BROWSERBASE_API_KEY") {
    throw new BrowserbaseDriverConfigError("Browserbase api_key_ref must not contain raw secrets");
  }
}

function browserbaseSessionRef(sessionId: string): string {
  return `browserbase://session/${encodeURIComponent(sessionId)}`;
}

function uniqueEvidenceRefs(refs: readonly (string | undefined)[]): readonly string[] {
  return Array.from(new Set(refs.filter((ref): ref is string => Boolean(ref && isSafeRef(ref)))));
}

function isSafeRef(value: string): boolean {
  if (/[?&](?:token|secret|api[_-]?key|password)=/i.test(value)) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\/[^/\s]+@/i.test(value)) return false;
  return !/(?:BROWSERBASE_API_KEY|npg_|postgres:\/\/|postgresql:\/\/)/i.test(value);
}

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (!isSafeRef(message) || /(?:secret|token|password|api[_-]?key)/i.test(message)) {
    return "Browserbase driver error redacted";
  }
  return message;
}
