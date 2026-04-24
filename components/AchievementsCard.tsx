"use client";
import { type AchievementDef } from "@/lib/achievements";

interface AchievementsCardProps {
  achievements: AchievementDef[];
}

export default function AchievementsCard({ achievements }: AchievementsCardProps) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div
      className="bg-surface rounded-2xl shadow-card mb-3 overflow-hidden"
      style={{ borderTop: "2px solid #34D399" }}
    >
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#34D399" }}>
          Achievements
        </p>
        <p className="text-xs font-body" style={{ color: "var(--color-text-dim)" }}>
          {unlockedCount} / {achievements.length}
        </p>
      </div>

      <div className="flex gap-3 px-4 pb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {achievements.map((a) => (
          <div key={a.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-14">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all"
              style={{
                background: a.unlocked
                  ? "linear-gradient(135deg, rgba(52,211,153,0.2), rgba(52,211,153,0.08))"
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${a.unlocked ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.06)"}`,
                opacity: a.unlocked ? 1 : 0.45,
              }}
            >
              {a.icon}
            </div>
            <p
              className="text-center font-semibold leading-tight"
              style={{
                fontSize: "8px",
                color: a.unlocked ? "var(--color-text)" : "var(--color-text-dim)",
              }}
            >
              {a.label}
            </p>
            {!a.unlocked && a.progress && (
              <p
                className="text-center font-body leading-tight"
                style={{ fontSize: "7px", color: "var(--color-text-dim)" }}
              >
                {a.progress}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
