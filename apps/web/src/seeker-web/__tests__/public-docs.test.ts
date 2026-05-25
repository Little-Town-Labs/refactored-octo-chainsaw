import { readFileSync } from "node:fs";
import { join } from "node:path";

const publicDir = join(process.cwd(), "public");
const agentsMd = readFileSync(join(publicDir, "agents.md"), "utf8");
const llmsTxt = readFileSync(join(publicDir, "llms.txt"), "utf8");

describe("F21 public agent docs", () => {
  it("publishes agents.md with required sections and A2A links", () => {
    expect(agentsMd).toContain("Spyglass agents.md");
    expect(agentsMd).toContain("Human Entry Points");
    expect(agentsMd).toContain("Agent Entry Points");
    expect(agentsMd).toContain("/.well-known/a2a/index.json");
    expect(agentsMd).toContain("/.well-known/a2a/seeker-intake.json");
    expect(agentsMd).toContain("Runtime A2A protocol handlers are");
    expect(agentsMd).toContain("not live in v0");
  });

  it("publishes llms.txt with public paths and disallowed use boundaries", () => {
    expect(llmsTxt).toContain("Spyglass");
    expect(llmsTxt).toContain("Public Paths");
    expect(llmsTxt).toContain("/agents.md");
    expect(llmsTxt).toContain("/.well-known/a2a/*.json");
    expect(llmsTxt).toContain("not permission to scrape private data");
    expect(llmsTxt).toContain("not as a v0 customer-flow dependency");
  });

  it("does not advertise live dashboards or runtime A2A handlers", () => {
    const combined = `${agentsMd}\n${llmsTxt}`.toLowerCase();

    expect(combined).toContain("does not provide a seeker dashboard");
    expect(combined).toMatch(/runtime a2a protocol handlers are\s+not live/);
    expect(combined).not.toContain("runtime a2a protocol handlers are live");
  });

  it("keeps public docs static and free of auth/session/private-state claims", () => {
    const combined = `${agentsMd}\n${llmsTxt}`.toLowerCase();

    expect(combined).not.toContain("session cookie");
    expect(combined).not.toContain("database connection");
    expect(combined).not.toContain("raw transcript available");
    expect(combined).not.toContain("hidden run state available");
  });
});
