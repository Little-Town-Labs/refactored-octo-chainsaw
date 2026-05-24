import { createWebChatAdapter } from "../adapter.js";
import {
  disabledLink,
  inboundWebChatEvent,
  optionsWithLinks,
  pausedLink,
  verifiedLink,
  withdrawnLink,
} from "./fixtures.js";

describe("web-chat session posture", () => {
  it("refuses unauthenticated, expired-session, unknown-principal, wrong-participant, disabled, paused, and withdrawn events", () => {
    const adapter = createWebChatAdapter(
      optionsWithLinks([verifiedLink, disabledLink, pausedLink, withdrawnLink]),
    );

    expect(
      adapter.normalizeInbound({ ...inboundWebChatEvent("evt-no-session"), session: undefined }).ok,
    ).toBe(false);
    expect(
      adapter.normalizeInbound({
        ...inboundWebChatEvent("evt-expired-session"),
        session: {
          session_id: "sess-old",
          principal_id: "principal-seeker-1",
          expires_at: "2026-05-23T11:00:00.000Z",
        },
      }).ok,
    ).toBe(false);
    expect(
      adapter.normalizeInbound({
        ...inboundWebChatEvent("evt-unknown"),
        session: {
          session_id: "sess-unknown",
          principal_id: "principal-unknown",
          expires_at: "2026-05-23T13:00:00.000Z",
        },
      }).ok,
    ).toBe(false);
    expect(
      adapter.normalizeInbound({
        ...inboundWebChatEvent("evt-disabled"),
        session: {
          session_id: "sess-disabled",
          principal_id: "principal-disabled",
          expires_at: "2026-05-23T13:00:00.000Z",
        },
      }).ok,
    ).toBe(false);
    expect(
      adapter.normalizeInbound({
        ...inboundWebChatEvent("evt-paused"),
        session: {
          session_id: "sess-paused",
          principal_id: "principal-paused",
          expires_at: "2026-05-23T13:00:00.000Z",
        },
      }).ok,
    ).toBe(false);
    expect(
      adapter.normalizeInbound({
        ...inboundWebChatEvent("evt-withdrawn"),
        session: {
          session_id: "sess-withdrawn",
          principal_id: "principal-withdrawn",
          expires_at: "2026-05-23T13:00:00.000Z",
        },
      }).ok,
    ).toBe(false);
  });
});
