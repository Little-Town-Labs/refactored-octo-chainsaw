import { runF20StagedDevRun } from "../src/staged-dev-run.js";

for (const line of runF20StagedDevRun()) {
  console.log(line);
}
