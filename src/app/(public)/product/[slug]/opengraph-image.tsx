import { ImageResponse } from "next/og";

import { getProductBySlug } from "@/lib/catalog";
import { formatMinor } from "@/lib/format";

export const alt = "Velour product";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Per-product OpenGraph image, generated from real catalog data. */
export default async function ProductOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);

  const title = product?.title ?? "Velour";
  const category = product?.categoryName ?? "Digital goods";
  const price = product ? formatMinor(product.priceMinor, product.currency) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "linear-gradient(135deg, #08060b 0%, #150e20 60%, #2a1442 100%)",
          color: "#ece7f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #8b2fd6, #e156f5)",
            }}
          />
          <div style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "7px" }}>
            VELOUR
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: "24px",
              letterSpacing: "4px",
              textTransform: "uppercase",
              color: "#b78cf7",
            }}
          >
            {category}
          </div>
          <div
            style={{
              marginTop: "16px",
              fontSize: "62px",
              fontWeight: 700,
              lineHeight: 1.08,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {price ? (
            <div style={{ fontSize: "44px", fontWeight: 700 }}>{price}</div>
          ) : (
            <div />
          )}
          <div style={{ fontSize: "24px", color: "#a89dc2" }}>velour.shop</div>
        </div>
      </div>
    ),
    size,
  );
}
