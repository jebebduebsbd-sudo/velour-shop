"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSession } from "@/lib/auth/guards";
import { addTicketMessage, createTicket } from "@/lib/support/service";
import {
  createSavedSearch,
  deleteSavedSearch,
} from "@/lib/support/saved-searches";
import { assertSameOrigin } from "@/lib/request";

const createTicketSchema = z.object({
  subject: z.string().trim().min(3, "Add a subject").max(160),
  message: z.string().trim().min(5, "Describe your issue").max(4000),
});

export async function createTicketAction(formData: FormData): Promise<void> {
  const parsed = createTicketSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) redirect("/support?error=invalid");

  await assertSameOrigin();
  const session = await requireSession("/support");
  const { ticketId } = await createTicket({
    userId: session.user.id,
    subject: parsed.data.subject,
    message: parsed.data.message,
  });
  redirect(`/support/${ticketId}`);
}

const replySchema = z.object({
  ticketId: z.string().min(1).max(60),
  body: z.string().trim().min(1, "Write a message").max(4000),
});

export async function replyTicketAction(formData: FormData): Promise<void> {
  const parsed = replySchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    redirect(`/support/${String(formData.get("ticketId") ?? "")}?error=invalid`);
  }
  await assertSameOrigin();
  const session = await requireSession("/support");
  await addTicketMessage({
    ticketId: parsed.data.ticketId,
    authorId: session.user.id,
    authorRole: session.user.role,
    body: parsed.data.body,
  });
  redirect(`/support/${parsed.data.ticketId}`);
}

const savedSchema = z.object({
  label: z.string().trim().min(1).max(80),
  categorySlug: z.string().trim().max(40).optional(),
  query: z.string().trim().max(64).optional(),
});

export async function createSavedSearchAction(
  formData: FormData,
): Promise<void> {
  const parsed = savedSchema.safeParse({
    label: formData.get("label"),
    categorySlug: formData.get("categorySlug") || undefined,
    query: formData.get("query") || undefined,
  });
  if (!parsed.success) redirect("/saved?error=invalid");
  await assertSameOrigin();
  const session = await requireSession("/saved");
  await createSavedSearch({
    userId: session.user.id,
    label: parsed.data.label,
    categorySlug: parsed.data.categorySlug ?? null,
    query: parsed.data.query ?? null,
  });
  redirect("/saved");
}

export async function deleteSavedSearchAction(
  formData: FormData,
): Promise<void> {
  await assertSameOrigin();
  const session = await requireSession("/saved");
  const id = String(formData.get("id") ?? "");
  if (id) await deleteSavedSearch({ userId: session.user.id, id });
  redirect("/saved");
}
