import { readRubricVersions } from "../review.js";
import { RubricScopeRequiredError } from "../scopes.js";
import { MemoryRubricRepository, REVIEWER_ID } from "./fixtures.js";

describe("rubric review authorization", () => {
  test("denies unscoped reads by default", async () => {
    await expect(
      readRubricVersions(new MemoryRubricRepository(), {
        principal: { principal_id: REVIEWER_ID, principal_kind: "human", scopes: [] },
      }),
    ).rejects.toBeInstanceOf(RubricScopeRequiredError);
  });
});
