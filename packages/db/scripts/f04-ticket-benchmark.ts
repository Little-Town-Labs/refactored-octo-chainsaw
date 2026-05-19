// F04 T030 — ticket-store performance benchmark against DATABASE_URL.
//
// The benchmark seeds rows inside a single transaction, measures the
// required hot paths, writes an optional markdown capture, and rolls
// the transaction back so the configured dev DB is not left with
// benchmark data.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";

import { Client } from "pg";

interface Args {
  readonly rows: number;
  readonly fetchSamples: number;
  readonly listSamples: number;
  readonly matchCreateSamples: number;
  readonly out?: string;
}

interface Percentiles {
  readonly p50: number;
  readonly p90: number;
  readonly p99: number;
}

interface Metric extends Percentiles {
  readonly name: string;
  readonly thresholdP90Ms: number;
  readonly samples: number;
  readonly passed: boolean;
}

const DEFAULT_ROWS = 10_000;
const DEFAULT_FETCH_SAMPLES = 250;
const DEFAULT_LIST_SAMPLES = 100;
const DEFAULT_MATCH_CREATE_SAMPLES = 100;

const YEAR = 2026;
const RANGE_STARTS = [10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000];

function parseArgs(argv: readonly string[]): Args {
  const args: Record<string, string | undefined> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return {
    rows: Number.parseInt(args.rows ?? String(DEFAULT_ROWS), 10),
    fetchSamples: Number.parseInt(args["fetch-samples"] ?? String(DEFAULT_FETCH_SAMPLES), 10),
    listSamples: Number.parseInt(args["list-samples"] ?? String(DEFAULT_LIST_SAMPLES), 10),
    matchCreateSamples: Number.parseInt(
      args["match-create-samples"] ?? String(DEFAULT_MATCH_CREATE_SAMPLES),
      10,
    ),
    out: args.out,
  };
}

