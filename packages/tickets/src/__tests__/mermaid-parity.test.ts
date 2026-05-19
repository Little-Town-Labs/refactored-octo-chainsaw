// F04 T013 — Mermaid ↔ transition-map parity test.
//
// Parses the three `stateDiagram-v2` blocks in
// `.specify/specs/04-ticket-store-state-machines/data-model.md` and
// asserts that each Mermaid edge has a matching entry in the
// corresponding `*_TRANSITIONS` catalog. Catches drift between the
// human-reviewable artifact and the implementation (FR-14).
//
// Mermaid edge format we recognize:
//     <from> --> <to>: <label>
// where `<from>` and `<to>` are state identifiers (we ignore `[*]`,
// which marks the entry/exit pseudo-states).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { SEEKER_TRANSITIONS, EMPLOYER_REQ_TRANSITIONS, MATCH_TRANSITIONS } from "../transitions.js";

// `process.cwd()` is the package root when Jest is launched via
// `pnpm --filter @spyglass/tickets test` (the standard invocation).
// Walk up to the repo root and into the F04 spec directory.
const DATA_MODEL = resolve(
  process.cwd(),
  "../../.specify/specs/04-ticket-store-state-machines/data-model.md",
);

interface MermaidEdge {
  from: string;
  to: string;
}

function extractStateDiagrams(md: string): string[] {
  const blocks: string[] = [];
  const re = /```mermaid\s*\n([\s\S]*?)\n```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    if (/stateDiagram/.test(m[1] ?? "")) blocks.push(m[1] ?? "");
  }
  return blocks;
}

function parseEdges(diagram: string): MermaidEdge[] {
  const edges: MermaidEdge[] = [];
  // Match `<state> --> <state>` (ignore [*] pseudo-states).
  const re = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*-->\s*([A-Za-z_][A-Za-z0-9_]*)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(diagram)) !== null) {
    edges.push({ from: m[1]!, to: m[2]! });
  }
  return edges;
}

describe("Mermaid ↔ transition-map parity (data-model.md §2)", () => {
  const md = readFileSync(DATA_MODEL, "utf8");
  const diagrams = extractStateDiagrams(md);

  test("data-model.md contains exactly three state diagrams", () => {
    expect(diagrams.length).toBe(3);
  });

  // Two collapsed-action edges in the seeker Mermaid block represent
  // distinct *actions* on the same (from, to) pair (e.g.,
  // `screening → closed` for both `system:intake_fail` and
  // `operator:close`). The transition catalog is keyed by (from, to)
  // alone, so the comparison sets dedupe pairs.
  const cases: Array<[string, ReadonlyArray<{ from: string; to: string }>]> = [
    ["seeker", SEEKER_TRANSITIONS],
    ["employer_req", EMPLOYER_REQ_TRANSITIONS],
    ["match", MATCH_TRANSITIONS],
  ];

  test.each(cases)(
    "%s diagram edges match catalog (deduped (from, to) pairs)",
    (_name, catalog) => {
      const idx = cases.findIndex(([n]) => n === _name);
      const mermaidEdges = parseEdges(diagrams[idx]!);
      const mermaidPairs = new Set(mermaidEdges.map((e) => `${e.from}->${e.to}`));
      const catalogPairs = new Set(catalog.map((t) => `${t.from}->${t.to}`));

      const onlyInMermaid = [...mermaidPairs].filter((p) => !catalogPairs.has(p));
      const onlyInCatalog = [...catalogPairs].filter((p) => !mermaidPairs.has(p));

      expect({ onlyInMermaid, onlyInCatalog }).toEqual({
        onlyInMermaid: [],
        onlyInCatalog: [],
      });
    },
  );
});
