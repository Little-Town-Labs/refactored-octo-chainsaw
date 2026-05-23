import type { BoundedTelegramUpdate, TelegramChannelLink, TelegramLinkLookup } from "./types.js";

export const unknownTelegramLink = (): TelegramChannelLink => ({ status: "unknown" });

export const createStaticTelegramLinkLookup = (
  links: readonly TelegramChannelLink[],
): TelegramLinkLookup => ({
  findLink(update: BoundedTelegramUpdate): TelegramChannelLink {
    return (
      links.find(
        (link) =>
          (link.telegram_account_id && link.telegram_account_id === update.sender_ref) ||
          (link.telegram_chat_id && link.telegram_chat_id === update.chat_ref),
      ) ?? unknownTelegramLink()
    );
  },
});

export const isVerifiedTelegramLink = (link: TelegramChannelLink): boolean =>
  link.status === "verified" && Boolean(link.participant_id && link.principal_id);

export const isPendingTelegramLink = (link: TelegramChannelLink): boolean =>
  link.status === "pending_verification" && Boolean(link.pending_challenge_id);
