import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { assertNoDispatcherBypass } from "../src/import-boundary.js";

const root = process.argv[2] ?? "../..";
const paths = collectTypeScriptFiles(root).filter(
  (path) => !path.includes("tool-dispatcher/src/__tests__"),
);

assertNoDispatcherBypass(paths);

function collectTypeScriptFiles(path: string): string[] {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (stat.isFile()) return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
  if (!stat.isDirectory()) return [];
  if (["node_modules", "dist", ".next", ".turbo"].includes(path.split("/").at(-1) ?? "")) return [];
  return readdirSync(path).flatMap((entry) => collectTypeScriptFiles(join(path, entry)));
}
