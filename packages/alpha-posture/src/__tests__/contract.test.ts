import fs from "node:fs";

import { alphaDossierPostureSchema } from "../schemas.js";
import { alphaDossierPosture } from "../dossier.js";

describe("alpha posture contract", () => {
  it("keeps YAML contract aligned with posture metadata", () => {
    const contract = fs.readFileSync("contracts/alpha-posture.v1.schema.yaml", "utf8");
    const posture = alphaDossierPosture("2026-05-26T12:00:00.000Z");

    expect(contract).toContain("alpha - informational only");
    expect(contract).toContain("phase_0_alpha");
    expect(alphaDossierPostureSchema.parse(posture)).toEqual(posture);
  });
});
