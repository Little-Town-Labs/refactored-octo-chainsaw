import type {
  BrowserArtifactPolicy,
  BrowserJourney,
  BrowserJourneyRoute,
  BrowserViewport,
  ProductBrowserArtifactRecord,
  ProductEvidenceStatus,
} from "../contracts.js";

type BrowserArtifactKind = keyof BrowserArtifactPolicy;

const ARTIFACT_KINDS: readonly BrowserArtifactKind[] = [
  "screenshot",
  "video",
  "trace",
  "console_log",
  "network_log",
];

export function createBrowserArtifactRecords(input: {
  readonly run_id: string;
  readonly scenario_id: string;
  readonly journey: BrowserJourney;
  readonly route: BrowserJourneyRoute;
  readonly viewport: BrowserViewport;
  readonly status: ProductEvidenceStatus;
}): readonly ProductBrowserArtifactRecord[] {
  return ARTIFACT_KINDS.filter((kind) =>
    shouldCaptureArtifact(kind, input.journey.artifact_policy, input.status),
  ).map((kind) => ({
    artifact_id: browserArtifactId(input.journey, input.route, input.viewport, kind),
    run_id: input.run_id,
    scenario_id: input.scenario_id,
    kind,
    uri: browserArtifactUri(input.journey, input.route, input.viewport, kind),
    redaction_status: input.status === "failed" ? "redacted" : "not_required",
    ...(input.status === "failed"
      ? { redaction_note: "Synthetic browser failure artifact redacted by policy." }
      : {}),
    metadata: {
      journey_id: input.journey.journey_id,
      route_id: input.route.route_id,
      route_path: input.route.path,
      viewport_name: input.viewport.name,
    },
  }));
}

export function shouldCaptureArtifact(
  kind: BrowserArtifactKind,
  policy: BrowserArtifactPolicy,
  status: ProductEvidenceStatus,
): boolean {
  const capturePolicy = policy[kind];
  if (capturePolicy === "always") return true;
  if (capturePolicy === "on_failure") return status === "failed";
  return false;
}

function browserArtifactId(
  journey: BrowserJourney,
  route: BrowserJourneyRoute,
  viewport: BrowserViewport,
  kind: BrowserArtifactKind,
): string {
  return `${journey.journey_id}.${route.route_id}.${viewport.name}.${kind}`;
}

function browserArtifactUri(
  journey: BrowserJourney,
  route: BrowserJourneyRoute,
  viewport: BrowserViewport,
  kind: BrowserArtifactKind,
): string {
  return `artifact://browser/${journey.journey_id}/${route.route_id}/${viewport.name}/${kind}`;
}
