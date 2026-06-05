import { inngest } from "./client";

export const inngestSyncCanary = inngest.createFunction(
  { id: "spyglass-inngest-sync-canary", triggers: [{ event: "spyglass/inngest.sync_canary" }] },
  async ({ event }) => ({
    ok: true,
    received_at: new Date().toISOString(),
    event_name: event.name,
  }),
);

export const functions = [inngestSyncCanary];
