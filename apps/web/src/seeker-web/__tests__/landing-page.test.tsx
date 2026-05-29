import { render, screen, within } from "@testing-library/react";

import Home from "../../../app/page";

describe("F21 landing page", () => {
  it("renders accessible landmarks, headings, and account links", () => {
    render(<Home />);

    const main = screen.getByRole("main");
    expect(within(main).getByRole("heading", { level: 1, name: "Spyglass" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Seeker account actions" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "A secure conversation workspace with verification, consent, and review indicators.",
      }),
    ).toHaveAttribute("src", expect.stringContaining("spyglass-hero.png"));
    expect(screen.getByRole("link", { name: "Start with Spyglass" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: "Manage account" })).toHaveAttribute(
      "href",
      "/profile",
    );
  });

  it("renders channel, public doc, and A2A discovery sections without product navigation", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Conversation channels" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Agent-readable discovery" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "agents.md" })).toHaveAttribute("href", "/agents.md");
    expect(screen.getByRole("link", { name: "llms.txt" })).toHaveAttribute("href", "/llms.txt");
    expect(screen.getByRole("link", { name: "A2A card index" })).toHaveAttribute(
      "href",
      "/.well-known/a2a/index.json",
    );

    const linkHrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(linkHrefs).not.toEqual(expect.arrayContaining(["/dashboard", "/tickets", "/jobs"]));
  });

  it("renders stable text that can fit responsive surfaces", () => {
    render(<Home />);

    for (const text of ["Telegram", "Email", "Web chat"]) {
      expect(screen.getByRole("heading", { name: text })).toBeInTheDocument();
    }
    expect(screen.getByText(/public discovery/i)).toBeInTheDocument();
  });
});
