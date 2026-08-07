"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Read-only referral link with a copy button. */
export function ReferralLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable; the field is selectable on screen.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="referral-link" className="sr-only">
        Your referral link
      </label>
      <input
        id="referral-link"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        className="h-10 flex-1 rounded-md border border-line bg-background px-3 font-mono text-sm text-ink"
      />
      <Button type="button" variant="secondary" onClick={copy}>
        {copied ? (
          <Check className="h-4 w-4 text-success" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
