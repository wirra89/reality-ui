// lib/phaseColors.ts — single source of truth for phase accent colors

export const PHASE_DOT_COLOR: Record<string, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

export const PHASE_BG: Record<string, string> = {
  menstrual:  "rgba(248,113,113,0.12)",
  follicular: "rgba(52,211,153,0.12)",
  ovulation:  "rgba(251,191,36,0.12)",
  luteal:     "rgba(167,139,250,0.12)",
};

export const PHASE_TEXT: Record<string, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

// Combined shape used by Insights, History, and any component needing all three
export const PHASE_FULL: Record<string, { bg: string; text: string; dot: string }> = {
  menstrual:  { bg: "rgba(248,113,113,0.12)",  text: "#F87171",  dot: "#F87171" },
  follicular: { bg: "rgba(52,211,153,0.12)",   text: "#34D399",  dot: "#34D399" },
  ovulation:  { bg: "rgba(251,191,36,0.12)",   text: "#FBBF24",  dot: "#FBBF24" },
  luteal:     { bg: "rgba(167,139,250,0.12)",  text: "#A78BFA",  dot: "#A78BFA" },
};

// Primary CTA gradient — deepened for WCAG contrast with white text
// Start #C96480 ~3.7:1, end #A84468 ~5.2:1. Preserves rose brand feel.
export const ROSE_GRADIENT = "linear-gradient(135deg, #C96480, #A84468)";
