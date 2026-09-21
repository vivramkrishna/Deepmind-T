import type { Metadata, Viewport } from "next";
import "@livekit/components-styles";
import "katex/dist/katex.min.css";
import "./globals.css";
import PwaRegister from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Mana Mart Voice Shopping",
  description: "తెలుగు, हिंदी, Englishలో మాట్లాడే neighbourhood shop assistant",
  applicationName: "Mana Mart",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Mana Mart" },
};

export const viewport: Viewport = {
  themeColor: "#07131a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="te">
      <body><PwaRegister />{children}</body>
    </html>
  );
}
