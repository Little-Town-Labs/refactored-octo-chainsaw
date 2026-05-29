import type {
  BrowserArtifactPolicy,
  BrowserJourney,
  BrowserJourneyCategory,
  BrowserViewport,
} from "../contracts.js";

export const DEFAULT_BROWSER_APP_URL = "http://127.0.0.1:3000";

export const DEFAULT_BROWSER_JOURNEY_CATEGORIES: readonly BrowserJourneyCategory[] = [
  "seeker_landing",
  "seeker_auth_profile",
  "employer_console",
  "employer_req_creation",
  "employer_candidate_review",
  "operator_credential_audit",
  "alpha_consent",
  "informational_only",
];

export const DEFAULT_BROWSER_VIEWPORTS: readonly BrowserViewport[] = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

export const DEFAULT_BROWSER_ARTIFACT_POLICY: BrowserArtifactPolicy = {
  screenshot: "always",
  video: "always",
  trace: "always",
  console_log: "always",
  network_log: "always",
};

export const DEFAULT_BROWSER_JOURNEYS: readonly BrowserJourney[] = [
  journey({
    journey_id: "browser.seeker-landing",
    title: "Seeker landing page",
    category: "seeker_landing",
    routes: [{ route_id: "landing", path: "/", expected_status: 200 }],
    tags: ["seeker", "public"],
  }),
  journey({
    journey_id: "browser.seeker-auth-profile",
    title: "Seeker sign-in, sign-up, and profile entry points",
    category: "seeker_auth_profile",
    routes: [
      { route_id: "seeker-sign-in", path: "/sign-in", expected_status: 200 },
      { route_id: "seeker-sign-up", path: "/sign-up", expected_status: 200 },
      { route_id: "seeker-profile", path: "/profile", expected_status: 200 },
    ],
    tags: ["seeker", "auth"],
  }),
  journey({
    journey_id: "browser.employer-console",
    title: "Employer console shell",
    category: "employer_console",
    routes: [{ route_id: "employer-console", path: "/employer/console", expected_status: 200 }],
    tags: ["employer", "console"],
  }),
  journey({
    journey_id: "browser.employer-req-creation",
    title: "Employer req creation surface",
    category: "employer_req_creation",
    routes: [{ route_id: "employer-reqs", path: "/employer/console/reqs", expected_status: 200 }],
    tags: ["employer", "reqs"],
  }),
  journey({
    journey_id: "browser.employer-candidate-review",
    title: "Employer candidate review surface",
    category: "employer_candidate_review",
    routes: [
      {
        route_id: "employer-candidates",
        path: "/employer/console/candidates",
        expected_status: 200,
      },
    ],
    tags: ["employer", "candidates"],
  }),
  journey({
    journey_id: "browser.operator-credential-audit",
    title: "Operator credential and audit views",
    category: "operator_credential_audit",
    routes: [
      {
        route_id: "operator-credentials",
        path: "/operator/console/credentials",
        expected_status: 200,
      },
      { route_id: "operator-audit", path: "/operator/console/audit", expected_status: 200 },
    ],
    tags: ["operator", "audit"],
  }),
  journey({
    journey_id: "browser.alpha-consent",
    title: "Alpha consent surface",
    category: "alpha_consent",
    routes: [{ route_id: "alpha-consent-profile", path: "/profile", expected_status: 200 }],
    tags: ["alpha", "consent"],
  }),
  journey({
    journey_id: "browser.informational-only",
    title: "Informational-only Alpha posture surface",
    category: "informational_only",
    routes: [
      { route_id: "public-informational", path: "/", expected_status: 200 },
      {
        route_id: "candidate-informational",
        path: "/employer/console/candidates",
        expected_status: 200,
      },
    ],
    tags: ["alpha", "informational-only"],
  }),
];

export function browserJourneyWithAppUrl(journey: BrowserJourney, appUrl: string): BrowserJourney {
  return { ...journey, app_url: appUrl };
}

function journey(input: {
  readonly journey_id: string;
  readonly title: string;
  readonly category: BrowserJourneyCategory;
  readonly routes: BrowserJourney["routes"];
  readonly tags: readonly string[];
}): BrowserJourney {
  return {
    journey_id: input.journey_id,
    title: input.title,
    category: input.category,
    mode: "gate",
    app_url: DEFAULT_BROWSER_APP_URL,
    routes: input.routes,
    viewports: DEFAULT_BROWSER_VIEWPORTS,
    artifact_policy: DEFAULT_BROWSER_ARTIFACT_POLICY,
    tags: input.tags,
  };
}
