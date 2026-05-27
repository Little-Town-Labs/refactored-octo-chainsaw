import type { BrowserArtifactPolicy, BrowserJourney } from "../contracts.js";
import { containsDatabaseUrl } from "../db/redaction.js";

export function validateBrowserJourney(journey: BrowserJourney): string[] {
  const issues: string[] = [];
  requireNonEmpty("journey_id", journey.journey_id, issues);
  requireNonEmpty("title", journey.title, issues);
  requireNonEmpty("app_url", journey.app_url, issues);
  if (journey.app_url && !isSafeUrl(journey.app_url)) {
    issues.push("app_url must be an absolute http(s) URL");
  }
  if (containsUnsafeValue(journey.app_url)) {
    issues.push("app_url must not contain credential-bearing values");
  }
  if (journey.routes.length === 0) issues.push("routes must include at least one route");
  journey.routes.forEach((route, index) => {
    requireNonEmpty(`routes[${index}].route_id`, route.route_id, issues);
    requireNonEmpty(`routes[${index}].path`, route.path, issues);
    if (!route.path.startsWith("/")) issues.push(`routes[${index}].path must start with /`);
  });
  if (journey.viewports.length === 0) {
    issues.push("viewports must include at least one viewport");
  }
  journey.viewports.forEach((viewport, index) => {
    requireNonEmpty(`viewports[${index}].name`, viewport.name, issues);
    if (!Number.isInteger(viewport.width) || viewport.width <= 0) {
      issues.push(`viewports[${index}].width must be a positive integer`);
    }
    if (!Number.isInteger(viewport.height) || viewport.height <= 0) {
      issues.push(`viewports[${index}].height must be a positive integer`);
    }
  });
  if (!capturesAnyArtifact(journey.artifact_policy)) {
    issues.push("artifact_policy must capture at least one artifact kind");
  }
  return issues;
}

export function assertValidBrowserJourney(journey: BrowserJourney): void {
  const issues = validateBrowserJourney(journey);
  if (issues.length > 0) {
    throw new Error(`Invalid browser journey: ${issues.join("; ")}`);
  }
}

function capturesAnyArtifact(policy: BrowserArtifactPolicy): boolean {
  return Object.values(policy).some((value) => value !== "never");
}

function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function containsUnsafeValue(value: string): boolean {
  return containsDatabaseUrl(value) || /(?:api[_-]?key|secret|token|password)=/i.test(value);
}

function requireNonEmpty(path: string, value: string, issues: string[]): void {
  if (value.trim() === "") issues.push(`${path} must be non-empty`);
}
