"use client";

// components/CycleCalendar.tsx
import { useState } from "react";
import { getPhase, type CycleParams } from "@/lib/cycle";

interface Props {
  periodStartDate: string | null;
  cycleLength: number;
  cycleParams?: CycleParams;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

const PHASE_COLORS: Record<string, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

const PHASE_BG: Record<string, string> = {
  menstrual:  "rgba(248,113,113,0.18)",
  follicular: "rgba(52,211,153,0.18)",
  ovulation:  "rgba(251,191,36,0.18)",
  luteal:     "rgba(167,139,250,0.18)",
};

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function CycleCalendar({ periodStartDate, cycleLength, cycleParams = {}, onSelectDate, onClose }: Props) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const monthName = firstDay.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const params = { ...cycleParams, cycleLength };

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function getDayPhase(day: number): string | null {
    if (!periodStartDate) return null;
    const cellDate = new Date(viewYear, viewMonth, day);
    const start = new Date(periodStartDate);
    start.setHours(0, 0, 0, 0);
    cellDate.setHours(0, 0, 0, 0);
    const diff = Math.floor((cellDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return null;
    const cycleDay = (diff % cycleLength) + 1;
    return getPhase(cycleDay, params);
  }

  function isToday(day: number): boolean {
    return day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  }

  function isPeriodStart(day: number): boolean {
    if (!periodStartDate) return false;
    const d = new Date(periodStartDate);
    return day === d.getDate() && viewMonth === d.getMonth() && viewYear === d.getFullYear();
  }

  // Detect if a day is the first of a new phase (for left-border accent)
  function isPhaseStart(day: number): boolean {
    if (!periodStartDate) return false;
    const phase = getDayPhase(day);
    const prevPhase = day > 1 ? getDayPhase(day - 1) : null;
    return phase !== null && phase !== prevPhase;
  }

  function handleSelect(day: number) {
    const selected = new Date(viewYear, viewMonth, day);
    onSelectDate(selected.toISOString().split("T")[0]);
  }

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(42,35,48,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-app rounded-t-3xl pb-8 pt-4 px-4" style={{ background: "#F7F5F2" }}>
        {/* Handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-dark/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-dark">Select Period Start</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white shadow-card flex items-center justify-center text-dark/40 text-lg">×</button>
        </div>

        {/* Phase legend */}
        <div className="flex gap-3 flex-wrap mb-4">
          {[
            { phase: "menstrual", label: "🌙 Menstrual" },
            { phase: "follicular", label: "🌱 Follicular" },
            { phase: "ovulation", label: "⚡ Ovulation" },
            { phase: "luteal", label: "🍂 Luteal" },
          ].map(({ phase, label }) => (
            <div key={phase} className="flex items-center gap-1.5 text-xs font-medium text-dark/60">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: PHASE_COLORS[phase] }} />
              {label}
            </div>
          ))}
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="w-8 h-8 rounded-xl bg-white shadow-card flex items-center justify-center text-dark/60 font-semibold">‹</button>
          <span className="font-semibold text-dark text-sm">{monthName}</span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-xl bg-white shadow-card flex items-center justify-center text-dark/60 font-semibold">›</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-dark/30 uppercase py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const phase = getDayPhase(day);
            const today_ = isToday(day);
            const isStart = isPeriodStart(day);
            const phaseStart = isPhaseStart(day);

            return (
              <button
                key={i}
                onClick={() => handleSelect(day)}
                className="aspect-square flex items-center justify-center text-sm font-semibold transition-all active:scale-90 relative"
                style={{
                  background: isStart ? "#C48A97" : phase ? PHASE_BG[phase] : "transparent",
                  color: isStart ? "white" : today_ ? "#C48A97" : "#2E2E2E",
                  outline: today_ && !isStart ? "2px solid rgba(196,138,151,0.6)" : "none",
                  borderRadius: 10,
                  borderLeft: phaseStart && !isStart && phase ? `3px solid ${PHASE_COLORS[phase]}` : undefined,
                }}
              >
                {day}
                {isStart && <span className="absolute -top-0.5 -right-0.5 text-xs">🩸</span>}
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-dark/40 font-body mt-4">
          Tap a day to set your period start date
        </p>
      </div>
    </div>
  );
}
