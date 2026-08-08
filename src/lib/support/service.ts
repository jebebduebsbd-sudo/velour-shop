import type { Role } from "@/generated/prisma/enums";
import { hasRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

/** Support tickets: general help threads owned by a customer. */
export async function createTicket(input: {
  userId: string;
  subject: string;
  message: string;
}): Promise<{ ticketId: string }> {
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: input.userId,
      subject: input.subject.trim().slice(0, 160),
      status: "OPEN",
      messages: {
        create: {
          authorId: input.userId,
          authorRole: "CUSTOMER",
          body: input.message.trim().slice(0, 4000),
        },
      },
    },
    select: { id: true },
  });
  return { ticketId: ticket.id };
}

export async function addTicketMessage(input: {
  ticketId: string;
  authorId: string;
  authorRole: Role;
  body: string;
}): Promise<{ ok: boolean }> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: input.ticketId },
    select: { userId: true, status: true },
  });
  if (!ticket) return { ok: false };
  const isStaff = hasRole(input.authorRole, "SUPPORT");
  if (!isStaff && ticket.userId !== input.authorId) return { ok: false };
  if (ticket.status === "CLOSED") return { ok: false };

  await prisma.supportTicket.update({
    where: { id: input.ticketId },
    data: {
      status: isStaff ? "PENDING_CUSTOMER" : "PENDING_SUPPORT",
      messages: {
        create: {
          authorId: input.authorId,
          authorRole: input.authorRole,
          body: input.body.trim().slice(0, 4000),
        },
      },
    },
  });
  return { ok: true };
}

export async function getUserTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, subject: true, status: true, updatedAt: true },
  });
}

/** Loads a ticket for a specific user (ownership enforced — no IDOR). */
export async function getUserTicket(userId: string, ticketId: string) {
  return prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
    select: {
      id: true,
      subject: true,
      status: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, authorRole: true, body: true, createdAt: true },
      },
    },
  });
}
