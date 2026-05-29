import Image from "next/image";
import Link from "next/link";

import { LANDING_CONTENT } from "../src/seeker-web/landing-content";

export default function Home() {
  return (
    <main className="landing-page">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">{LANDING_CONTENT.eyebrow}</p>
          <h1 id="hero-title">{LANDING_CONTENT.title}</h1>
          <p className="landing-summary">{LANDING_CONTENT.summary}</p>
          <nav className="landing-actions" aria-label="Seeker account actions">
            <Link className="landing-primary-action" href={LANDING_CONTENT.primaryAction.href}>
              {LANDING_CONTENT.primaryAction.label}
            </Link>
            <Link className="landing-secondary-action" href={LANDING_CONTENT.secondaryAction.href}>
              {LANDING_CONTENT.secondaryAction.label}
            </Link>
            <Link className="landing-secondary-action" href={LANDING_CONTENT.profileAction.href}>
              {LANDING_CONTENT.profileAction.label}
            </Link>
          </nav>
        </div>
        <div className="landing-hero-visual" aria-label="Spyglass secure conversation workspace">
          <Image
            src="/landing/spyglass-hero.png"
            alt="A secure conversation workspace with verification, consent, and review indicators."
            width={1672}
            height={941}
            sizes="(max-width: 900px) 100vw, 48vw"
            priority
          />
        </div>
      </section>

      <section className="landing-section landing-channels" aria-labelledby="channels-title">
        <div className="landing-section-heading">
          <p className="landing-kicker">Seeker entry points</p>
          <h2 id="channels-title">Conversation channels</h2>
        </div>
        <ul className="landing-card-grid">
          {LANDING_CONTENT.channelCards.map((card) => (
            <li className="landing-card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-section landing-boundary" aria-labelledby="boundary-title">
        <div>
          <p className="landing-kicker">Product boundary</p>
          <h2 id="boundary-title">{LANDING_CONTENT.boundary.title}</h2>
        </div>
        <p>{LANDING_CONTENT.boundary.body}</p>
      </section>

      <section className="landing-section landing-agent-discovery" aria-labelledby="agent-title">
        <div className="landing-section-heading">
          <p className="landing-kicker">Public machine-readable surface</p>
          <h2 id="agent-title">Agent-readable discovery</h2>
        </div>
        <div className="landing-discovery-layout">
          <nav aria-label="Public discovery documents">
            <ul className="landing-link-list">
              {LANDING_CONTENT.agentLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h3>A2A cards</h3>
            <ul className="landing-a2a-list">
              {LANDING_CONTENT.a2aCards.map((card) => (
                <li key={card.id}>
                  <Link href={card.href}>{card.name}</Link>
                  <span>{card.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
