import Link from "next/link";

import { LANDING_CONTENT } from "../src/seeker-web/landing-content";

export default function Home() {
  return (
    <main>
      <section aria-labelledby="hero-title">
        <p>{LANDING_CONTENT.eyebrow}</p>
        <h1 id="hero-title">{LANDING_CONTENT.title}</h1>
        <p>{LANDING_CONTENT.summary}</p>
        <nav aria-label="Seeker account actions">
          <Link href={LANDING_CONTENT.primaryAction.href}>
            {LANDING_CONTENT.primaryAction.label}
          </Link>{" "}
          <Link href={LANDING_CONTENT.secondaryAction.href}>
            {LANDING_CONTENT.secondaryAction.label}
          </Link>{" "}
          <Link href={LANDING_CONTENT.profileAction.href}>
            {LANDING_CONTENT.profileAction.label}
          </Link>
        </nav>
      </section>

      <section aria-labelledby="channels-title">
        <h2 id="channels-title">Conversation channels</h2>
        <ul>
          {LANDING_CONTENT.channelCards.map((card) => (
            <li key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="boundary-title">
        <h2 id="boundary-title">{LANDING_CONTENT.boundary.title}</h2>
        <p>{LANDING_CONTENT.boundary.body}</p>
      </section>

      <section aria-labelledby="agent-title">
        <h2 id="agent-title">Agent-readable discovery</h2>
        <ul>
          {LANDING_CONTENT.agentLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
        <h3>A2A cards</h3>
        <ul>
          {LANDING_CONTENT.a2aCards.map((card) => (
            <li key={card.id}>
              <Link href={card.href}>{card.name}</Link> <span>({card.status})</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
