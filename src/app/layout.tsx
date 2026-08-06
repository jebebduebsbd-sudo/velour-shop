import type { Metadata } from "next";
import { Geist } from "next/font/google";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://velour.shop"),
  title: {
    default: "Velour — Premium digital goods. Instant access.",
    template: "%s — Velour",
  },
  description:
    "Velour is a premium marketplace for lawful, transferable digital goods: gift codes, wallet codes, vouchers, and official keys with documented inventory and wallet-only checkout.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-dvh bg-background font-sans text-ink">
        {children}
      </body>
    </html>
  );
}
