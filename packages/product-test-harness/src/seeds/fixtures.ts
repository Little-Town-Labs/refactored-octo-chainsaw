import type {
  ProductSeedBundle,
  ProductSeedEntityRecord,
  ProductSeedEntityType,
  ProductSeedFactoryInput,
  ProductSeedFixtureDefinition,
  ProductSeedFixtureName,
  ProductSeedPosture,
  ProductSeedRelationship,
} from "../contracts.js";
import { HarnessValidationError } from "../validation.js";
import { deterministicTimestamp } from "./deterministic.js";
import {
  buildProductSeedBundle,
  buildSeedEntity,
  buildSeedRelationship,
  ProductSeedFactoryError,
} from "./factories.js";
import { assertValidProductSeedBundle } from "./validation.js";

export const REQUIRED_PRODUCT_SEED_ENTITY_TYPES: readonly ProductSeedEntityType[] = [
  "human_principal",
  "service_principal",
  "agent_principal",
  "seeker",
  "employer",
  "organization",
  "job_requirement",
  "seeker_ticket",
  "employer_requirement_ticket",
  "match_ticket",
  "jurisdiction_policy",
  "consent_record",
  "human_review_decision",
  "agent_contract",
  "rubric",
  "bias_test_evidence",
  "privacy_ruleset",
  "notification_template",
  "webhook_endpoint",
  "signing_key",
];

export const PRODUCT_SEED_FIXTURES: Record<ProductSeedFixtureName, ProductSeedFixtureDefinition> = {
  "alpha-happy-path": {
    fixture_name: "alpha-happy-path",
    description: "Complete Alpha gate happy path with active consent and allowed jurisdiction.",
    required_categories: REQUIRED_PRODUCT_SEED_ENTITY_TYPES,
    build: (input) =>
      buildBundle(input, {
        fixture_posture: "alpha_happy_path",
        consent_posture: "active_consent",
        jurisdiction_posture: "jurisdiction_allowed",
        review_posture: "human_review_not_required",
      }),
  },
  "missing-consent": {
    fixture_name: "missing-consent",
    description: "Explicit denial path for missing seeker consent.",
    required_categories: REQUIRED_PRODUCT_SEED_ENTITY_TYPES,
    build: (input) =>
      buildBundle(input, {
        fixture_posture: "missing_consent",
        consent_posture: "missing_consent",
        jurisdiction_posture: "jurisdiction_allowed",
        review_posture: "human_review_required",
      }),
  },
  "consent-withdrawn": {
    fixture_name: "consent-withdrawn",
    description: "Explicit denial path for withdrawn seeker consent.",
    required_categories: REQUIRED_PRODUCT_SEED_ENTITY_TYPES,
    build: (input) =>
      buildBundle(input, {
        fixture_posture: "consent_withdrawn",
        consent_posture: "consent_withdrawn",
        jurisdiction_posture: "jurisdiction_allowed",
        review_posture: "human_review_not_required",
      }),
  },
  "human-review-required": {
    fixture_name: "human-review-required",
    description: "Explicit denial path requiring attributed human review evidence.",
    required_categories: REQUIRED_PRODUCT_SEED_ENTITY_TYPES,
    build: (input) =>
      buildBundle(input, {
        fixture_posture: "human_review_required",
        consent_posture: "active_consent",
        jurisdiction_posture: "jurisdiction_allowed",
        review_posture: "human_review_required",
      }),
  },
  "jurisdiction-kill-switch": {
    fixture_name: "jurisdiction-kill-switch",
    description: "Explicit denial path for jurisdiction kill switch.",
    required_categories: REQUIRED_PRODUCT_SEED_ENTITY_TYPES,
    build: (input) =>
      buildBundle(input, {
        fixture_posture: "jurisdiction_killed",
        consent_posture: "active_consent",
        jurisdiction_posture: "jurisdiction_killed",
        review_posture: "human_review_required",
      }),
  },
};

export function createProductSeedBundle(input: ProductSeedFactoryInput): ProductSeedBundle {
  assertValidSeedFactoryInput(input);
  const fixture = getProductSeedFixture(input.fixture_name);
  const bundle = fixture.build(input);
  assertValidProductSeedBundle(bundle);
  return bundle;
}

