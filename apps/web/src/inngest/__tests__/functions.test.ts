import { functions, inngestSyncCanary } from "../functions";

describe("inngest functions", () => {
  it("registers the sync canary function for app sync visibility", () => {
    expect(functions).toEqual([inngestSyncCanary]);
  });
});
