import { candidateDossierProjectionPayload } from "../candidate-detail-view";

describe("F22 prohibited surface regressions", () => {
  it("does not expose private candidate dossier fields from the projection allowlist", () => {
    const payload = candidateDossierProjectionPayload({
      summary: "Approved",
      raw_transcript: "private",
      hidden_run_state: "private",
      private_notes: "private",
      score_internals: "private",
    });
    expect(payload).toEqual({ summary: "Approved" });
  });
});
