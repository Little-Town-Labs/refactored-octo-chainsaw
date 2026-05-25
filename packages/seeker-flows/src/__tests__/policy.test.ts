import { isAuthorizedEvent, isDemographicCollectionEnabled } from "../policy.js";
import { makeEvent } from "./fixtures.js";

describe("policy helpers", () => {
  it("fails closed for unverified channel posture", () => {
    expect(
      isAuthorizedEvent(
        makeEvent("email", "onboarding", {
          channelPosture: {
            seekerId: "seeker-1",
            channel: "email",
            channelLinkId: "email:link",
            verified: false,
            authorized: true,
          },
        }),
      ),
    ).toBe(false);
  });

  it("enables demographic collection only with consent, counsel, jurisdiction, and segregated ref", () => {
    expect(
      isDemographicCollectionEnabled({
        seekerId: "seeker-1",
        consentState: "consented",
        collectionEnabled: true,
        consentVersion: "v1",
        jurisdictionPosture: "enabled",
        segregatedDataRef: "bias-audit:seeker-1",
        decidedAt: new Date(),
      }),
    ).toBe(true);
  });
});
