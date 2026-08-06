import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Panel className="mx-auto max-w-lg p-10 text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink">
          That page doesn&apos;t exist
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          The listing may have been removed, or the link is wrong. The market
          is still open.
        </p>
        <Link
          href="/market"
          className={buttonClasses("primary", "md", "mt-6")}
        >
          Browse market
        </Link>
      </Panel>
    </div>
  );
}
