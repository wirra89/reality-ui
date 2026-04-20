// app/layout.tsx
import type { Metadata } from "next";
import { Nunito, Space_Mono } from "next/font/google";
import { AppProvider } from "@/context/AppContext";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "HerPhase — Cycle-Aware Fitness",
  description: "Train smarter with your cycle.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HerPhase",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.setAttribute('data-theme','rose');` }} />
      </head>
      <body className={`${nunito.variable} ${spaceMono.variable} font-body bg-background text-dark antialiased`}>
        <AppProvider>
          <div className="pb-28">{children}</div>
          <BottomNavWrapper />
        </AppProvider>
      </body>
    </html>
  );
}

// Client wrapper to conditionally show BottomNav
function BottomNavWrapper() {
  return <BottomNav />;
}
