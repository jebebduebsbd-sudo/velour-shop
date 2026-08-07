"use server";

import { z } from "zod";

import { requireSession } from "@/lib/auth/guards";
import { verifyPassword } from "@/lib/auth/password";
import { revealDeliverable } from "@/lib/orders/orders";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, clientIpHash } from "@/lib/request";

export type RevealState =
  | { status: "idle" }
  | { status: "revealed"; value: string }
  | { status: "error"; message: string };

const revealSchema = z.object({
  orderId: z.string().min(1).max(60),
  password: z.string().min(1, "Enter your password"),
});

/**
 * Step-up reveal: the buyer re-enters their password to unmask the deliverable.
 * The decrypted value is returned to this authenticated owner only and is never
 * logged or persisted. Ownership + fulfilled-state are enforced server-side.
 */
export async function revealDeliverableAction(
  _prev: RevealState,
  formData: FormData,
): Promise<RevealState> {
  const parsed = revealSchema.safeParse({
    orderId: formData.get("orderId"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid request.",
    };
  }

  try {
    await assertSameOrigin();
    const session = await requireSession("/orders");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
    const reauthFresh =
      !!user && (await verifyPassword(user.passwordHash, parsed.data.password));
    if (!reauthFresh) {
      return { status: "error", message: "That password is not correct." };
    }

    const result = await revealDeliverable({
      userId: session.user.id,
      orderId: parsed.data.orderId,
      reauthFresh,
      ipHash: await clientIpHash(),
    });

    if (!result.ok) {
      const message =
        result.reason === "not_fulfilled"
          ? "This order is not fulfilled yet."
          : "That deliverable is not available.";
      return { status: "error", message };
    }
    return { status: "revealed", value: result.value };
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
