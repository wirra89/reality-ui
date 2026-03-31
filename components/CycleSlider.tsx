"use client";

// components/CycleSlider.tsx
import { useRef, useEffect, useCallback } from "react";
import { getPhase, getPhaseBoundaries, type CycleParams } from "@/lib/cycle";

interface Props {
  cycleDay: number;
  cycleLength?: number;
  cycleParams?: CycleParams;
  onChange: (day: number) => void;
}

export default function CycleSlider({ cycleDay, cycleLength = 28, cycleParams = {}, onChange }: Props) {
  const params = { ...cycleParams, cycleLength };
  const currentPhase = getPhase(cycleDay, params);
  const thumbRef = useRef<HTMLDivElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);

  const b = getPhaseBoundaries(params);
  const PHASES = [
    { label: "Menstrual",  color: "#F87171", from: b.menstrual.start,  end: b.menstrual.end },
    { label: "Follicular", color: "#34D399", from: b.follicular.start, end: b.follicular.end },
    { label: "Ovulation",  color: "#FBBF24", from: b.ovulation.start,  end: b.ovulation.end },
    { label: "Luteal",     color: "#A78BFA", from: b.luteal.start,     end: b.luteal.end },
  ];

  const activePhase = PHASES.find(p => p.label.toLowerCase() === currentPhase) ?? PHASES[3];

  const updateThumb = useCallback(() => {
    if (!thumbRef.current || !wrapRef.current) return;
    const pct = (cycleDay - 1) / (cycleLength - 1);
    const trackW = wrapRef.current.offsetWidth;
    thumbRef.current.style.left = (pct * (trackW - 22) + 11) + "px";
    thumbRef.current.style.borderColor = activePhase.color;
  }, [cycleDay, cycleLength, activePhase.color]);

  useEffect(() => {
    updateThumb();
  }, [updateThumb]);

  useEffect(() => {
    window.addEventListener("resize", updateThumb);
    return () => window.removeEventListener("resize", updateThumb);
  }, [updateThumb]);

  return (
    <div className="bg-white rounded-2xl shadow-card mb-3 overflow-hidden">

      {/* CYCLE DAY header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <p className="text-xs font-semibold text-dark/50 uppercase tracking-widest">Cycle Day</p>
        <div className="flex items-center gap-2">
          <button
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-base leading-none transition-all active:scale-90"
            style={{ background: "#f0ecf5", color: "#C48A97" }}
            onClick={() => onChange(Math.max(1, cycleDay - 1))}>
            −
          </button>
          <span className="font-display font-bold text-lg text-dark w-14 text-center">
            {cycleDay}/{cycleLength}
          </span>
          <button
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-base leading-none transition-all active:scale-90"
            style={{ background: "#f0ecf5", color: "#C48A97" }}
            onClick={() => onChange(Math.min(cycleLength, cycleDay + 1))}>
            +
          </button>
        </div>
      </div>

      {/* Unified slider — coloured track IS the slider */}
      <div className="px-4 pb-2">
        <div ref={wrapRef} className="relative" style={{ height: 14 }}>
          {/* Coloured track */}
          <div className="absolute inset-0 rounded-full overflow-hidden flex">
            {PHASES.map(p => {
              const w = ((p.end - p.from + 1) / cycleLength * 100).toFixed(2);
              const isActive = p.label.toLowerCase() === currentPhase;
              return (
                <div key={p.label}
                  style={{ width: `${w}%`, background: p.color, opacity: isActive ? 1 : 0.28, transition: "opacity 0.2s" }} />
              );
            })}
          </div>

          {/* Invisible range input on top */}
          <input
            type="range" min={1} max={cycleLength} value={cycleDay} step={1}
            onChange={e => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            style={{ height: 14 }}
          />

          {/* Custom thumb */}
          <div ref={thumbRef}
            className="absolute pointer-events-none"
            style={{
              top: "50%", width: 22, height: 22, borderRadius: "50%",
              background: "white", border: "2.5px solid #A78BFA",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 1px 5px rgba(0,0,0,0.18)",
              transition: "border-color 0.2s",
              left: 11,
            }} />
        </div>

        {/* Axis labels */}
        <div className="flex justify-between mt-1.5 mb-2">
          <span className="text-[10px] text-dark/25 font-body">Day 1</span>
          <span className="text-[10px] font-semibold text-dark/40">Day {cycleDay}</span>
          <span className="text-[10px] text-dark/25 font-body">Day {cycleLength}</span>
        </div>

        {/* Phase pills — grid so all 4 always fit in one row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
          {PHASES.map(p => {
            const active = p.label.toLowerCase() === currentPhase;
            return (
              <button key={p.label}
                onClick={() => onChange(p.from)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 4, padding: "4px 0", borderRadius: 999,
                  border: `1px solid ${active ? p.color + "55" : "transparent"}`,
                  background: active ? p.color + "18" : "transparent",
                  color: active ? p.color : "#9CA3AF",
                  fontSize: 11, fontWeight: active ? 600 : 400,
                  whiteSpace: "nowrap", overflow: "hidden",
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, display: "inline-block", flexShrink: 0 }} />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
