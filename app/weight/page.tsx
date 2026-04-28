"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/weight/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { saveWeightLog, getWeightLogs, type WeightLog } from "@/lib/supabase";
import WeightChart from "@/components/WeightChart";
import type { PhaseBand } from "@/lib/chartTypes";
import type { Phase } from "@/lib/cycle";

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

  // ── Phase bands: compute from period_start_date + cycle_length over log range ──
  const phaseBands: PhaseBand[] = (() => {
    if (!profile?.period_start_date || logs.length < 2) return [];
    const cycleLen    = profile.cycle_length ?? 28;
    const periodLen   = profile.period_length ?? 5;
    const cycleStart  = new Date(profile.period_start_date);
    const PHASE_DEFS: { phase: Phase; len: number; color: string }[] = [
      { phase: "menstrual",  len: periodLen,                        color: "rgba(248,113,113,0.12)" },
      { phase: "follicular", len: Math.round(cycleLen * 0.29),     color: "rgba(52,211,153,0.10)" },
      { phase: "ovulation",  len: Math.round(cycleLen * 0.11),     color: "rgba(251,191,36,0.10)" },
      { phase: "luteal",     len: cycleLen - periodLen - Math.round(cycleLen * 0.29) - Math.round(cycleLen * 0.11), color: "rgba(167,139,250,0.12)" },
    ];
    const bands: PhaseBand[] = [];
    const firstLog = new Date(logs[0].date);
    const lastLog  = new Date(logs[logs.length - 1].date);
    // Walk from cycleStart forward in cycles until we pass the last log
    let cursor = new Date(cycleStart);
    for (let cycle = 0; cycle < 6; cycle++) {
      for (const def of PHASE_DEFS) {
        const start = new Date(cursor);
        const end   = new Date(cursor);
        end.setDate(end.getDate() + def.len - 1);
        // Only add bands that overlap the log range
        if (end >= firstLog && start <= lastLog) {
          bands.push({
            phase:     def.phase,
            startDate: start.toISOString().split("T")[0],
            endDate:   end.toISOString().split("T")[0],
            color:     def.color,
          });
        }
        cursor.setDate(cursor.getDate() + def.len);
        if (cursor > lastLog) break;
      }
      if (cursor > lastLog) break;
    }
    return bands;
  })();

  // Detect luteal peak: highest weight logged during a luteal band
  const lutealPeak = (() => {
    const lutealBands = phaseBands.filter(b => b.phase === "luteal");
    if (!lutealBands.length || logs.length < 3) return null;
    let peak: WeightLog | null = null;
    for (const log of logs) {
      const inLuteal = lutealBands.some(b => log.date >= b.startDate && log.date <= b.endDate);
      if (inLuteal && (!peak || log.weight_kg > peak.weight_kg)) peak = log;
    }
    return peak;
  })();

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
      <div className="rose-glow fixed top-0 left-0 right-0 pointer-events-none z-0" />

      <main className="relative mx-auto max-w-app px-4 pt-6">

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
          <div className="mb-4">
            <div className="bg-surface rounded-2xl p-4 shadow-card mb-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-dark">Weight over time</p>
                <div className="flex items-center gap-3">
                  {phaseBands.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {(["menstrual","follicular","ovulation","luteal"] as const).map(ph => {
                        const colors: Record<string,string> = {
                          menstrual:"#F87171", follicular:"#34D399", ovulation:"#FBBF24", luteal:"#A78BFA"
                        };
                        if (!phaseBands.some(b => b.phase === ph)) return null;
                        return (
                          <div key={ph} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: colors[ph], opacity: 0.7 }} />
                            <span className="text-xs text-dark/30 capitalize" style={{ fontSize: 9 }}>{ph.slice(0,3)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-dark/40 font-body">{logs.length} entries</p>
                </div>
              </div>
              <WeightChart logs={logs.map(l => ({ date: l.date, weight: l.weight_kg }))} phaseBands={phaseBands} />
            </div>
            {/* Luteal peak annotation */}
            {lutealPeak && (
              <div className="rounded-2xl overflow-hidden shadow-card">
                <div className="flex items-center gap-2 px-4 py-2" style={{ background: "#EDE9FE" }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#A78BFA" }} />
                  <p className="text-xs font-extrabold uppercase tracking-widest flex-1" style={{ color: "#5B21B6" }}>Luteal phase note</p>
                </div>
                <div className="px-4 py-3" style={{ background: "var(--color-surface)" }}>
                  <p className="text-xs font-bold text-dark mb-1">
                    Peak weight {lutealPeak.weight_kg} kg on {new Date(lutealPeak.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — normal
                  </p>
                  <p className="text-xs text-dark/55 font-body leading-relaxed">
                    Progesterone causes water retention during the luteal phase. This isn&apos;t fat — it resolves within 2–3 days of your period starting. The purple zone on the chart marks this phase.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : logs.length === 1 ? (
          <div className="bg-surface rounded-2xl p-5 shadow-card mb-4 text-center">
            <p className="text-3xl mb-2">📊</p>
            <p className="text-dark font-semibold text-sm">One more entry needed</p>
            <p className="text-dark/40 text-xs font-body mt-1">Log tomorrow's weight to unlock your chart</p>
          </div>
        ) : (
          <div className="rounded-2xl p-5 mb-4 text-center" style={{ background: "var(--color-surface)", borderTop: "3px solid var(--color-primary)" }}>
            <p className="text-4xl mb-3">⚖️</p>
            <p className="text-dark font-semibold text-sm mb-1">Start tracking your weight</p>
            <p className="text-xs font-body mb-0" style={{ color: "var(--color-text-mid)" }}>
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
