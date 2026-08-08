import { ImageResponse } from "next/og";

export const alt = "Velour — Premium digital goods. Instant access.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default OpenGraph image for the site (code-generated, no external assets). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #08060b 0%, #150e20 60%, #2a1442 100%)",
          color: "#ece7f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #8b2fd6, #e156f5)",
            }}
          />
          <div style={{ fontSize: "34px", fontWeight: 700, letterSpacing: "8px" }}>
            VELOUR
          </div>
        </div>
        <div
          style={{
            marginTop: "40px",
            fontSize: "76px",
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          Premium digital goods.
        </div>
        <div
          style={{
            fontSize: "76px",
            fontWeight: 700,
            fontStyle: "italic",
            color: "#c449f0",
          }}
        >
          Instant access.
        </div>
        <div style={{ marginTop: "36px", fontSize: "28px", color: "#a89dc2" }}>
          Lawful gift codes, keys & vouchers · wallet-only checkout · velour.shop
        </div>
      </div>
    ),
    size,
  );
}
