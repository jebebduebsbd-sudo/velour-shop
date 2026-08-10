"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";

import {
  createProductAction,
  updateProductAction,
  type ProductFormState,
} from "@/app/(admin)/actions";
import { Button, buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";

const initialState: ProductFormState = { status: "idle" };

const controlClasses =
  "w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors duration-(--duration-base) hover:border-line-strong focus:border-accent focus:outline-none aria-invalid:border-danger";

export type ProductFormDefaults = {
  title: string;
  subtitle: string;
  categoryId: string;
  price: string;
  description: string;
  deliverable: string;
  warranty: string;
  region: string;
  delivery: "INSTANT_CODE" | "MANUAL";
  status: "DRAFT" | "COMPLIANCE_REVIEW" | "ACTIVE" | "ARCHIVED";
  supplierId: string;
  featured: boolean;
};

export const STANDARD_WARRANTY =
  "If a code is invalid at the moment of delivery, report it within 48 hours of reveal for a replacement or wallet refund after review.";

export const EMPTY_PRODUCT: ProductFormDefaults = {
  title: "",
  subtitle: "",
  categoryId: "",
  price: "",
  description: "",
  deliverable: "",
  warranty: STANDARD_WARRANTY,
  region: "Global",
  delivery: "INSTANT_CODE",
  status: "DRAFT",
  supplierId: "",
  featured: false,
};

type ProductFormProps = {
  mode: "create" | "edit";
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string; evidenceVerified: boolean }[];
  productId?: string;
  defaults?: ProductFormDefaults;
};

function LabeledControl({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ink-faint">{hint}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ProductForm({
  mode,
  categories,
  suppliers,
  productId,
  defaults = EMPTY_PRODUCT,
}: ProductFormProps) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createProductAction : updateProductAction,
    initialState,
  );
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && productId ? (
        <input type="hidden" name="productId" value={productId} />
      ) : null}

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}
      {state.status === "ok" && state.message ? (
        <p
          role="status"
          className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <LabeledControl label="Title" htmlFor="title" error={fieldErrors.title}>
          <input
            id="title"
            name="title"
            defaultValue={defaults.title}
            required
            maxLength={120}
            aria-invalid={fieldErrors.title ? true : undefined}
            className={inputClasses}
            placeholder="Steam Wallet Code — €20"
          />
        </LabeledControl>

        <LabeledControl
          label="Subtitle (optional)"
          htmlFor="subtitle"
          error={fieldErrors.subtitle}
        >
          <input
            id="subtitle"
            name="subtitle"
            defaultValue={defaults.subtitle}
            maxLength={120}
            className={inputClasses}
            placeholder="Redeem on your own account"
          />
        </LabeledControl>

        <LabeledControl
          label="Category"
          htmlFor="categoryId"
          error={fieldErrors.categoryId}
        >
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={defaults.categoryId}
            required
            aria-invalid={fieldErrors.categoryId ? true : undefined}
            className={controlClasses}
          >
            <option value="" disabled>
              Choose a category…
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </LabeledControl>

        <LabeledControl
          label="Price (EUR)"
          htmlFor="price"
          error={fieldErrors.price}
          hint="Whole euros or two decimals, e.g. 8.49"
        >
          <input
            id="price"
            name="price"
            defaultValue={defaults.price}
            inputMode="decimal"
            required
            aria-invalid={fieldErrors.price ? true : undefined}
            className={inputClasses}
            placeholder="9.99"
          />
        </LabeledControl>
      </div>

      <LabeledControl
        label="Description"
        htmlFor="description"
        error={fieldErrors.description}
        hint="Shown on the product page. Do not claim anything the deliverable does not include."
      >
        <textarea
          id="description"
          name="description"
          defaultValue={defaults.description}
          rows={4}
          required
          maxLength={2000}
          aria-invalid={fieldErrors.description ? true : undefined}
          className={controlClasses}
        />
      </LabeledControl>

      <LabeledControl
        label="Deliverable"
        htmlFor="deliverable"
        error={fieldErrors.deliverable}
        hint="Exact statement of what the buyer receives, shown verbatim before purchase."
      >
        <textarea
          id="deliverable"
          name="deliverable"
          defaultValue={defaults.deliverable}
          rows={2}
          required
          maxLength={500}
          aria-invalid={fieldErrors.deliverable ? true : undefined}
          className={controlClasses}
        />
      </LabeledControl>

      <LabeledControl
        label="Warranty"
        htmlFor="warranty"
        error={fieldErrors.warranty}
      >
        <textarea
          id="warranty"
          name="warranty"
          defaultValue={defaults.warranty}
          rows={2}
          required
          maxLength={500}
          aria-invalid={fieldErrors.warranty ? true : undefined}
          className={controlClasses}
        />
      </LabeledControl>

      <div className="grid gap-5 sm:grid-cols-2">
        <LabeledControl label="Region" htmlFor="region" error={fieldErrors.region}>
          <input
            id="region"
            name="region"
            defaultValue={defaults.region}
            maxLength={60}
            className={inputClasses}
            placeholder="Global"
          />
        </LabeledControl>

        <LabeledControl
          label="Delivery"
          htmlFor="delivery"
          error={fieldErrors.delivery}
          hint="Instant if fulfilled from stocked codes; manual otherwise."
        >
          <select
            id="delivery"
            name="delivery"
            defaultValue={defaults.delivery}
            className={controlClasses}
          >
            <option value="INSTANT_CODE">Instant code</option>
            <option value="MANUAL">Manual</option>
          </select>
        </LabeledControl>

        <LabeledControl
          label="Supplier"
          htmlFor="supplierId"
          error={fieldErrors.supplierId}
          hint="Required (and evidence-verified) to publish as active."
        >
          <select
            id="supplierId"
            name="supplierId"
            defaultValue={defaults.supplierId}
            className={controlClasses}
          >
            <option value="">None</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
                {supplier.evidenceVerified ? " ✓" : " (unverified)"}
              </option>
            ))}
          </select>
        </LabeledControl>

        <LabeledControl
          label="Status"
          htmlFor="status"
          error={fieldErrors.status}
          hint="Only Active is shown on the storefront."
        >
          <select
            id="status"
            name="status"
            defaultValue={defaults.status}
            aria-invalid={fieldErrors.status ? true : undefined}
            className={controlClasses}
          >
            <option value="DRAFT">Draft</option>
            <option value="COMPLIANCE_REVIEW">Compliance review</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </LabeledControl>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={defaults.featured}
          className="h-4 w-4 rounded border-line bg-surface-2 accent-accent"
        />
        Feature on the homepage
      </label>

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create product"
              : "Save changes"}
        </Button>
        <Link
          href="/admin/products"
          className={buttonClasses("ghost", "md")}
        >
          {mode === "create" ? "Cancel" : "Back to products"}
        </Link>
      </div>
    </form>
  );
}
