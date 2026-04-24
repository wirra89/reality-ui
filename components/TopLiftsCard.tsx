"use client";
import { useRouter } from "next/navigation";
import { type PersonalRecord } from "@/lib/supabase";

const RANK_COLORS = ["#FBBF24", "#C0C0C0", "#CD7F32"];
const RANK_BG     = ["rgba(251,191,36,0.15)", "rgba(192,192,192,0.15)", "rgba(205,127,50,0.15)"];

const PHASE_LABELS: Record<string, string> = {
  menstrual:  "Menstrual",
  follicular: "Follicular",
  ovulation:  "Ovulation",
  luteal:     "Luteal",
};

interface TopLiftsCardProps {
  prs: PersonalRecord[];
}

export default function TopLiftsCard({ prs }: TopLiftsCardProps) {
  const router = useRouter();

  const top3 = [...prs]
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, 3);

  if (top3.length === 0) return null;

  return (
    <div
      className="bg-surface rounded-2xl shadow-card mb-3 overflow-hidden"
      style={{ borderTop: "2px solid #C96480" }}
    >
      <div className="px-4 pt-4 pb-1">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#C96480" }}>
          Top lifts
        </p>
      </div>

      <div className="px-3 pb-3 space-y-1.5">
        {top3.map((pr, i) => (
          <div
            key={pr.id ?? i}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: RANK_BG[i], color: RANK_COLORS[i] }}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark truncate">{pr.exercise}</p>
              {pr.phase && (
                <p className="text-xs font-body truncate" style={{ color: "var(--color-text-dim)" }}>
                  {pr.cycle_day ? `Day ${pr.cycle_day} · ` : ""}
                  {PHASE_LABELS[pr.phase] ?? pr.phase}
                </p>
              )}
            </div>
            <p className="text-sm font-bold flex-shrink-0" style={{ color: RANK_COLORS[i] }}>
              {pr.weight} kg × {pr.reps}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push("/prs")}
        className="w-full py-3 text-xs font-semibold text-center transition-all active:scale-98 border-t"
        style={{ color: "var(--color-text-dim)", borderColor: "var(--color-border)" }}
      >
        View all PRs →
      </button>
    </div>
  );
}
