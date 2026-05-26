export const REQUIRED_TABLETOP_SCENARIOS = [
  "cross_side_leakage",
  "credential_compromise",
  "monitoring_deadline_failure",
] as const;

export type TabletopScenario = (typeof REQUIRED_TABLETOP_SCENARIOS)[number];

export type TabletopDefinition = {
  scenario: TabletopScenario;
  severity: "sev1" | "sev2";
  required_steps: string[];
};

export const TABLETOP_DEFINITIONS: TabletopDefinition[] = [
  {
    scenario: "cross_side_leakage",
    severity: "sev1",
    required_steps: [
      "classify sev-1 signal",
      "assign incident commander",
      "preserve audit and match evidence",
      "complete breach notification assessment",
      "record recovery action",
      "write postmortem",
      "track corrective action",
    ],
  },
  {
    scenario: "credential_compromise",
    severity: "sev2",
    required_steps: [
      "revoke sessions",
      "review credential audit trail",
      "open incident",
      "preserve evidence references",
      "complete personal-data access review",
    ],
  },
  {
    scenario: "monitoring_deadline_failure",
    severity: "sev2",
    required_steps: [
      "detect deadline risk",
      "page on-call",
      "record counsel escalation",
      "document missed or blocked notification cause",
      "track corrective action",
    ],
  },
];

export function validateTabletopCoverage(scenarios: readonly string[]): string[] {
  return REQUIRED_TABLETOP_SCENARIOS.filter((scenario) => !scenarios.includes(scenario));
}
