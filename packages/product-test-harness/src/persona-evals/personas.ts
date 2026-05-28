import type { ProductPersona } from "../contracts.js";

export const DEFAULT_PRODUCT_PERSONAS: readonly ProductPersona[] = [
  {
    persona_id: "seeker.senior-engineer",
    role: "seeker",
    label: "Senior engineer",
    traits: ["platform", "staff-level", "privacy-aware"],
    risk_tags: [],
    prompt_seed_ref: "prompt-seed://pth09/seeker/senior-engineer",
  },
  {
    persona_id: "seeker.prompt-injection-attacker",
    role: "seeker",
    label: "Prompt-injection attacker",
    traits: ["adversarial", "tool-boundary-probing"],
    risk_tags: ["prompt-injection"],
    prompt_seed_ref: "prompt-seed://pth09/seeker/prompt-injection-attacker",
  },
  {
    persona_id: "seeker.privacy-sensitive",
    role: "seeker",
    label: "Privacy-sensitive seeker",
    traits: ["data-minimization", "consent-focused"],
    risk_tags: ["privacy-boundary"],
    prompt_seed_ref: "prompt-seed://pth09/seeker/privacy-sensitive",
  },
  {
    persona_id: "employer.structured-compliant",
    role: "employer",
    label: "Structured compliant employer",
    traits: ["clear-rubric", "jurisdiction-aware", "responsive"],
    risk_tags: [],
    prompt_seed_ref: "prompt-seed://pth09/employer/structured-compliant",
  },
  {
    persona_id: "employer.policy-violating",
    role: "employer",
    label: "Policy-violating employer",
    traits: ["unsafe-criteria-request", "over-demanding"],
    risk_tags: ["policy-violation"],
    prompt_seed_ref: "prompt-seed://pth09/employer/policy-violating",
  },
];

export function getProductPersona(personaId: string): ProductPersona | undefined {
  return DEFAULT_PRODUCT_PERSONAS.find((persona) => persona.persona_id === personaId);
}
