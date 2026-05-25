export type A2aCardId =
  | "seeker-intake"
  | "employer-intake"
  | "match-coordinator"
  | "negotiation-participant"
  | "dossier-reader";

export type A2aCardAudience = "seeker" | "employer" | "platform" | "external-agent";

export type A2aCardAvailability = "discovery-only" | "future-interop" | "live";

export type A2aRuntimeStatus = "no-runtime-handler" | "handler-deferred" | "handler-live";

export interface A2aAuthPosture {
  readonly required: boolean;
  readonly methods: readonly string[];
}

export interface A2aAgentCard {
  readonly id: A2aCardId;
  readonly name: string;
  readonly audience: A2aCardAudience;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly auth: A2aAuthPosture;
  readonly availability: A2aCardAvailability;
  readonly runtime_status: A2aRuntimeStatus;
  readonly unsupported_actions: readonly string[];
  readonly contact: string;
  readonly docs: readonly string[];
}

export interface A2aCardIndexEntry {
  readonly id: A2aCardId;
  readonly href: string;
  readonly availability: A2aCardAvailability;
  readonly runtime_status: A2aRuntimeStatus;
}

export interface A2aCardIndex {
  readonly version: "v1";
  readonly cards: readonly A2aCardIndexEntry[];
}

const COMMON_UNSUPPORTED_ACTIONS = [
  "seeker_dashboard",
  "ticket_list",
  "analytics_view",
  "recommended_jobs",
  "browse_jobs",
  "raw_transcript",
  "hidden_run_state",
  "direct_counterparty_message",
] as const;

export const A2A_CARD_IDS = [
  "seeker-intake",
  "employer-intake",
  "match-coordinator",
  "negotiation-participant",
  "dossier-reader",
] as const satisfies readonly A2aCardId[];

export const A2A_AGENT_CARDS = [
  {
    id: "seeker-intake",
    name: "Spyglass Seeker Intake",
    audience: "seeker",
    description:
      "Discovery card for seeker onboarding handoff into Spyglass-owned conversational channels.",
    capabilities: [
      "Describe seeker onboarding entry points",
      "Point to Clerk signup and profile management",
      "Point to Telegram, email, and web chat channels",
    ],
    auth: { required: true, methods: ["clerk", "future-oauth-dpop"] },
    availability: "future-interop",
    runtime_status: "handler-deferred",
    unsupported_actions: COMMON_UNSUPPORTED_ACTIONS,
    contact: "See /agents.md for current public guidance.",
    docs: ["/agents.md", "/llms.txt"],
  },
  {
    id: "employer-intake",
    name: "Spyglass Employer Intake",
    audience: "employer",
    description:
      "Discovery card for future employer-side intake interop. Runtime employer API work lands in F23.",
    capabilities: [
      "Describe future employer intake boundaries",
      "Point to public product context",
      "Declare webhook/API runtime deferral",
    ],
    auth: { required: true, methods: ["future-oauth-dpop", "future-signed-webhook"] },
    availability: "future-interop",
    runtime_status: "handler-deferred",
    unsupported_actions: [...COMMON_UNSUPPORTED_ACTIONS, "submit_live_requisition"],
    contact: "See /agents.md for current public guidance.",
    docs: ["/agents.md", "/llms.txt"],
  },
  {
    id: "match-coordinator",
    name: "Spyglass Match Coordinator",
    audience: "platform",
    description:
      "Discovery card for the future coordinator-facing interop surface around match-ticket outcomes.",
    capabilities: [
      "Declare match coordination discovery",
      "Point to public A2A status",
      "Declare runtime handler deferral",
    ],
    auth: { required: true, methods: ["future-service-principal"] },
    availability: "future-interop",
    runtime_status: "handler-deferred",
    unsupported_actions: [...COMMON_UNSUPPORTED_ACTIONS, "mutate_match_ticket"],
    contact: "See /agents.md for current public guidance.",
    docs: ["/agents.md", "/llms.txt"],
  },
  {
    id: "negotiation-participant",
    name: "Spyglass Negotiation Participant",
    audience: "external-agent",
    description:
      "Discovery card for future external negotiation peers. Spyglass-hosted advocates remain authoritative in v0.",
    capabilities: [
      "Declare future negotiation participant discovery",
      "Explain that v0 does not depend on external A2A participants",
      "Declare Parley run-to-completion boundary",
    ],
    auth: { required: true, methods: ["future-oauth-dpop", "future-verifiable-credential"] },
    availability: "future-interop",
    runtime_status: "handler-deferred",
    unsupported_actions: [...COMMON_UNSUPPORTED_ACTIONS, "replace_spyglass_advocate"],
    contact: "See /agents.md for current public guidance.",
    docs: ["/agents.md", "/llms.txt"],
  },
  {
    id: "dossier-reader",
    name: "Spyglass Dossier Reader",
    audience: "external-agent",
    description:
      "Discovery card for future access to approved dossier projections, not raw transcripts or hidden run state.",
    capabilities: [
      "Declare future approved dossier projection discovery",
      "State that raw transcripts and hidden run state are unavailable",
      "Point to public A2A status",
    ],
    auth: { required: true, methods: ["future-oauth-dpop", "future-signed-request"] },
    availability: "future-interop",
    runtime_status: "handler-deferred",
    unsupported_actions: [...COMMON_UNSUPPORTED_ACTIONS, "raw_dossier", "unapproved_projection"],
    contact: "See /agents.md for current public guidance.",
    docs: ["/agents.md", "/llms.txt"],
  },
] as const satisfies readonly A2aAgentCard[];

export function a2aCardHref(id: A2aCardId): string {
  return `/.well-known/a2a/${id}.json`;
}

export function getA2aCard(id: string): A2aAgentCard | null {
  return A2A_AGENT_CARDS.find((card) => card.id === id) ?? null;
}

export function buildA2aCardIndex(): A2aCardIndex {
  return {
    version: "v1",
    cards: A2A_AGENT_CARDS.map((card) => ({
      id: card.id,
      href: a2aCardHref(card.id),
      availability: card.availability,
      runtime_status: card.runtime_status,
    })),
  };
}
