import { assertDossierDeliveryEligible } from "../webhook-delivery";

describe("F23 webhook dossier delivery gate", () => {
  it("fails closed unless the dossier has a valid signature and employer projection", () => {
    expect(
      assertDossierDeliveryEligible({
        dossier_id: "dossier_1",
        signature_status: "missing",
        employer_projection: { title: "hidden" },
      }),
    ).toBeUndefined();
    expect(
      assertDossierDeliveryEligible({
        dossier_id: "dossier_1",
        signature_status: "valid",
        employer_projection: null,
      }),
    ).toBeUndefined();
    expect(
      assertDossierDeliveryEligible({
        dossier_id: "dossier_1",
        signature_status: "valid",
        employer_projection: { title: "visible" },
      }),
    ).toEqual({ title: "visible" });
  });
});
