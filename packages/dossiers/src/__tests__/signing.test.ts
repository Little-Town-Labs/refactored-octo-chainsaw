import { buildDossier } from "../build.js";
import { InMemoryDossierRepository } from "../repo.js";
import { createTestDossierSigningKey, signDossier } from "../signing.js";
import { verifyDossier } from "../verify.js";
import { dossierInput } from "./fixtures.js";

describe("dossier signing", () => {
  it("signs and verifies a dossier", async () => {
    const repository = new InMemoryDossierRepository();
    const key = createTestDossierSigningKey();
    const dossier = await buildDossier({ repository, dossier: dossierInput() });
    const signed = await signDossier({ repository, dossier, key });
    const verification = await verifyDossier({
      repository,
      dossier: signed,
      keys: { resolve: (kid) => (kid === key.kid ? key.publicKey : null) },
    });
    expect(signed.signature?.kid).toBe(key.kid);
    expect(verification.decision).toBe("valid");
    expect(verification.reason_code).toBe("signature_valid");
  });
});
