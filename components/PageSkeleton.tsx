"use client";

export default function PageSkeleton() {
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center">
      {/* Rose glow */}
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-0"
        style={{ height: "300px", background: "radial-gradient(ellipse 95% 80% at 50% -5%, rgba(232,130,154,0.44) 0%, rgba(255,195,210,0.28) 30%, transparent 70%)" }} />

      <div className="relative z-10 flex flex-col items-center gap-5">
        <svg viewBox="0 0 180 180" width="100" height="100">
          <defs>
            <radialGradient id="splashG" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FDE8ED"/>
              <stop offset="100%" stopColor="#E8829A"/>
            </radialGradient>
          </defs>
          <g style={{ transformOrigin: "50% 50%", animation: "petalPulse 5s ease-in-out infinite" }}>
            <ellipse cx="90" cy="50" rx="22" ry="38" fill="url(#splashG)" opacity="0.85"/>
            <ellipse cx="90" cy="130" rx="22" ry="38" fill="url(#splashG)" opacity="0.85"/>
            <ellipse cx="50" cy="90" rx="38" ry="22" fill="url(#splashG)" opacity="0.85"/>
            <ellipse cx="130" cy="90" rx="38" ry="22" fill="url(#splashG)" opacity="0.85"/>
            <ellipse cx="62" cy="62" rx="26" ry="30" fill="url(#splashG)" opacity="0.7" transform="rotate(-45 62 62)"/>
            <ellipse cx="118" cy="62" rx="26" ry="30" fill="url(#splashG)" opacity="0.7" transform="rotate(45 118 62)"/>
            <ellipse cx="62" cy="118" rx="26" ry="30" fill="url(#splashG)" opacity="0.7" transform="rotate(45 62 118)"/>
            <ellipse cx="118" cy="118" rx="26" ry="30" fill="url(#splashG)" opacity="0.7" transform="rotate(-45 118 118)"/>
          </g>
          <circle cx="90" cy="90" r="18" fill="#C96480"/>
          <circle cx="90" cy="90" r="10" fill="#F4B8C6"/>
          <style>{`@keyframes petalPulse{0%,100%{transform:scale(1) rotate(0deg);opacity:.9}50%{transform:scale(1.08) rotate(8deg);opacity:1}}`}</style>
        </svg>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#E8829A", letterSpacing: "0.14em" }}>
          Herphase
        </p>
      </div>
    </div>
  );
}
