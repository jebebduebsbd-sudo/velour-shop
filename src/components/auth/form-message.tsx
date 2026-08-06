import { CircleAlert, Info } from "lucide-react";

import type { AuthFormState } from "@/app/(public)/auth/actions";

/** Form-level status banner, announced to assistive technology. */
export function FormMessage({ state }: { state: AuthFormState }) {
  if (state.status === "idle" || !state.formMessage) return null;
  const isError = state.status === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm ${
        isError
          ? "border-danger/40 bg-danger/10 text-danger"
          : "border-accent/40 bg-accent/10 text-lilac"
      }`}
    >
      {isError ? (
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <p>{state.formMessage}</p>
    </div>
  );
}
