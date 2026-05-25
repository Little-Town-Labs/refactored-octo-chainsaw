import { A2A_AGENT_CARDS, a2aCardHref } from "./a2a-cards";

export const LANDING_CONTENT = {
  title: "Spyglass",
  eyebrow: "Conversation-first hiring advocacy",
  summary:
    "Spyglass helps seekers work with a hosted advocate through conversation-first Telegram, email, and web chat. The web surface is only for account setup and public discovery.",
  primaryAction: {
    label: "Start with Spyglass",
    href: "/sign-up",
  },
  secondaryAction: {
    label: "Sign in",
    href: "/sign-in",
  },
  profileAction: {
    label: "Manage account",
    href: "/profile",
  },
  channelCards: [
    {
      title: "Telegram",
      body: "Primary conversational onboarding and match updates.",
    },
    {
      title: "Email",
      body: "Async-friendly fallback for onboarding and follow-up.",
    },
    {
      title: "Web chat",
      body: "Clerk-authenticated first-touch from the public site.",
    },
  ],
  boundary: {
    title: "No dashboard",
    body: "The seeker product is the conversation. The site does not provide job browsing, match feeds, analytics, or product workspace screens.",
  },
  agentLinks: [
    { label: "agents.md", href: "/agents.md" },
    { label: "llms.txt", href: "/llms.txt" },
    { label: "A2A card index", href: "/.well-known/a2a/index.json" },
  ],
  a2aCards: A2A_AGENT_CARDS.map((card) => ({
    id: card.id,
    name: card.name,
    href: a2aCardHref(card.id),
    status: `${card.availability}; ${card.runtime_status}`,
  })),
} as const;

export function landingSearchText(): string {
  return [
    LANDING_CONTENT.title,
    LANDING_CONTENT.eyebrow,
    LANDING_CONTENT.summary,
    LANDING_CONTENT.boundary.title,
    LANDING_CONTENT.boundary.body,
    ...LANDING_CONTENT.channelCards.flatMap((card) => [card.title, card.body]),
    ...LANDING_CONTENT.agentLinks.map((link) => link.label),
  ].join(" ");
}
