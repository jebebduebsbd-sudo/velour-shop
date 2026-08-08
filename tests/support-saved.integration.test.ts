import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { cleanupTestUsers, testDb } from "./db";

/**
 * Support tickets and saved searches: ownership, messaging access control,
 * and owner-scoped deletion.
 */
const PREFIX = "vtest-support-";

let support: typeof import("@/lib/support/service");
let saved: typeof import("@/lib/support/saved-searches");

async function makeUser(suffix: string) {
  const user = await testDb.user.create({
    data: {
      email: `${PREFIX}${Date.now()}-${suffix}-${Math.random().toString(36).slice(2, 7)}@velour.test`,
      username: `${PREFIX}${suffix}-${Math.random().toString(36).slice(2, 9)}`,
      passwordHash: "scrypt$1$1$1$AA==$AA==",
    },
    select: { id: true },
  });
  return user.id;
}

beforeAll(async () => {
  support = await import("@/lib/support/service");
  saved = await import("@/lib/support/saved-searches");
});

afterAll(async () => {
  await cleanupTestUsers(PREFIX);
  await testDb.$disconnect();
});

describe("support tickets", () => {
  it("creates a ticket with the first message and lists it for the owner", async () => {
    const userId = await makeUser("t");
    const { ticketId } = await support.createTicket({
      userId,
      subject: "Question about top-ups",
      message: "How long do card top-ups take?",
    });
    const list = await support.getUserTickets(userId);
    expect(list.map((t) => t.id)).toContain(ticketId);

    const detail = await support.getUserTicket(userId, ticketId);
    expect(detail!.messages.length).toBe(1);
  });

  it("does not expose or accept messages on another user's ticket", async () => {
    const owner = await makeUser("owner");
    const stranger = await makeUser("stranger");
    const { ticketId } = await support.createTicket({
      userId: owner,
      subject: "Private",
      message: "hello",
    });

    expect(await support.getUserTicket(stranger, ticketId)).toBeNull();
    const attempt = await support.addTicketMessage({
      ticketId,
      authorId: stranger,
      authorRole: "CUSTOMER",
      body: "let me in",
    });
    expect(attempt.ok).toBe(false);

    // Staff can reply to any ticket.
    const staffId = await makeUser("staff");
    const staffReply = await support.addTicketMessage({
      ticketId,
      authorId: staffId,
      authorRole: "SUPPORT",
      body: "how can we help?",
    });
    expect(staffReply.ok).toBe(true);
  });
});

describe("saved searches", () => {
  it("creates, lists with a valid href, and deletes only the owner's rows", async () => {
    const owner = await makeUser("s");
    const other = await makeUser("s2");

    await saved.createSavedSearch({
      userId: owner,
      label: "Steam deals",
      categorySlug: "steam",
      query: "wallet",
    });
    const list = await saved.getUserSavedSearches(owner);
    expect(list.length).toBe(1);
    expect(list[0]!.href).toBe("/market/steam?q=wallet");

    // Another user cannot delete it.
    await saved.deleteSavedSearch({ userId: other, id: list[0]!.id });
    expect((await saved.getUserSavedSearches(owner)).length).toBe(1);

    // Owner can.
    await saved.deleteSavedSearch({ userId: owner, id: list[0]!.id });
    expect((await saved.getUserSavedSearches(owner)).length).toBe(0);
  });

  it("ignores an invalid category slug", async () => {
    const userId = await makeUser("s3");
    await saved.createSavedSearch({
      userId,
      label: "Bad category",
      categorySlug: "not-a-real-category",
    });
    const list = await saved.getUserSavedSearches(userId);
    expect(list[0]!.categorySlug).toBeNull();
    expect(list[0]!.href).toBe("/market");
  });
});
