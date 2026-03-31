"use client";

// components/BottomNav.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

const tabs = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "#C48A97" : "none"} stroke={active ? "#C48A97" : "#9CA3AF"} strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/training",
    label: "Training",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <rect x="2" y="10" width="3" height="4" rx="1" fill={active ? "#C48A97" : "#9CA3AF"}/>
        <rect x="5" y="8" width="2" height="8" rx="1" fill={active ? "#C48A97" : "#9CA3AF"}/>
        <line x1="7" y1="12" x2="17" y2="12" stroke={active ? "#C48A97" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round"/>
        <rect x="17" y="8" width="2" height="8" rx="1" fill={active ? "#C48A97" : "#9CA3AF"}/>
        <rect x="19" y="10" width="3" height="4" rx="1" fill={active ? "#C48A97" : "#9CA3AF"}/>
      </svg>
    ),
  },
  {
    href: "/meals",
    label: "Meals",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? "#C48A97" : "#9CA3AF"} strokeWidth="1.8" className="w-5 h-5">
        <path d="M4 8.5C4 7 7.582 5.5 12 5.5S20 7 20 8.5H4z" fill={active ? "#C48A97" : "#9CA3AF"} stroke="none"/>
        <rect x="3" y="10" width="18" height="2.5" rx="1.2" fill="none" stroke={active ? "#C48A97" : "#9CA3AF"} strokeWidth="1.8"/>
        <path strokeLinecap="round" d="M5 15.5h14" strokeWidth="1.8" stroke={active ? "#C48A97" : "#9CA3AF"}/>
        <path d="M6 18.5C6 18.5 8 17.5 12 17.5s6 1 6 1v1.5H6v-1.5z" fill={active ? "#C48A97" : "#9CA3AF"} stroke="none"/>
      </svg>
    ),
  },
  {
    href: "/mood",
    label: "Mood",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? "#C48A97" : "#9CA3AF"} strokeWidth="1.8" className="w-5 h-5">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M8.5 14s1.5 2 3.5 2 3.5-2 3.5-2" />
        <circle cx="9" cy="10" r="0.8" fill={active ? "#C48A97" : "#9CA3AF"} stroke="none"/>
        <circle cx="15" cy="10" r="0.8" fill={active ? "#C48A97" : "#9CA3AF"} stroke="none"/>
      </svg>
    ),
  },
  {
    href: "/insights",
    label: "Insights",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? "#C48A97" : "#9CA3AF"} strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useApp();

  if (!user || pathname === "/auth" || pathname === "/onboarding") return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(247,245,242,0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(196,138,151,0.22)",
      }}
    >
      <div className="mx-auto max-w-app">
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 active:scale-90"
                style={{ background: active ? "rgba(196,138,151,0.10)" : "transparent" }}
              >
                {tab.icon(active)}
                <span className="text-xs font-semibold tracking-wide"
                  style={{ color: active ? "#C48A97" : "#9CA3AF" }}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