export function getProductSeedFixture(
  fixtureName: ProductSeedFixtureName,
): ProductSeedFixtureDefinition {
  const fixture = PRODUCT_SEED_FIXTURES[fixtureName];
  if (!fixture) {
    throw new ProductSeedFactoryError(
      `Unknown product seed fixture: ${fixtureName}`,
      "unknown_fixture",
    );
  }
  return fixture;
}

function buildBundle(
  input: ProductSeedFactoryInput,
  posture: {
    readonly fixture_posture: ProductSeedPosture;
    readonly consent_posture: ProductSeedPosture;
    readonly jurisdiction_posture: ProductSeedPosture;
    readonly review_posture: ProductSeedPosture;
  },
): ProductSeedBundle {
  const entity = (entityType: ProductSeedEntityType, key: string, extra = {}) => {
    const entityPosture = postureFor(entityType, posture);
    return buildSeedEntity({
      factory_input: input,
      entity_type: entityType,
      key,
      ...(entityPosture ? { posture: entityPosture } : {}),
      attributes: {
        synthetic: true,
        fixture_name: input.fixture_name,
        created_at: deterministicTimestamp(input),
        ...extra,
      },
    });
  };

  const entities = [
    entity("human_principal", "seeker-human", { email: "seeker.alpha@example.test" }),
    entity("human_principal", "employer-human", { email: "employer.alpha@example.test" }),
    entity("service_principal", "webhook-service", { service_name: "synthetic-webhook" }),
    entity("agent_principal", "seeker-agent", { agent_role: "seeker_advocate" }),
    entity("agent_principal", "employer-agent", { agent_role: "employer_advocate" }),
    entity("seeker", "senior-engineer", { display_name: "Synthetic Senior Engineer" }),
    entity("employer", "structured-employer", { display_name: "Synthetic Hiring Manager" }),
    entity("organization", "acme-labs", { name: "Acme Labs Example" }),
    entity("job_requirement", "backend-role", { title: "Synthetic Backend Engineer" }),
    entity("seeker_ticket", "seeker-ticket", { state: "ready_for_matching" }),
    entity("employer_requirement_ticket", "employer-req-ticket", { state: "open" }),
    entity("match_ticket", "match-ticket", { state: "candidate_review" }),
    entity("jurisdiction_policy", "missouri-policy", {
      region: "US-MO",
      gate: posture.jurisdiction_posture === "jurisdiction_killed" ? "deny" : "allow",
    }),
    entity("consent_record", "seeker-consent", {
      granted: posture.consent_posture === "active_consent",
    }),
    entity("human_review_decision", "review-decision", {
      required: posture.review_posture === "human_review_required",
      decision:
        posture.review_posture === "human_review_required" ? "requires_review" : "not_required",
      reviewer_principal_ref: "seed://synthetic-human-reviewer",
      evidence_ref: `evidence://alpha/${input.fixture_name}/human-review`,
    }),
    entity("agent_contract", "alpha-contract", { version: "contract-alpha-v1" }),
    entity("rubric", "software-rubric", { version: "rubric-alpha-v1" }),
    entity("bias_test_evidence", "rubric-bias-evidence", {
      artifact_ref: "artifact://bias/alpha-v1.json",
    }),
    entity("privacy_ruleset", "alpha-privacy", { disclosure_stage: "pre_intro" }),
    entity("notification_template", "alpha-notification", { channel: "email" }),
    entity("webhook_endpoint", "employer-webhook", {
      url: "https://webhooks.example.test/spyglass",
    }),
    entity("signing_key", "webhook-signing-key", {
      key_ref: "synthetic-key-ref",
      private_material: "redacted",
    }),
  ];

  return buildProductSeedBundle({
    factory_input: input,
    entities,
    relationships: relationshipsFor(input, entities),
    metadata: {
      fixture_posture: posture.fixture_posture,
      alpha_posture: "informational_only",
      synthetic_only: true,
    },
  });
}

