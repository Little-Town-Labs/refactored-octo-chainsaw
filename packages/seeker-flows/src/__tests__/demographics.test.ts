import { handleDemographicConsent } from "../demographics.js";
import { createRepos, makeEvent } from "./fixtures.js";

describe("demographic consent", () => {
  it("stores consented data only by segregated reference and not operational profile", () => {
    const repos = createRepos();
    const result = handleDemographicConsent(
      makeEvent("web-chat", "demographic-consent", { actionId: "consent" }),
      repos,
      { counselApproved: true, jurisdictionEnabled: true, consentVersion: "v1" },
    );

    const posture = repos.getDemographicConsent("seeker-1");
    expect(result.reasonCode).toBe("demographic_consented");
    expect(posture?.segregatedDataRef).toBe("bias-audit:seeker-1");
    expect(repos.getProfile("seeker-1")).toBeUndefined();
  });

  it.each(["telegram", "email", "web-chat"] as const)(
    "supports decline and withdrawal without blocking core matching on %s",
    (channel) => {
      const repos = createRepos();
      expect(
        handleDemographicConsent(
          makeEvent(channel, "demographic-consent", { actionId: "decline" }),
          repos,
          {
            counselApproved: true,
            jurisdictionEnabled: true,
          },
        ).reasonCode,
      ).toBe("demographic_declined");
      expect(
        handleDemographicConsent(
          makeEvent(channel, "demographic-consent", { actionId: "withdraw" }),
          repos,
          {
            counselApproved: true,
            jurisdictionEnabled: true,
          },
        ).reasonCode,
      ).toBe("demographic_withdrawn");
    },
  );

  it("keeps collection disabled without counsel or jurisdiction posture", () => {
    const repos = createRepos();

    expect(
      handleDemographicConsent(
        makeEvent("email", "demographic-consent", { actionId: "consent" }),
        repos,
        {
          counselApproved: false,
          jurisdictionEnabled: true,
        },
      ).reasonCode,
    ).toBe("demographic_disabled-counsel");
    expect(repos.getDemographicConsent("seeker-1")?.collectionEnabled).toBe(false);
  });
});
