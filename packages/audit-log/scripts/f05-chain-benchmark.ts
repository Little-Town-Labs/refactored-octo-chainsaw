import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";

import {
  computeEventHash,
  verifyHashChain,
  type AuditEventHashMaterial,
  type AuditEventHashRow,
} from "../src/hash-chain.js";

const EVENT_COUNT = 10_000;
const THRESHOLD_MS = 30_000;

const outArg = process.argv.find((arg) => arg.startsWith("--out="));
const outPath =
  outArg?.slice("--out=".length) ??
  `.specify/specs/05-audit-log-tombstone/quickstart-run-${new Date()
    .toISOString()
    .slice(0, 10)}.md`;
const outputPath = resolve(process.env.INIT_CWD ?? process.cwd(), outPath);

const seededAt = new Date();
const events = seedEvents(EVENT_COUNT, seededAt);

const started = performance.now();
const result = verifyHashChain(events);
const verifyMs = performance.now() - started;
const passed = result.ok && verifyMs < THRESHOLD_MS;

const report = [
  "# F05 quickstart run",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## T009 audit-chain performance baseline",
  "",
  `- events_seeded: ${EVENT_COUNT}`,
  `- verification_ms: ${verifyMs.toFixed(2)}`,
  `- threshold_ms: ${THRESHOLD_MS}`,
  `- chain_status: ${result.ok ? "valid" : "invalid"}`,
  `- result: ${passed ? "PASS" : "FAIL"}`,
  "",
  "Command:",
  "",
  "```sh",
  `pnpm --filter @spyglass/audit-log bench:f05-chain -- --out=${outPath}`,
  "```",
  "",
].join("\n");

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, report);
console.log(report);

if (!passed) process.exit(1);

function seedEvents(count: number, start: Date): AuditEventHashRow[] {
  const rows: AuditEventHashRow[] = [];
  let previousHash: string | null = null;
  for (let i = 0; i < count; i += 1) {
    const event = makeEvent(i, start, previousHash);
    const eventHash = computeEventHash(event);
    rows.push({ ...event, eventHash });
    previousHash = eventHash;
  }
  return rows;
}

function makeEvent(
  index: number,
  start: Date,
  previousHash: string | null,
): AuditEventHashMaterial {
  const createdAt = new Date(start.getTime() + index).toISOString();
  const suffix = (index + 1).toString().padStart(12, "0");
  return {
    auditEventId: `00000000-0000-4000-8000-${suffix}`,
    eventName: "f05.benchmark.event",
    principalId: "22222222-2222-4222-8222-222222222222",
    principalKind: "service",
    roleOrScope: "audit.benchmark",
    correlationId: `f05-bench-${suffix}`,
    payloadHash: hashFixture(index),
    previousHash,
    chainNamespace: "f05-benchmark",
    hashAlgorithm: "sha256",
    canonicalizationVersion: "v1",
    createdAt,
  };
}

function hashFixture(index: number): string {
  return index.toString(16).padStart(64, "0").slice(-64);
}
