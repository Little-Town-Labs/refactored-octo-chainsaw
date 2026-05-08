// F02 T039 — Drizzle-backed JwksRepo adapter.
//
// Reads the `signing_keys` table for rows that satisfy the JWKS
// visibility predicate (active OR within verify window).

import type { JwksKeyRow, JwksRepo } from "@spyglass/auth";
import { type Db, signingKeys } from "@spyglass/db";
import { and, eq, gt, isNotNull, isNull, or } from "drizzle-orm";

export function createDrizzleJwksRepo(db: Db): JwksRepo {
  return {
    async listVisibleKeys(purpose, now) {
      const rows = await db
        .select()
        .from(signingKeys)
        .where(
          and(
            eq(signingKeys.purpose, purpose),
            isNotNull(signingKeys.activated_at),
            or(
              isNull(signingKeys.retired_at),
              isNull(signingKeys.verify_until),
              gt(signingKeys.verify_until, now),
            ),
          ),
        );
      return rows.map(
        (r): JwksKeyRow => ({
          kid: r.kid,
          algorithm: r.algorithm,
          public_key_jwk: r.public_key_jwk,
          purpose: r.purpose as "agent" | "service",
          activated_at: r.activated_at,
          retired_at: r.retired_at,
          verify_until: r.verify_until,
        }),
      );
    },
  };
}
