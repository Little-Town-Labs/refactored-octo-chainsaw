import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { assertNoModelGatewayReachability } from "../src/reachability.js";

const root = process.argv[2] ?? "src";
const paths = collectTypeScriptFiles(root).filter(
  (path) =>
    !path.includes("/__tests__/") &&
    !path.includes("\\__tests__\\") &&
    !path.endsWith("reachability.ts"),
);

assertNoModelGatewayReachability(paths);

function collectTypeScriptFiles(path: string): string[] {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (stat.isFile()) return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
  if (!stat.isDirectory()) return [];
  if (["node_modules", "dist", ".next", ".turbo"].includes(path.split("/").at(-1) ?? "")) return [];
  return readdirSync(path).flatMap((entry) => collectTypeScriptFiles(join(path, entry)));
}
