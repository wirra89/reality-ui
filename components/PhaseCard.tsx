"use client";

// components/PhaseCard.tsx

type PhaseCardProps = {
  phase: string;
  label?: string;
  description: string;
  cycleDay: number;
  className?: string;
};

const PHASE_STYLE: Record<string, {
  bg: string; border: string; iconBg: string;
  labelColor: string; badgeBg: string; badgeColor: string;
}> = {
  follicular: {
    bg: "#F2FCF7", border: "#CFF0DF", iconBg: "#E8FBF2",
    labelColor: "#1B8A60", badgeBg: "#E8FBF2", badgeColor: "#1B8A60",
  },
  ovulation: {
    bg: "#FFF9E6", border: "#F4E3A8", iconBg: "#FFF2CC",
    labelColor: "#B45309", badgeBg: "#FFF2CC", badgeColor: "#B45309",
  },
  luteal: {
    bg: "#F7F2FF", border: "#DDD0F5", iconBg: "#EDE4FF",
    labelColor: "#6D3FC0", badgeBg: "#EDE4FF", badgeColor: "#6D3FC0",
  },
  menstrual: {
    bg: "#FEF2F2", border: "#FED0D0", iconBg: "#FEE2E2",
    labelColor: "#DC2626", badgeBg: "#FEE2E2", badgeColor: "#DC2626",
  },
};

function SproutIcon() {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      <path className="phase-glyph-stem" d="M14 26 V13" stroke="#1B8A60" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path className="phase-glyph-leaf-l" d="M14 16 C 8 14, 6 9, 9 5 C 13 7, 14 12, 14 16 Z" fill="#34D399" />
      <path className="phase-glyph-leaf-r" d="M14 14 C 20 12, 22 7, 19 3 C 15 5, 14 10, 14 14 Z" fill="#6EE7B7" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      <g className="phase-glyph-rays" stroke="#D9A94A" strokeWidth="1.6" strokeLinecap="round">
        <line x1="14" y1="2"  x2="14" y2="6" />
        <line x1="14" y1="22" x2="14" y2="26" />
        <line x1="2"  y1="14" x2="6"  y2="14" />
        <line x1="22" y1="14" x2="26" y2="14" />
        <line x1="5"  y1="5"  x2="8"  y2="8" />
        <line x1="20" y1="20" x2="23" y2="23" />
        <line x1="5"  y1="23" x2="8"  y2="20" />
        <line x1="20" y1="8"  x2="23" y2="5" />
      </g>
      <circle className="phase-glyph-core" cx="14" cy="14" r="5.5" fill="#F4C54A" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      <circle className="phase-glyph-halo" cx="14" cy="14" r="11" fill="#A78BFA" opacity="0.35" />
      <path d="M18 6 A 9 9 0 1 0 22 18 A 7 7 0 0 1 18 6 Z" fill="#6D3FC0" />
      <circle className="phase-glyph-star-a" cx="6"  cy="8"  r="0.9" fill="#C4B5FD" />
      <circle className="phase-glyph-star-b" cx="24" cy="6"  r="0.7" fill="#C4B5FD" />
      <circle className="phase-glyph-star-c" cx="5"  cy="20" r="0.8" fill="#C4B5FD" />
    </svg>
  );
}

function MenstrualIcon() {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      <circle className="phase-glyph-halo" cx="14" cy="14" r="10" fill="#F87171" opacity="0.25" />
      <path d="M14 4 C10 8, 6 12, 6 16 a8 8 0 0 0 16 0 C22 12 18 8 14 4 Z" fill="#F87171" />
      <path d="M14 10 C12 13, 10 15, 10 17 a4 4 0 0 0 8 0 C18 15 16 13 14 10 Z" fill="#FCA5A5" opacity="0.6" />
    </svg>
  );
}

const PHASE_ICONS: Record<string, React.ReactNode> = {
  follicular: <SproutIcon />,
  ovulation:  <SunIcon />,
  luteal:     <MoonIcon />,
  menstrual:  <MenstrualIcon />,
};

const PHASE_LABEL_COPY: Record<string, string> = {
  follicular: "Follicular Phase",
  ovulation:  "Ovulation",
  luteal:     "Luteal Phase",
  menstrual:  "Menstrual Phase",
};

export default function PhaseCard({ phase, description, cycleDay, className = "" }: PhaseCardProps) {
  const style = PHASE_STYLE[phase] ?? PHASE_STYLE.follicular;
  const labelCopy = PHASE_LABEL_COPY[phase] ?? phase;

  return (
    <div
      className={`relative rounded-[22px] p-3.5 flex items-center gap-3 overflow-hidden ${className}`}
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        boxShadow: "0 4px 24px rgba(232,130,154,0.10)",
      }}
    >
      {/* decorative orb */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${style.iconBg} 0%, transparent 70%)` }}
      />

      {/* animated phase icon */}
      <div
        className="w-12 h-12 rounded-[16px] flex items-center justify-center flex-shrink-0"
        style={{ background: style.iconBg }}
      >
        {PHASE_ICONS[phase]}
      </div>

      {/* text */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-0.5" style={{ color: style.labelColor }}>
          Current Phase
        </p>
        <p className="font-display text-lg font-semibold italic text-dark leading-tight mb-0.5">
          {labelCopy}
        </p>
        <p className="text-[11px] leading-snug" style={{ color: "var(--color-text-mid)" }}>{description}</p>
      </div>

      {/* day badge */}
      <div
        className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-xl"
        style={{ background: style.badgeBg, color: style.badgeColor }}
      >
        Day {cycleDay}
      </div>
    </div>
  );
}
