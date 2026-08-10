import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/audit";
import {
  encryptDeliverable,
  fingerprintDeliverable,
} from "@/lib/crypto/deliverable";
import { serverEnv } from "@/lib/env";
import { checkDeliverablePayload } from "@/lib/inventory/payload-policy";
import { prisma } from "@/lib/prisma";
import { checkListingEligibility } from "@/lib/suppliers/eligibility";
import type { FeedListing, SupplierFeedProvider } from "@/lib/suppliers/feed";
import { defaultFeedProvider } from "@/lib/suppliers/registry";

/**
 * Supplier catalogue sync.
 *
 * Pulls a supplier's listings through a feed adapter and mirrors the eligible
 * ones into the catalogue. Three properties matter more than throughput:
 *
 *   - Nothing self-publishes. Synced products land in COMPLIANCE_REVIEW and
 *     stay invisible to the storefront until an admin activates them, which
 *     `setProductStatus` still refuses unless the supplier's transfer-right
 *     evidence is verified.
 *   - Nothing credential-shaped survives. Listings pass the eligibility
 *     filter, and every code passes the inventory payload policy, before a row
 *     is written.
 *   - Repeat syncs are idempotent, keyed on (supplierId, externalId), so a
 *     nightly pull updates prices instead of duplicating the catalogue.
 *
 * Codes are encrypted with the same AES-256-GCM path as manual imports and are
 * never logged, audited, or returned to the caller.
 */
export type SyncRejection = { ref: string; reason: string };

export type SyncSummary = {
  fetched: number;
  created: number;
  updated: number;
  unitsImported: number;
  unitsSkipped: number;
  rejected: SyncRejection[];
  /** False when synced products cannot be activated yet. */
  supplierVerified: boolean;
};

export type SyncResult =
  | { ok: true; summary: SyncSummary }
  | { ok: false; reason: string };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** A product slug that is free, or already belongs to this product. */
async function availableSlug(
  base: string,
  productId: string | null,
): Promise<string> {
  const candidate = base.length > 0 ? base : "supplier-listing";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const slug = attempt === 0 ? candidate : `${candidate}-${attempt + 1}`;
    const existing = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === productId) return slug;
  }
  return `${candidate}-${Date.now()}`;
}

/**
 * Resolves the Velour category for a listing: the feed's own slug when it
 * matches one of ours, otherwise the configured fallback. Returns null when
 * neither resolves, so the listing is rejected rather than mis-filed.
 */
async function resolveCategoryId(listing: FeedListing): Promise<string | null> {
  const candidates = [
    listing.category,
    process.env.SUPPLIER_FEED_DEFAULT_CATEGORY?.trim().toLowerCase(),
  ].filter((slug): slug is string => !!slug && slug.length > 0);

  for (const slug of candidates) {
    const category = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (category) return category.id;
  }
  return null;
}

export async function syncSupplierFeed(input: {
  supplierId: string;
  actorId: string;
  /** Injectable for tests; defaults to the configured HTTPS adapter. */
  provider?: SupplierFeedProvider;
}): Promise<SyncResult> {
  const provider = input.provider ?? defaultFeedProvider();
  if (!provider.isEnabled()) {
    return { ok: false, reason: provider.disabledReason() };
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: input.supplierId },
    select: { id: true, evidenceVerified: true },
  });
  if (!supplier) return { ok: false, reason: "supplier not found" };

  const feed = await provider.fetchListings();
  if (!feed.ok) return { ok: false, reason: feed.reason };

  const masterKey = serverEnv().DELIVERY_MASTER_KEY_B64;
  const summary: SyncSummary = {
    fetched: feed.listings.length,
    created: 0,
    updated: 0,
    unitsImported: 0,
    unitsSkipped: 0,
    rejected: [...feed.malformed],
    supplierVerified: supplier.evidenceVerified,
  };

  for (const listing of feed.listings) {
    const eligibility = checkListingEligibility(listing);
    if (!eligibility.ok) {
      summary.rejected.push({
        ref: listing.externalId,
        reason: eligibility.reason,
      });
      continue;
    }

    const categoryId = await resolveCategoryId(listing);
    if (!categoryId) {
      summary.rejected.push({
        ref: listing.externalId,
        reason: `no Velour category matches "${
          listing.category ?? "(none supplied)"
        }" — set SUPPLIER_FEED_DEFAULT_CATEGORY or map the feed's categories`,
      });
      continue;
    }

    const existing = await prisma.product.findUnique({
      where: {
        supplierId_externalId: {
          supplierId: supplier.id,
          externalId: listing.externalId,
        },
      },
      select: { id: true },
    });

    const codes = listing.codes ?? [];
    const shared = {
      title: listing.title,
      description: listing.description ?? listing.title,
      deliverable: listing.deliverable ?? `One ${listing.title}.`,
      warranty:
        listing.warranty ??
        "No supplier warranty stated; Velour Buyer Protection applies.",
      region: listing.region ?? "Global",
      priceMinor: listing.priceMinor,
      currency: "EUR",
      categoryId,
    };

    let productId: string;
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        // Status and slug are deliberately untouched: publishing stays an
        // admin decision, and a live product keeps its URL. Delivery is only
        // promoted to instant — never demoted, since earlier stock may remain.
        data: codes.length > 0 ? { ...shared, delivery: "INSTANT_CODE" } : shared,
      });
      productId = existing.id;
      summary.updated += 1;
    } else {
      const created = await prisma.product.create({
        data: {
          ...shared,
          slug: await availableSlug(slugify(listing.title), null),
          supplierId: supplier.id,
          externalId: listing.externalId,
          status: "COMPLIANCE_REVIEW",
          delivery: codes.length > 0 ? "INSTANT_CODE" : "MANUAL",
        },
        select: { id: true },
      });
      productId = created.id;
      summary.created += 1;
    }

    if (codes.length === 0) continue;
    if (!masterKey) {
      summary.unitsSkipped += codes.length;
      summary.rejected.push({
        ref: listing.externalId,
        reason: "codes skipped: DELIVERY_MASTER_KEY_B64 is not configured",
      });
      continue;
    }

    for (const code of codes) {
      // Re-checked per code: eligibility already vetted the listing, but the
      // policy gate is the last thing between a feed and encrypted storage.
      if (!checkDeliverablePayload(code).ok) {
        summary.unitsSkipped += 1;
        continue;
      }
      try {
        await prisma.inventoryUnit.create({
          data: {
            productId,
            status: "AVAILABLE",
            payloadCiphertext: new Uint8Array(
              encryptDeliverable(code, masterKey),
            ),
            payloadFingerprint: fingerprintDeliverable(code, masterKey),
          },
        });
        summary.unitsImported += 1;
      } catch {
        // Already stocked (unique fingerprint) or a write error. Either way the
        // value never appears in a log line.
        summary.unitsSkipped += 1;
      }
    }
  }

  await recordAuditEvent({
    action: AUDIT_ACTIONS.supplierFeedSync,
    userId: input.actorId,
    targetType: "Supplier",
    targetId: supplier.id,
    metadata: {
      provider: provider.id,
      fetched: summary.fetched,
      created: summary.created,
      updated: summary.updated,
      unitsImported: summary.unitsImported,
      unitsSkipped: summary.unitsSkipped,
      rejected: summary.rejected.length,
    },
  });

  return { ok: true, summary };
}
