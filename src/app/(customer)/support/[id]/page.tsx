import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { replyTicketAction } from "@/app/(customer)/support/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/guards";
import { getUserTicket } from "@/lib/support/service";

export const metadata: Metadata = {
  title: "Ticket",
  robots: { index: false, follow: false },
};

export default async function TicketDetailPage(
  props: PageProps<"/support/[id]">,
) {
  const session = await requireSession("/support");
  const { id } = await props.params;
  const ticket = await getUserTicket(session.user.id, id);
  if (!ticket) notFound();
  const closed = ticket.status === "CLOSED";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-ink-faint">
          <li>
            <Link href="/support" className="hover:text-ink">
              Tickets
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li aria-current="page" className="truncate text-ink-muted">
            {ticket.subject}
          </li>
        </ol>
      </nav>

      <Panel className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-ink">{ticket.subject}</h1>
          <Badge variant={ticket.status === "RESOLVED" ? "success" : "warning"}>
            {ticket.status.replace(/_/g, " ").toLowerCase()}
          </Badge>
        </div>

        <ul className="mt-6 space-y-3">
          {ticket.messages.map((message) => {
            const staff = message.authorRole !== "CUSTOMER";
            return (
              <li
                key={message.id}
                className={`rounded-md border p-3 ${
                  staff ? "border-accent/30 bg-accent/5" : "border-line bg-surface-2"
                }`}
              >
                <div className="flex items-center justify-between text-xs text-ink-faint">
                  <span className="font-semibold text-ink-muted">
                    {staff ? "Velour support" : "You"}
                  </span>
                  <span>
                    {message.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-ink">{message.body}</p>
              </li>
            );
          })}
        </ul>

        {closed ? (
          <p className="mt-6 rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink-muted">
            This ticket is closed.
          </p>
        ) : (
          <form action={replyTicketAction} className="mt-6 space-y-2">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <label htmlFor="body" className="block text-xs text-ink-faint">
              Reply
            </label>
            <textarea
              id="body"
              name="body"
              rows={3}
              required
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink"
            />
            <Button type="submit" variant="primary" size="sm">
              Send
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
