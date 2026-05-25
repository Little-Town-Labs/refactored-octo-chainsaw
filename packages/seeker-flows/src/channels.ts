import {
  createChannelMessage,
  type ChannelKind,
  type ChannelMessage,
} from "@spyglass/channels-core";
import type { SeekerFlowChannel, SeekerOutboundPrompt } from "./types.js";

export const toChannelKind = (channel: SeekerFlowChannel): ChannelKind =>
  channel === "web-chat" ? "web_chat" : channel;

export const outboundPromptToChannelMessage = (prompt: SeekerOutboundPrompt): ChannelMessage =>
  createChannelMessage({
    direction: "outbound",
    channel: { kind: toChannelKind(prompt.channel), version: "f20", enabled: true },
    participant: {
      principal_id: prompt.seekerId,
      link_status: "verified",
      role: "seeker",
    },
    thread: {
      thread_id: prompt.correlationId,
      seeker_ticket_id: prompt.seekerId,
      state: "open",
    },
    idempotency_key: prompt.promptId,
    occurred_at: new Date(),
    content: [
      {
        kind: "text",
        classification:
          prompt.disclosureClass === "refusal-safe" ? "system_generated" : "approved_projection",
        text: prompt.text,
      },
    ],
    intent: { family: prompt.promptKind, supported: true },
    disclosure: {
      posture: prompt.disclosureClass === "refusal-safe" ? "refused" : "approved_projection",
      ...(prompt.disclosureClass === "refusal-safe" ? {} : { projection_ref: prompt.promptId }),
    },
    audit: { correlation_id: prompt.correlationId, source: "@spyglass/seeker-flows" },
  });
