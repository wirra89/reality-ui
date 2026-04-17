"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/weight/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { saveWeightLog, getWeightLogs, type WeightLog } from "@/lib/supabase";
import WeightChart from "@/components/WeightChart";

export default function WeightPage() {
  const { user, profile, loading } = useApp();
  const router = useRouter();

  const [logs, setLogs]         = useState<WeightLog[]>([]);
  const [weight, setWeight]     = useState("");
  const [note, setNote]         = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => { if (!loading && !user) router.replace("/auth"); }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getWeightLogs(90).then(data => { setLogs(data); setDataLoading(false); });
  }, [user]);

  // Pre-fill with profile weight
  useEffect(() => {
    if (profile?.weight_kg && !weight) setWeight(String(profile.weight_kg));
  }, [profile]);

  async function handleSave() {
    const w = parseFloat(weight);
    if (!w || w < 20 || w > 400) return;
    setSaveStatus("loading");
    const result = await saveWeightLog(w, note);
    if (result.success) {
      setSaveStatus("success");
      const updated = await getWeightLogs(90);
      setLogs(updated);
      setNote("");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }

  // Stats
  const weights = logs.map(l => l.weight_kg);
  const current = weights[weights.length - 1] ?? null;
  const starting = weights[0] ?? null;
  const lowest = weights.length ? Math.min(...weights) : null;
  const highest = weights.length ? Math.max(...weights) : null;
  const change = current && starting ? (current - starting) : null;
  const goal = profile?.body_goal === "cut" ? "↓ Lose fat" : profile?.body_goal === "bulk" ? "↑ Build muscle" : "⚖️ Recomp";

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  if (loading || !user) return (
    <PageSkeleton />
  );

  return (
    <div className="min-h-dvh bg-background">
      <div className="fixed top-0 left-0 right-0 h-48 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(196,138,151,0.15) 0%, transparent 70%)" }} />

      <main className="relative z-10 mx-auto max-w-app px-4 pt-6">

        {/* Header */}
        <header className="flex items-center gap-3 mb-5">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-surface shadow-card flex items-center justify-center text-dark/40 hover:text-dark transition-colors">
            ←
          </button>
          <div>
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest">Progress</p>
            <h1 className="font-display text-2xl font-semibold text-dark">Weight Tracker ⚖️</h1>
          </div>
        </header>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Current", value: current ? `${current}` : "—", unit: "kg" },
            { label: "Change", value: change !== null ? (change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1)) : "—", unit: "kg", color: change !== null ? (change < 0 ? "#34D399" : change > 0 ? "#F87171" : "var(--color-text-dim)") : undefined },
            { label: "Lowest", value: lowest ? `${lowest}` : "—", unit: "kg" },
            { label: "Goal", value: goal, unit: "" },
          ].map((s) => (
            <div key={s.label} className="bg-surface rounded-2xl p-3 text-center shadow-card">
              <p className="font-display font-bold text-sm text-dark leading-tight" style={{ color: s.color }}>{s.value}</p>
              {s.unit && <p className="text-xs text-dark/30 font-semibold">{s.unit}</p>}
              <p className="text-xs text-dark/40 uppercase tracking-wide font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        {logs.length >= 2 ? (
          <div className="bg-surface rounded-2xl p-4 shadow-card mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-dark">Weight over time</p>
              <p className="text-xs text-dark/40 font-body">{logs.length} entries</p>
            </div>
            <WeightChart logs={logs.map(l => ({ date: l.date, weight: l.weight_kg }))} />
          </div>
        ) : logs.length === 1 ? (
          <div className="bg-surface rounded-2xl p-5 shadow-card mb-4 text-center">
            <p className="text-3xl mb-2">📊</p>
            <p className="text-dark font-semibold text-sm">One more entry needed</p>
            <p className="text-dark/40 text-xs font-body mt-1">Log tomorrow's weight to unlock your chart</p>
          </div>
        ) : (
          <div className="rounded-2xl p-5 mb-4 text-center" style={{ background: "linear-gradient(135deg,#2A2330,#3D3248)" }}>
            <p className="text-4xl mb-3">⚖️</p>
            <p className="text-white font-semibold text-sm mb-1">Start tracking your weight</p>
            <p className="text-xs font-body mb-0" style={{ color: "rgba(255,255,255,0.5)" }}>
              After 2 entries you'll see a chart. After a full cycle you'll see how your weight changes with each phase.
            </p>
          </div>
        )}

        {/* Log new weight */}
        <div className="bg-surface rounded-2xl p-4 shadow-card mb-4">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">Log today's weight</p>
          <div className="flex gap-2 mb-2">
            <div className="flex-1 relative">
              <input type="number" placeholder="e.g. 65.5" value={weight}
                onChange={(e) => setWeight(e.target.value)}
                step="0.1" min="20" max="400"
                className="w-full bg-background rounded-xl px-3 py-3 text-lg font-display font-bold text-dark outline-none placeholder:text-dark/20 font-body pr-12 border border-transparent focus:border-primary/30 transition-colors" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-dark/40">kg</span>
            </div>
            <button onClick={handleSave} disabled={!weight || saveStatus === "loading"}
              className="px-5 rounded-xl font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-40 shadow-soft"
              style={{ background: saveStatus === "success" ? "linear-gradient(135deg, #34D399, #10B981)" : "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
              {saveStatus === "loading" ? "…" : saveStatus === "success" ? "✓" : "Save"}
            </button>
          </div>
          <input type="text" placeholder="Optional note (e.g. post-workout, morning)" value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-background rounded-xl px-3 py-2.5 text-sm text-dark outline-none placeholder:text-dark/30 font-body" />
        </div>

        {/* Recent log */}
        {!dataLoading && logs.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2.5 px-1">
              Recent entries
            </p>
            <div className="space-y-2">
              {[...logs].reverse().slice(0, 10).map((log, i) => (
                <div key={i} className="bg-surface rounded-2xl px-4 py-3 shadow-card flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(196,138,151,0.1)" }}>
                    <span className="text-sm font-bold text-primary">⚖</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-dark font-display font-bold text-base">{log.weight_kg} kg</p>
                    {log.note && <p className="text-dark/40 text-xs font-body">{log.note}</p>}
                  </div>
                  <p className="text-dark/40 text-xs font-body flex-shrink-0">{formatDate(log.date)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
