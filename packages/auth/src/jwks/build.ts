// F02 T039 — Render `Jwks` from `signing_keys` rows.
//
// Pure function: given the visible rows the repo returned, project
// each `public_key_jwk` and ensure the `kid` / `alg` / `use` fields
// are present (the bootstrap script already writes them; this layer
// is the second line of defense against drift).

import type { Jwks, JwksKeyRow } from "./types.js";

export function buildJwks(rows: ReadonlyArray<JwksKeyRow>): Jwks {
  return {
    keys: rows.map((row) => ({
      ...row.public_key_jwk,
      kid: row.kid,
      alg: row.algorithm,
      use: "sig",
    })),
  };
}
