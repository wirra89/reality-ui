"use client";

import { useState, useCallback } from "react";

type Props = {
  glasses: number;
  target: number;
  onTap: (next: number) => void;
  loading?: boolean;
};

// SVG bottle body: from y=37 (neck shoulder) to y=142 (before bottom curve)
const BODY_TOP = 37;
const BODY_BOTTOM = 142;
const BODY_HEIGHT = BODY_BOTTOM - BODY_TOP;

export default function WaterBottleCard({ glasses, target, onTap, loading }: Props) {
  const [splashKey, setSplashKey] = useState(0);
  const [showSplash, setShowSplash] = useState(false);

  const fillRatio = Math.min(glasses / Math.max(target, 1), 1);
  const waterHeight = fillRatio * BODY_HEIGHT;
  const waterY = BODY_BOTTOM - waterHeight;
  const isDone = glasses >= target;

  const handleTap = useCallback(() => {
    if (loading) return;
    const next = isDone ? 0 : Math.min(glasses + 1, target);
    onTap(next);
    setSplashKey(k => k + 1);
    setShowSplash(true);
    setTimeout(() => setShowSplash(false), 500);
  }, [glasses, target, isDone, loading, onTap]);

  return (
    <div
      onClick={handleTap}
      className="flex-1 rounded-[18px] px-2.5 py-3 flex flex-col items-center cursor-pointer active:scale-95 transition-transform select-none"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 2px 10px rgba(180,80,100,0.08)",
      }}
    >
      {/* Bottle SVG */}
      <div className="mb-1.5 flex items-center justify-center" style={{ height: 52 }}>
        <svg
          viewBox="0 0 60 155"
          width="24"
          height="52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="wbClip">
              <path d="M22 4 h16 a3 3 0 0 1 3 3 v8 a2 2 0 0 1 -2 2 h-1 v6 a6 6 0 0 0 2 4.5 l3 3 a10 10 0 0 1 3 7 v104 a8 8 0 0 1 -8 8 h-16 a8 8 0 0 1 -8 -8 v-104 a10 10 0 0 1 3 -7 l3 -3 a6 6 0 0 0 2 -4.5 v-6 h-1 a2 2 0 0 1 -2 -2 v-8 a3 3 0 0 1 3 -3 z" />
            </clipPath>
            <linearGradient id="wbGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>

          {/* Water fill */}
          <rect
            x="0"
            y={waterY}
            width="60"
            height={waterHeight}
            fill="url(#wbGrad)"
            clipPath="url(#wbClip)"
            style={{
              transition: "y 0.5s cubic-bezier(0.34,1.56,0.64,1), height 0.5s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          />

          {/* Bottle outline — drawn on top of fill */}
          <path
            d="M22 4 h16 a3 3 0 0 1 3 3 v8 a2 2 0 0 1 -2 2 h-1 v6 a6 6 0 0 0 2 4.5 l3 3 a10 10 0 0 1 3 7 v104 a8 8 0 0 1 -8 8 h-16 a8 8 0 0 1 -8 -8 v-104 a10 10 0 0 1 3 -7 l3 -3 a6 6 0 0 0 2 -4.5 v-6 h-1 a2 2 0 0 1 -2 -2 v-8 a3 3 0 0 1 3 -3 z"
            fill={glasses === 0 ? "rgba(244,184,198,0.10)" : "none"}
            stroke={isDone ? "#3B82F6" : "rgba(59,130,246,0.35)"}
            strokeWidth="1.5"
          />

          {/* Tick marks at 25 / 50 / 75 % */}
          {[0.25, 0.5, 0.75].map((pct, i) => {
            const ty = BODY_BOTTOM - pct * BODY_HEIGHT;
            return (
              <line
                key={i}
                x1="26" y1={ty} x2="29" y2={ty}
                stroke="rgba(59,130,246,0.25)"
                strokeWidth="0.8"
              />
            );
          })}

          {/* Splash ring — re-keyed on each tap to restart animation */}
          {showSplash && waterHeight > 0 && (
            <circle
              key={splashKey}
              cx="30"
              cy={waterY + 6}
              r="5"
              fill="none"
              stroke="rgba(59,130,246,0.55)"
              strokeWidth="1.2"
              className="wb-splash"
            />
          )}
        </svg>
      </div>

      <p className="text-xs font-bold mb-0.5 leading-tight" style={{ color: "var(--color-text)" }}>
        Hydrate
      </p>
      <p className="text-[10px] leading-snug" style={{ color: isDone ? "#3B82F6" : "var(--color-text-mid)" }}>
        {isDone ? "Done! Tap reset" : `${glasses}/${target} glasses`}
      </p>
    </div>
  );
}
