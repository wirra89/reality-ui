// lib/chartTypes.ts — shared types for PhaseLineChart and its consumers
import type { Phase } from "@/lib/cycle";

export interface SeriesPoint {
  date:   string;   // ISO date "YYYY-MM-DD"
  value:  number;
  phase?: Phase;    // populated when pointColorMode === "phase" (PR chart)
}

export interface LineSeries {
  id:     string;
  label:  string;
  color:  string;   // hex colour for the line; also used for points in "series" mode
  points: SeriesPoint[];
}

export interface PhaseBand {
  phase:     Phase;
  startDate: string;  // ISO date
  endDate:   string;  // ISO date
  color:     string;  // semi-transparent fill e.g. "rgba(52,211,153,0.08)"
}
