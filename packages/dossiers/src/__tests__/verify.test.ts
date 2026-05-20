import { buildDossier } from "../build.js";
import { InMemoryDossierRepository } from "../repo.js";
import { createTestDossierSigningKey, signDossier } from "../signing.js";
import { verifyDossier } from "../verify.js";
import { dossierInput } from "./fixtures.js";

describe("dossier verification", () => {
  it("rejects tampered signed fields", async () => {
    const repository = new InMemoryDossierRepository();
    const key = createTestDossierSigningKey();
    const signed = await signDossier({
      repository,
      dossier: await buildDossier({ repository, dossier: dossierInput() }),
      key,
    });
    const tampered = { ...signed, harness_version: "changed" };
    const verification = await verifyDossier({
      repository,
      dossier: tampered,
      keys: { resolve: () => key.publicKey },
    });
    expect(verification.decision).toBe("invalid");
    expect(verification.reason_code).toBe("signature_invalid");
  });

  it("returns unknown_key and signing_disabled reason codes", async () => {
    const repository = new InMemoryDossierRepository();
    const key = createTestDossierSigningKey();
    const dossier = await buildDossier({ repository, dossier: dossierInput() });
    await expect(signDossier({ repository, dossier, key, signingEnabled: false })).rejects.toThrow(
      "signing_disabled",
    );
    const signed = await signDossier({ repository, dossier, key });
    const verification = await verifyDossier({
      repository,
      dossier: signed,
      keys: { resolve: () => null },
    });
    expect(verification.reason_code).toBe("unknown_key");
  });
});
