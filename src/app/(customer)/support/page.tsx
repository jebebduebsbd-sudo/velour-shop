import { LifeBuoy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { createTicketAction } from "@/app/(customer)/support/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/guards";
import { getUserTickets } from "@/lib/support/service";

export const metadata: Metadata = {
  title: "Support",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted"> = {
  RESOLVED: "success",
  CLOSED: "muted",
  OPEN: "warning",
  PENDING_SUPPORT: "warning",
  PENDING_CUSTOMER: "warning",
};

export default async function SupportPage() {
  const session = await requireSession("/support");
  const tickets = await getUserTickets(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Support
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Tickets</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Open a ticket for anything not tied to a specific order. For order
          problems, use the refund or dispute options on the order.
        </p>
      </div>

      <Panel className="p-6">
        <h2 className="text-sm font-semibold text-ink">New ticket</h2>
        <form action={createTicketAction} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="subject" className="block text-xs text-ink-faint">
              Subject
            </label>
            <input
              id="subject"
              name="subject"
              required
              className="h-9 w-full rounded-md border border-line bg-surface-2 px-2 text-sm text-ink"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="message" className="block text-xs text-ink-faint">
              How can we help?
            </label>
            <textarea
              id="message"
              name="message"
              rows={3}
              required
              className="w-full rounded-md border border-line bg-surface-2 px-2 py-1.5 text-sm text-ink"
            />
          </div>
          <Button type="submit" variant="primary" size="sm">
            Create ticket
          </Button>
        </form>
      </Panel>

      <Panel className="overflow-hidden">
        {tickets.length === 0 ? (
          <p className="flex flex-col items-center gap-2 p-10 text-center text-sm text-ink-muted">
            <LifeBuoy className="h-8 w-8 text-ink-faint" aria-hidden="true" />
            No tickets yet.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/support/${ticket.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors duration-(--duration-base) hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {ticket.subject}
                  </span>
                  <Badge variant={STATUS_VARIANT[ticket.status] ?? "muted"}>
                    {ticket.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
