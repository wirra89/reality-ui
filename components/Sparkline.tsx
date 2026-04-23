"use client";

// components/Sparkline.tsx

type SparklineProps = {
  values: number[];
  labels?: string[];
  todayIndex?: number;
  title?: string;
  delta?: string;
  height?: number;
};

export default function Sparkline({
  values,
  labels,
  todayIndex,
  title,
  delta,
  height = 44,
}: SparklineProps) {
  const max = Math.max(...values, 1);
  const defaultLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const displayLabels = labels ?? defaultLabels.slice(-values.length);
  const todayIdx = todayIndex ?? values.length - 1;

  return (
    <div
      className="rounded-[20px] px-4 py-3.5"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 2px 16px rgba(232,130,154,0.08)",
      }}
    >
      {(title || delta) && (
        <div className="flex items-baseline justify-between mb-2">
          {title && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--color-text-dim)" }}>
              {title}
            </span>
          )}
          {delta && (
            <span className="font-accent text-sm font-bold text-primary">{delta}</span>
          )}
        </div>
      )}
      <div className="flex items-end gap-1.5" style={{ height }}>
        {values.map((v, i) => {
          const barH = Math.max((v / max) * height, 4);
          const isPeak = i === todayIdx;
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all duration-400"
              style={{
                height: barH,
                background: isPeak
                  ? "linear-gradient(180deg, #E8829A, #C96480)"
                  : "linear-gradient(180deg, #F4B8C6, #E8829A)",
                minWidth: 0,
              }}
            />
          );
        })}
      </div>
      {displayLabels.length > 0 && (
        <div className="flex gap-1.5 mt-1.5">
          {displayLabels.map((lbl, i) => (
            <span
              key={i}
              className="flex-1 text-center font-accent text-[8px] uppercase tracking-wide"
              style={{
                color: i === todayIdx ? "#E8829A" : "var(--color-text-dim)",
                fontWeight: i === todayIdx ? 700 : 400,
              }}
            >
              {lbl}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