function loadDotEnvLocal(root: string): void {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function summarize(name: string, values: readonly number[], thresholdP90Ms: number): Metric {
  const p50 = percentile(values, 50);
  const p90 = percentile(values, 90);
  const p99 = percentile(values, 99);
  return {
    name,
    p50,
    p90,
    p99,
    thresholdP90Ms,
    samples: values.length,
    passed: p90 <= thresholdP90Ms,
  };
}

function formatMs(value: number): string {
  return value.toFixed(2);
}

function identifier(prefix: "ST" | "ER" | "MT", start: number, offset: number): string {
  return `${prefix}-${YEAR}-${String(start + offset).padStart(5, "0")}`;
}

async function findEmptyRange(
  client: Client,
  table: string,
  column: string,
  prefix: "ST" | "ER" | "MT",
  reserved: readonly number[] = [],
): Promise<number> {
  for (const start of RANGE_STARTS) {
    if (reserved.includes(start)) continue;
    const end = start + 9999;
    const result = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM ${table} WHERE ${column} BETWEEN $1 AND $2`,
      [identifier(prefix, start, 0), identifier(prefix, end, 0)],
    );
    if (result.rows[0]?.count === "0") return start;
  }
  throw new Error(`no empty ${prefix}-${YEAR} identifier range with 10000 slots is available`);
}

async function seedBenchmarkRows(
  client: Client,
  args: Args,
): Promise<{
  seekerPrincipalId: string;
  employerPrincipalId: string;
  orgId: string;
  seekerRange: number;
  employerRange: number;
  matchRange: number;
  matchCreateRange: number;
  fetchIds: readonly string[];
  createPairs: readonly { seeker_ticket_id: string; employer_req_ticket_id: string }[];
}> {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const seekerRange = await findEmptyRange(client, "seeker_tickets", "identifier", "ST");
  const employerRange = await findEmptyRange(client, "employer_req_tickets", "identifier", "ER");
  const matchRange = await findEmptyRange(client, "match_tickets", "identifier", "MT");
  const matchCreateRange = await findEmptyRange(client, "match_tickets", "identifier", "MT", [
    matchRange,
  ]);

  const orgResult = await client.query<{ org_id: string }>(
    `
      INSERT INTO organizations (clerk_org_id, kind, display_name)
      VALUES ($1, 'employer', 'F04 benchmark org')
      RETURNING org_id
    `,
    [`f04-bench-org-${runId}`],
  );
  const orgId = orgResult.rows[0]?.org_id;
  if (!orgId) throw new Error("failed to create benchmark organization");

  const principals = await client.query<{ principal_id: string; tier: string }>(
    `
      INSERT INTO principals (kind, external_idp, external_id, tier, org_id, display_name)
      VALUES
        ('human', 'clerk', $1, 'seeker', NULL, 'F04 benchmark seeker'),
        ('human', 'clerk', $2, 'employer_admin', $3, 'F04 benchmark employer')
      RETURNING principal_id, tier
    `,
    [`f04-bench-seeker-${runId}`, `f04-bench-employer-${runId}`, orgId],
  );
  const seekerPrincipalId = principals.rows.find((row) => row.tier === "seeker")?.principal_id;
  const employerPrincipalId = principals.rows.find(
    (row) => row.tier === "employer_admin",
  )?.principal_id;
  if (!seekerPrincipalId || !employerPrincipalId) {
    throw new Error("failed to create benchmark principals");
  }

  await client.query(
    `
      INSERT INTO seeker_tickets (
        principal_id,
        identifier,
        state,
        role_family,
        comp_band_min,
        comp_band_max,
        currency,
        jurisdictions,
        work_mode,
        flags,
        created_at,
        updated_at
      )
      SELECT
        $1::uuid,
        'ST-${YEAR}-' || lpad(($2::int + g - 1)::text, 5, '0'),
        CASE WHEN g % 2 = 0 THEN 'matching' ELSE 'screening' END,
        'software_engineering',
        100000,
        150000,
        'USD',
        '["US-CA"]'::jsonb,
        'remote',
        '[]'::jsonb,
        now() - make_interval(secs => ($3::int - g)),
        now() - make_interval(secs => ($3::int - g))
      FROM generate_series(1, $3::int) AS g
    `,
    [seekerPrincipalId, seekerRange, args.rows],
  );

  await client.query(
    `
      INSERT INTO employer_req_tickets (
        principal_id,
        org_id,
        identifier,
        state,
        role_title,
        role_level,
        comp_band_min,
        comp_band_max,
        currency,
        jurisdictions,
        work_mode,
        headcount_total,
        headcount_filled,
        flags,
        created_at,
        updated_at
      )
      SELECT
        $1::uuid,
        $2::uuid,
        'ER-${YEAR}-' || lpad(($3::int + g - 1)::text, 5, '0'),
        CASE WHEN g % 2 = 0 THEN 'matching' ELSE 'open' END,
        'Senior Engineer',
        'senior',
        110000,
        170000,
        'USD',
        '["US-CA"]'::jsonb,
        'remote',
        3,
        0,
        '[]'::jsonb,
        now() - make_interval(secs => ($4::int - g)),
        now() - make_interval(secs => ($4::int - g))
      FROM generate_series(1, $4::int) AS g
    `,
    [employerPrincipalId, orgId, employerRange, args.rows],
  );

  await client.query(
    `
      WITH seekers AS (
        SELECT seeker_ticket_id, row_number() OVER (ORDER BY identifier) AS rn
        FROM seeker_tickets
        WHERE identifier BETWEEN $1 AND $2
      ),
      employers AS (
        SELECT employer_req_ticket_id, row_number() OVER (ORDER BY identifier) AS rn
        FROM employer_req_tickets
        WHERE identifier BETWEEN $3 AND $4
      )
      INSERT INTO match_tickets (
        identifier,
        seeker_ticket_id,
        employer_req_ticket_id,
        state,
        round,
        round_cap,
        run_id,
        attempt,
        seeker_contract_id,
        seeker_contract_version,
        employer_contract_id,
        employer_contract_version,
        privacy_ruleset_id,
        privacy_ruleset_version,
        decision_locus_jurisdiction,
        flags,
        created_at,
        updated_at
      )
      SELECT
        'MT-${YEAR}-' || lpad(($5::int + s.rn - 1)::text, 5, '0'),
        s.seeker_ticket_id,
        e.employer_req_ticket_id,
        CASE WHEN s.rn % 2 = 0 THEN 'negotiating' ELSE 'created' END,
        0,
        3,
        NULL,
        1,
        'bench-seeker-contract',
        'v1',
        'bench-employer-contract',
        'v1',
        'bench-privacy-ruleset',
        'v1',
        'US-CA',
        '[]'::jsonb,
        now() - make_interval(secs => ($6::int - s.rn)),
        now() - make_interval(secs => ($6::int - s.rn))
      FROM seekers s
      JOIN employers e ON e.rn = s.rn
    `,
    [
      identifier("ST", seekerRange, 0),
      identifier("ST", seekerRange, args.rows - 1),
      identifier("ER", employerRange, 0),
      identifier("ER", employerRange, args.rows - 1),
      matchRange,
      args.rows,
    ],
  );

  const fetchIds = await client.query<{ seeker_ticket_id: string }>(
    `
      SELECT seeker_ticket_id
      FROM seeker_tickets
      WHERE identifier BETWEEN $1 AND $2
      ORDER BY identifier
      LIMIT $3
    `,
    [
      identifier("ST", seekerRange, 0),
      identifier("ST", seekerRange, args.rows - 1),
      args.fetchSamples,
    ],
  );

  const createPairs = await client.query<{
    seeker_ticket_id: string;
    employer_req_ticket_id: string;
  }>(
    `
      WITH seekers AS (
        SELECT seeker_ticket_id, row_number() OVER (ORDER BY identifier) AS rn
        FROM seeker_tickets
        WHERE identifier BETWEEN $1 AND $2
      ),
      employers AS (
        SELECT employer_req_ticket_id, row_number() OVER (ORDER BY identifier) AS rn
        FROM employer_req_tickets
        WHERE identifier BETWEEN $3 AND $4
      )
      SELECT s.seeker_ticket_id, e.employer_req_ticket_id
      FROM seekers s
      JOIN employers e ON e.rn = s.rn
      ORDER BY s.rn
      LIMIT $5
    `,
    [
      identifier("ST", seekerRange, 0),
      identifier("ST", seekerRange, args.rows - 1),
      identifier("ER", employerRange, 0),
      identifier("ER", employerRange, args.rows - 1),
      args.matchCreateSamples,
    ],
  );

  return {
    seekerPrincipalId,
    employerPrincipalId,
    orgId,
    seekerRange,
    employerRange,
    matchRange,
    matchCreateRange,
    fetchIds: fetchIds.rows.map((row) => row.seeker_ticket_id),
    createPairs: createPairs.rows,
  };
}

async function time<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = performance.now();
  const value = await fn();
  return { value, ms: performance.now() - start };
}

function renderReport(
  args: Args,
  metrics: readonly Metric[],
  details: Record<string, string>,
): string {
  const lines = [
    "# F04 T030 Ticket Benchmark",
    "",
    `Run timestamp: ${new Date().toISOString()}`,
    `Rows per kind: ${args.rows}`,
    `Fetch samples: ${args.fetchSamples}`,
    `List samples: ${args.listSamples}`,
    `Match-create samples: ${args.matchCreateSamples}`,
    "",
    "## Seed Details",
    "",
    ...Object.entries(details).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Latencies",
    "",
    "| Operation | Samples | p50 ms | p90 ms | p99 ms | p90 threshold ms | Result |",
    "|---|---:|---:|---:|---:|---:|---|",
    ...metrics.map(
      (m) =>
        `| ${m.name} | ${m.samples} | ${formatMs(m.p50)} | ${formatMs(m.p90)} | ${formatMs(
          m.p99,
        )} | ${m.thresholdP90Ms} | ${m.passed ? "PASS" : "FAIL"} |`,
    ),
    "",
    "All seed data was inserted inside a transaction and rolled back after measurement.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  loadDotEnvLocal(repoRoot);

  const args = parseArgs(process.argv.slice(2));
  assertPositiveInteger("rows", args.rows);
  assertPositiveInteger("fetch-samples", args.fetchSamples);
  assertPositiveInteger("list-samples", args.listSamples);
  assertPositiveInteger("match-create-samples", args.matchCreateSamples);
  if (args.rows !== DEFAULT_ROWS) {
    throw new Error("T030 requires --rows 10000 for the acceptance benchmark");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Populate .env.local before running T030.");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '120s'");

    const seed = await seedBenchmarkRows(client, args);

    const fetchTimes: number[] = [];
    for (const id of seed.fetchIds) {
      const result = await time(() =>
        client.query("SELECT * FROM seeker_tickets WHERE seeker_ticket_id = $1 LIMIT 1", [id]),
      );
      if (result.value.rowCount !== 1) throw new Error(`fetch-by-id missed row ${id}`);
      fetchTimes.push(result.ms);
    }

    const listTimes: number[] = [];
    for (let i = 0; i < args.listSamples; i += 1) {
      const result = await time(() =>
        client.query(
          `
            SELECT *
            FROM seeker_tickets
            WHERE state = 'matching'
            ORDER BY created_at DESC
            LIMIT 50
          `,
        ),
      );
      if (result.value.rowCount === 0) throw new Error("list-by-state returned no rows");
      listTimes.push(result.ms);
    }

    const matchCreateTimes: number[] = [];
    for (let i = 0; i < seed.createPairs.length; i += 1) {
      const pair = seed.createPairs[i];
      if (!pair) throw new Error(`missing create pair ${i}`);
      const result = await time(() =>
        client.query(
          `
            INSERT INTO match_tickets (
              identifier,
              seeker_ticket_id,
              employer_req_ticket_id,
              state,
              round,
              round_cap,
              run_id,
              attempt,
              seeker_contract_id,
              seeker_contract_version,
              employer_contract_id,
              employer_contract_version,
              privacy_ruleset_id,
              privacy_ruleset_version,
              decision_locus_jurisdiction,
              flags
            )
            VALUES (
              $1,
              $2::uuid,
              $3::uuid,
              'created',
              0,
              3,
              NULL,
              2,
              'bench-seeker-contract',
              'v1',
              'bench-employer-contract',
              'v1',
              'bench-privacy-ruleset',
              'v1',
              'US-CA',
              '[]'::jsonb
            )
          `,
          [
            identifier("MT", seed.matchCreateRange, i),
            pair.seeker_ticket_id,
            pair.employer_req_ticket_id,
          ],
        ),
      );
      if (result.value.rowCount !== 1) throw new Error(`match-create insert failed at sample ${i}`);
      matchCreateTimes.push(result.ms);
    }

    const metrics = [
      summarize("fetch-by-id", fetchTimes, 50),
      summarize("list-by-state", listTimes, 200),
      summarize("match-create", matchCreateTimes, 500),
    ];
    const report = renderReport(args, metrics, {
      seeker_principal_id: seed.seekerPrincipalId,
      employer_principal_id: seed.employerPrincipalId,
      org_id: seed.orgId,
      seeker_identifier_range: `${identifier("ST", seed.seekerRange, 0)}..${identifier(
        "ST",
        seed.seekerRange,
        args.rows - 1,
      )}`,
      employer_identifier_range: `${identifier("ER", seed.employerRange, 0)}..${identifier(
        "ER",
        seed.employerRange,
        args.rows - 1,
      )}`,
      match_identifier_range: `${identifier("MT", seed.matchRange, 0)}..${identifier(
        "MT",
        seed.matchRange,
        args.rows - 1,
      )}`,
      match_create_identifier_range: `${identifier("MT", seed.matchCreateRange, 0)}..${identifier(
        "MT",
        seed.matchCreateRange,
        args.matchCreateSamples - 1,
      )}`,
    });

    process.stdout.write(report);
    if (args.out) {
      const outPath = path.resolve(repoRoot, args.out);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, report);
    }

    const failures = metrics.filter((metric) => !metric.passed);
    if (failures.length > 0) {
      throw new Error(`p90 threshold failed: ${failures.map((f) => f.name).join(", ")}`);
    }
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    await client.end();
  }
}

await main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
