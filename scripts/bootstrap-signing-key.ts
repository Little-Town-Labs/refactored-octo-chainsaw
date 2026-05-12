// F02 T037 — Bootstrap script: generate first EdDSA signing keypair.
//
// Usage:
//   pnpm exec tsx scripts/bootstrap-signing-key.ts [--purpose agent|service]
//
// Emits two artifacts to stdout:
//
//   1. `.env` lines for the runtime — the private key (PKCS8, base64)
//      and the matching `kid`. The operator copies these into Vercel
//      env scope and redeploys.
//
//   2. SQL `INSERT` for the `signing_keys` row. The operator runs it
//      against the target database to publish the public JWK and mark
//      the row active.
//
// The script never touches disk or DB — operators paste the SQL after
// reviewing it. Auditable and re-runnable in dev.

import {
  exportPrivateKeyPkcs8,
  generateEdDSAKeypair,
} from "../packages/auth/dist/issuer/keygen.js";

interface CliArgs {
  readonly purpose: "agent" | "service";
}

function parseArgs(argv: ReadonlyArray<string>): CliArgs {
  const purposeIdx = argv.indexOf("--purpose");
  const purpose = purposeIdx >= 0 ? argv[purposeIdx + 1] : "agent";
  if (purpose !== "agent" && purpose !== "service") {
    throw new Error(`Invalid --purpose ${purpose}; expected 'agent' or 'service'.`);
  }
  return { purpose };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const kp = await generateEdDSAKeypair();
  const pkcs8Pem = await exportPrivateKeyPkcs8(kp.privateKey);
  const pkcs8B64 = Buffer.from(pkcs8Pem, "utf8").toString("base64");
  const envPrefix = args.purpose === "agent" ? "SPYGLASS_AGENT" : "SPYGLASS_SERVICE";

  console.log(`# F02 ${args.purpose} signing key bootstrap
# kid: ${kp.kid}
#
# 1. Add to Vercel env scope (production / preview / development):
#
${envPrefix}_SIGNING_KID=${kp.kid}
${envPrefix}_SIGNING_KEY_PKCS8_B64=${pkcs8B64}
#
# 2. Run against the target database:
#
INSERT INTO signing_keys (kid, algorithm, public_key_jwk, purpose, activated_at)
VALUES (
  '${kp.kid}',
  'EdDSA',
  '${JSON.stringify(kp.publicJwk)}'::jsonb,
  '${args.purpose}',
  now()
);
#
# 3. Redeploy so the new env vars take effect.`);
}

main().catch((err: unknown) => {
  process.stderr.write(`bootstrap-signing-key failed: ${(err as Error).message}\n`);
  process.exit(1);
});
