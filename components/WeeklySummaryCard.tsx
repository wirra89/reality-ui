"use client";

// components/WeeklySummaryCard.tsx
// Shows a Mon-Sun summary of the user's activity for the current week.
// Returns null when no data exists yet — never shows an empty card.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/context/AppContext";

interface WeekSummary {
  workouts:    number;
  meals:       number;
  avgMood:     number | null;
  weightTrend: "up" | "down" | "stable" | null;
  bestPR:      { exercise: string; weight: number } | null;
}

function getWeekBounds(): { monday: string; sunday: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { monday: fmt(monday), sunday: fmt(sunday) };
}

export default function WeeklySummaryCard() {
  const { user } = useApp();
  const [summary, setSummary] = useState<WeekSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    const { monday, sunday } = getWeekBounds();
    const sundayEnd = sunday + "T23:59:59";

    Promise.all([
      supabase.from("workouts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monday)
        .lte("created_at", sundayEnd),
      supabase.from("meal_log_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("logged_at", monday)
        .lte("logged_at", sundayEnd),
      supabase.from("mood_logs")
        .select("mood")
        .eq("user_id", user.id)
        .gte("date", monday)
        .lte("date", sunday),
      supabase.from("weight_logs")
        .select("weight_kg,date")
        .eq("user_id", user.id)
        .gte("date", monday)
        .lte("date", sunday)
        .order("date", { ascending: true }),
      supabase.from("personal_records")
        .select("exercise_name,weight_kg")
        .eq("user_id", user.id)
        .gte("logged_at", monday)
        .lte("logged_at", sunday)
        .order("weight_kg", { ascending: false })
        .limit(1),
    ]).then(([w, m, mo, wt, pr]) => {
      const moodRows = (mo.data ?? []) as { mood: unknown }[];
      const avgMood  = moodRows.length
        ? moodRows.reduce((a, x) => a + Number(x.mood), 0) / moodRows.length
        : null;

      const wtRows = (wt.data ?? []) as { weight_kg: number }[];
      let weightTrend: WeekSummary["weightTrend"] = null;
      if (wtRows.length >= 2) {
        const diff = wtRows[wtRows.length - 1].weight_kg - wtRows[0].weight_kg;
        weightTrend = diff > 0.2 ? "up" : diff < -0.2 ? "down" : "stable";
      }

      const prRows = (pr.data ?? []) as { exercise_name: string; weight_kg: number }[];
      const bestPR = prRows[0]
        ? { exercise: prRows[0].exercise_name, weight: prRows[0].weight_kg }
        : null;

      setSummary({
        workouts:    w.count ?? 0,
        meals:       m.count ?? 0,
        avgMood,
        weightTrend,
        bestPR,
      });
    });
  }, [user]);

  if (!summary) return null;

  const hasData = summary.workouts > 0 || summary.meals > 0 || summary.avgMood !== null;
  if (!hasData) return null;

  const { monday } = getWeekBounds();
  const weekStart = new Date(monday).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  const MOOD_EMOJI = ["", "😣", "😔", "😐", "🙂", "😄"];
  const TREND_ICON:  Record<string, string> = { up: "↑", down: "↓", stable: "→" };
  const TREND_COLOR: Record<string, string> = { up: "#F87171", down: "#34D399", stable: "#A78BFA" };

  return (
    <div
      className="rounded-2xl p-4 mb-4 shadow-card"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <p className="text-xs font-semibold text-dark/40 uppercase tracking-wide mb-3">
        Week from {weekStart}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Tile emoji="🏋️‍♀️" label="Workouts" value={summary.workouts > 0 ? `${summary.workouts}` : "—"} />
        <Tile emoji="🥗" label="Meals logged" value={summary.meals > 0 ? `${summary.meals}` : "—"} />

        {summary.avgMood !== null && (
          <Tile
            emoji={MOOD_EMOJI[Math.round(summary.avgMood)] ?? "😐"}
            label="Avg mood"
            value={summary.avgMood.toFixed(1)}
          />
        )}

        {summary.weightTrend && (
          <Tile
            emoji={TREND_ICON[summary.weightTrend]}
            emojiColor={TREND_COLOR[summary.weightTrend]}
            label="Weight"
            value={summary.weightTrend.charAt(0).toUpperCase() + summary.weightTrend.slice(1)}
          />
        )}

        {summary.bestPR && (
          <div
            className="col-span-2 rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{ background: "rgba(251,191,36,0.10)" }}
          >
            <span className="text-lg">🏆</span>
            <div>
              <p className="text-xs font-semibold text-dark">Best PR this week</p>
              <p className="text-xs font-body text-dark/50">
                {summary.bestPR.exercise} — {summary.bestPR.weight} kg
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({
  emoji, emojiColor, label, value,
}: {
  emoji: string; emojiColor?: string; label: string; value: string;
}) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--color-ghost)" }}>
      <p className="text-base mb-0.5" style={{ color: emojiColor }}>{emoji}</p>
      <p className="text-sm font-semibold text-dark">{value}</p>
      <p className="text-xs text-dark/40">{label}</p>
    </div>
  );
}
