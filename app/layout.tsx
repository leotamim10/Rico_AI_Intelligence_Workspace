import type { Metadata } from "next";
import { Geist, Inter, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Display family for section headlines only (weights match the type
// scale's heading tiers: h2 = 500, display/h1 = 600). Body stays Inter.
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// "Claude" display serif — the Slate & Rust system sets ultra-bold
// headings in this (a freely-available stand-in for Copernicus). Loaded
// as a variable font so weights up to 900 are available.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Xai — Intelligence Workspace",
  description:
    "Raw data to structured intelligence to actionable insight. Xai turns signal into decisions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
