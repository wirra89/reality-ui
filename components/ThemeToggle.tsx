"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isMidnight = theme === "midnight";

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isMidnight ? "Rose Blush" : "Midnight"} theme`}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
        isMidnight
          ? "bg-[#1C2238] border border-white/10 text-[#EDE8F8]"
          : "bg-[#FDE8ED] border border-[rgba(232,130,154,0.20)] text-[#7D5C65]"
      } ${className}`}
    >
      <span className="text-base leading-none">
        {isMidnight ? "☀️" : "🌙"}
      </span>
      <span>{isMidnight ? "Rose Blush" : "Midnight"}</span>
    </button>
  );
}
