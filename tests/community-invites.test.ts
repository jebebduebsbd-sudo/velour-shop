import { describe, expect, it, vi } from "vitest";

import type { CommunityInvite } from "@/lib/community/invites";

/**
 * Reloads the env and invite modules under a patched process.env, so each case
 * sees a freshly validated environment instead of the cached one.
 */
async function invitesWith(
  env: Record<string, string | undefined>,
): Promise<{ invites?: CommunityInvite[]; error?: Error }> {
  vi.resetModules();
  const original = { ...process.env };
  Object.assign(process.env, env);
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
  }
  try {
    const { communityInvites } = await import("@/lib/community/invites");
    return { invites: communityInvites() };
  } catch (error) {
    return { error: error as Error };
  } finally {
    process.env = original;
  }
}

describe("community invite configuration", () => {
  it("publishes nothing when no space is configured", async () => {
    const { invites, error } = await invitesWith({
      COMMUNITY_DISCORD_URL: undefined,
      COMMUNITY_TELEGRAM_URL: undefined,
    });
    expect(error).toBeUndefined();
    expect(invites).toEqual([]);
  });

  it("treats an empty variable as unpublished rather than invalid", async () => {
    const { invites, error } = await invitesWith({
      COMMUNITY_DISCORD_URL: "",
      COMMUNITY_TELEGRAM_URL: "",
    });
    expect(error).toBeUndefined();
    expect(invites).toEqual([]);
  });

  it("publishes each configured https space", async () => {
    const { invites } = await invitesWith({
      COMMUNITY_DISCORD_URL: "https://discord.gg/velour-example",
      COMMUNITY_TELEGRAM_URL: "https://t.me/velour_example",
    });
    expect(invites?.map((invite) => invite.id)).toEqual([
      "discord",
      "telegram",
    ]);
    expect(invites?.[0]?.url).toBe("https://discord.gg/velour-example");
  });

  it("drops a plaintext invite link", async () => {
    const { invites } = await invitesWith({
      COMMUNITY_DISCORD_URL: "http://discord.gg/velour-example",
      COMMUNITY_TELEGRAM_URL: undefined,
    });
    expect(invites).toEqual([]);
  });

  it("refuses to start with a malformed invite link", async () => {
    const { error } = await invitesWith({
      COMMUNITY_DISCORD_URL: "discord.gg/velour-example",
    });
    expect(error?.message).toMatch(/COMMUNITY_DISCORD_URL/);
  });
});
