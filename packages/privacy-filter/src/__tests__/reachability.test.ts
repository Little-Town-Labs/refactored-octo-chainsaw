import { findModelGatewayReachabilityInText } from "../reachability.js";

describe("model gateway reachability guard", () => {
  it("detects forbidden model imports and allows ordinary deterministic code", () => {
    expect(
      findModelGatewayReachabilityInText("bad.ts", `import OpenAI from "openai";`),
    ).toHaveLength(1);
    expect(findModelGatewayReachabilityInText("ok.ts", `export const x = 1;`)).toHaveLength(0);
  });
});
