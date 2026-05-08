// jsdom doesn't ship TextEncoder/TextDecoder, but jose v6's webapi
// build references them at module load. Polyfill from node:util
// before any test code runs.

import { TextDecoder, TextEncoder } from "node:util";

if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  // @ts-expect-error - node's TextDecoder constructor signature is wider than DOM's.
  globalThis.TextDecoder = TextDecoder;
}
