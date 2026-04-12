// app/layout.tsx
import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
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
        {/* Anti-flash: set theme before React hydrates to prevent flicker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('herphase-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches?'midnight':'rose';document.documentElement.setAttribute('data-theme',t||d);})();`,
          }}
        />
      </head>
      <body className={`${dmSans.variable} ${playfair.variable} font-body bg-background text-dark antialiased`}>
        <ThemeProvider>
          <AppProvider>
            <div className="pb-24">{children}</div>
            <BottomNavWrapper />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

// Client wrapper to conditionally show BottomNav
function BottomNavWrapper() {
  return <BottomNav />;
}
