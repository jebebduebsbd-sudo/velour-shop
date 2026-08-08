import type { Metadata } from "next";

import { Panel } from "@/components/ui/panel";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin — audit log",
  robots: { index: false },
};

export default async function AdminAuditPage() {
  const events = await prisma.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      action: true,
      userId: true,
      targetType: true,
      targetId: true,
      metadata: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Audit log</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Append-only record of security- and money-relevant actions. Secrets
          and deliverable values are never stored here.
        </p>
      </div>

      <Panel className="overflow-hidden">
        <ul className="divide-y divide-line">
          {events.map((event) => (
            <li key={event.id} className="flex items-start gap-4 px-5 py-3 text-sm">
              <span className="w-40 shrink-0 font-mono text-xs text-ink-faint">
                {event.createdAt.toISOString().slice(0, 19).replace("T", " ")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-medium text-ink">{event.action}</span>
                {event.targetType ? (
                  <span className="text-ink-faint">
                    {" "}
                    · {event.targetType}
                    {event.targetId ? `#${event.targetId.slice(0, 8)}` : ""}
                  </span>
                ) : null}
                {event.metadata ? (
                  <span className="block truncate font-mono text-xs text-ink-faint">
                    {JSON.stringify(event.metadata)}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
