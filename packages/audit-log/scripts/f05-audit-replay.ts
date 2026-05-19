import { closeDb, getDb } from "@spyglass/db";

import { createDrizzleAuditReplayStore, replayAuditEventsBuffer } from "../src/replay.js";

const db = getDb();

try {
  const result = await replayAuditEventsBuffer(createDrizzleAuditReplayStore(db));
  console.log(JSON.stringify({ kind: "f05_audit_replay", ...result }));
} finally {
  await closeDb();
}