function relationshipsFor(
  input: ProductSeedFactoryInput,
  entities: readonly ProductSeedEntityRecord[],
): readonly ProductSeedRelationship[] {
  const byType = (type: ProductSeedEntityType) =>
    entities.find((entity) => entity.entity_type === type);
  const seeker = requireEntity(byType("seeker"), "seeker");
  const employer = requireEntity(byType("employer"), "employer");
  const organization = requireEntity(byType("organization"), "organization");
  const job = requireEntity(byType("job_requirement"), "job_requirement");
  const seekerTicket = requireEntity(byType("seeker_ticket"), "seeker_ticket");
  const reqTicket = requireEntity(
    byType("employer_requirement_ticket"),
    "employer_requirement_ticket",
  );
  const matchTicket = requireEntity(byType("match_ticket"), "match_ticket");
  const policy = requireEntity(byType("jurisdiction_policy"), "jurisdiction_policy");
  const consent = requireEntity(byType("consent_record"), "consent_record");
  const contract = requireEntity(byType("agent_contract"), "agent_contract");
  const rubric = requireEntity(byType("rubric"), "rubric");
  const bias = requireEntity(byType("bias_test_evidence"), "bias_test_evidence");
  const privacy = requireEntity(byType("privacy_ruleset"), "privacy_ruleset");
  const webhook = requireEntity(byType("webhook_endpoint"), "webhook_endpoint");
  const key = requireEntity(byType("signing_key"), "signing_key");

  return [
    relation(input, seeker, seekerTicket, "ticket_for"),
    relation(input, employer, organization, "belongs_to"),
    relation(input, organization, job, "owns"),
    relation(input, job, reqTicket, "ticket_for"),
    relation(input, matchTicket, seekerTicket, "match_links"),
    relation(input, matchTicket, reqTicket, "match_links"),
    relation(input, seekerTicket, consent, "consent_for"),
    relation(input, seekerTicket, policy, "ticket_requires_policy"),
    relation(input, reqTicket, policy, "ticket_requires_policy"),
    relation(input, contract, rubric, "contract_uses_rubric"),
    relation(input, rubric, bias, "rubric_has_bias_evidence"),
    relation(input, contract, privacy, "uses_privacy_ruleset"),
    relation(input, organization, webhook, "webhook_for"),
    relation(input, webhook, key, "key_for"),
  ];
}

function relation(
  input: ProductSeedFactoryInput,
  from: ProductSeedEntityRecord,
  to: ProductSeedEntityRecord,
  relationshipType: ProductSeedRelationship["relationship_type"],
): ProductSeedRelationship {
  return buildSeedRelationship({
    factory_input: input,
    from,
    to,
    relationship_type: relationshipType,
  });
}

function postureFor(
  entityType: ProductSeedEntityType,
  posture: {
    readonly fixture_posture: ProductSeedPosture;
    readonly consent_posture: ProductSeedPosture;
    readonly jurisdiction_posture: ProductSeedPosture;
    readonly review_posture: ProductSeedPosture;
  },
): ProductSeedPosture | undefined {
  if (entityType === "consent_record") return posture.consent_posture;
  if (entityType === "jurisdiction_policy") return posture.jurisdiction_posture;
  if (entityType === "human_review_decision") return posture.review_posture;
  if (entityType === "match_ticket") return posture.fixture_posture;
  return undefined;
}

function requireEntity(
  entity: ProductSeedEntityRecord | undefined,
  entityType: ProductSeedEntityType,
): ProductSeedEntityRecord {
  if (!entity) throw new Error(`Missing generated seed entity ${entityType}`);
  return entity;
}

function assertValidSeedFactoryInput(input: ProductSeedFactoryInput): void {
  const issues: string[] = [];
  if (input.scenario_id.trim() === "") issues.push("input.scenario_id must be non-empty");
  if (input.scenario_version.trim() === "") {
    issues.push("input.scenario_version must be non-empty");
  }
  if (input.seed_version.trim() === "") issues.push("input.seed_version must be non-empty");
  if (input.base_time && Number.isNaN(Date.parse(input.base_time))) {
    issues.push("input.base_time must be an ISO date-time");
  }
  if (issues.length > 0) throw new HarnessValidationError(issues);
}
