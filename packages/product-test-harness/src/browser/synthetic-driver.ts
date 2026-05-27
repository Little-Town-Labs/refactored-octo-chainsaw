import type {
  BrowserJourneyDriver,
  BrowserJourneyVisitInput,
  BrowserJourneyVisitResult,
} from "../contracts.js";

export interface SyntheticBrowserJourneyDriverOptions {
  readonly fail_route_paths?: readonly string[];
}

export interface SyntheticBrowserJourneyEvent {
  readonly journey_id: string;
  readonly route_path: string;
  readonly viewport_name: string;
  readonly url: string;
  readonly status: "passed" | "failed";
}

export class SyntheticBrowserJourneyDriver implements BrowserJourneyDriver {
  readonly driver_name = "synthetic-playwright";
  readonly events: SyntheticBrowserJourneyEvent[] = [];
  private readonly failRoutePaths: ReadonlySet<string>;

  constructor(options: SyntheticBrowserJourneyDriverOptions = {}) {
    this.failRoutePaths = new Set(options.fail_route_paths ?? []);
  }

  async visit(input: BrowserJourneyVisitInput): Promise<BrowserJourneyVisitResult> {
    const failed = this.failRoutePaths.has(input.route.path);
    const status = failed ? "failed" : "passed";
    this.events.push({
      journey_id: input.journey.journey_id,
      route_path: input.route.path,
      viewport_name: input.viewport.name,
      url: input.url,
      status,
    });

    return {
      status,
      evidence_refs: [
        `browser://${input.journey.journey_id}/${input.route.route_id}/${input.viewport.name}`,
      ],
      console_messages: failed ? ["Synthetic browser route failure"] : [],
      network_entries: [`GET ${input.url} ${failed ? 500 : (input.route.expected_status ?? 200)}`],
      ...(failed ? { error: `Synthetic failure for ${input.route.path}` } : {}),
    };
  }
}
