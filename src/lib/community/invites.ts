import { serverEnv } from "@/lib/env";

export type CommunityInviteId = "discord" | "telegram";

export type CommunityInvite = {
  id: CommunityInviteId;
  label: string;
  url: string;
};

/**
 * Invite links are server configuration, never hardcoded: an unpublished space
 * is omitted so the page can say so honestly instead of pointing somewhere
 * unverified. Only https links are accepted, because the page tells readers to
 * distrust any invite that does not come from here.
 */
export function communityInvites(): CommunityInvite[] {
  const env = serverEnv();
  const candidates: { id: CommunityInviteId; label: string; url?: string }[] = [
    { id: "discord", label: "Discord", url: env.COMMUNITY_DISCORD_URL },
    { id: "telegram", label: "Telegram", url: env.COMMUNITY_TELEGRAM_URL },
  ];
  return candidates.flatMap(({ id, label, url }) =>
    url && url.startsWith("https://") ? [{ id, label, url }] : [],
  );
}
