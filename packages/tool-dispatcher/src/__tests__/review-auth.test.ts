import { readDispatcherBypassFindings, readToolSurfaces } from "../review.js";
import { ToolScopeDeniedError } from "../scopes.js";

import { MemoryToolRepository, operator } from "./fixtures.js";

describe("tool review authorization", () => {
  it("denies unscoped review reads", async () => {
    const repo = new MemoryToolRepository();
    await expect(readToolSurfaces(repo, { principal: operator([]) })).rejects.toBeInstanceOf(
      ToolScopeDeniedError,
    );
    await expect(readDispatcherBypassFindings(repo, operator([]))).rejects.toBeInstanceOf(
      ToolScopeDeniedError,
    );
  });
});
