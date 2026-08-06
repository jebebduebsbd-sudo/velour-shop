"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Field } from "@/components/ui/field";

/** Password field with an accessible visibility toggle. */
export function PasswordInput({
  label,
  name,
  error,
  hint,
  autoComplete,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      label={label}
      name={name}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      required
      error={error}
      hint={hint}
      className="w-full"
      style={{ paddingRight: "2.75rem" }}
    >
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-ink-faint transition-colors hover:text-ink"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </Field>
  );
}
