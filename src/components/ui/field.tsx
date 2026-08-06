import type { InputHTMLAttributes, ReactNode } from "react";

export const inputClasses =
  "h-10 w-full rounded-md border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-ink-faint transition-colors duration-(--duration-base) hover:border-line-strong focus:border-accent focus:outline-none aria-invalid:border-danger";

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

/**
 * Labeled input with an error message programmatically linked to the input
 * via aria-describedby. `children` renders inside the input wrapper (e.g. a
 * password visibility toggle).
 */
export function Field({
  label,
  name,
  error,
  hint,
  children,
  className = "",
  ...inputProps
}: FieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [errorId, hintId].filter(Boolean).join(" ") || undefined
          }
          className={inputClasses}
          {...inputProps}
        />
        {children}
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
