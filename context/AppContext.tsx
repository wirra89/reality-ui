"use client";

// context/AppContext.tsx
// Extended with TodayState integration — Step 2 of HerPhase V1 foundation.
// All existing API is preserved. New additions: todayState, latestMoodLog,
// logCount, refreshTodayState.

import {
  createContext, useContext, useEffect, useState,
  useCallback, useMemo, ReactNode,
} from "react";
import { supabase, type Profile, type MoodLog } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { calcCycleDayFromDate, getPhase, type CycleParams } from "@/lib/cycle";
import {
  generateTodayState,
  type TodayState,
  type CheckInSnapshot,
} from "@/lib/dailyPlan";

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT INTERFACE — backward compatible, all existing fields preserved
// ─────────────────────────────────────────────────────────────────────────────

interface AppContextValue {
  // ── Existing (unchanged) ──────────────────────────────────────────────────
  user: User | null;
  profile: Profile | null;
  cycleDay: number;
  cycleParams: CycleParams;
  loading: boolean;
  newCyclePrompt: boolean;
  dismissNewCyclePrompt: () => void;
  setCycleDay: (day: number) => void;
  setPeriodStartToday: () => Promise<void>;
  setPeriodStartDate: (date: string) => Promise<void>;
  refreshProfile: () => Promise<void>;

  // ── New in Step 2 ─────────────────────────────────────────────────────────
  todayState: TodayState | null;       // computed daily plan — never set directly
  latestMoodLog: MoodLog | null;       // today's check-in (null if not submitted)
  logCount: number;                    // total mood logs — drives data maturity
  refreshTodayState: () => Promise<void>; // call after mood save to recompute
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT DEFAULT — null-safe defaults for all new fields
// ─────────────────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue>({
  user: null, profile: null, cycleDay: 8, cycleParams: {}, loading: true,
  newCyclePrompt: false, dismissNewCyclePrompt: () => {},
  setCycleDay: () => {}, setPeriodStartToday: async () => {},
  setPeriodStartDate: async () => {}, refreshProfile: async () => {},
  // New defaults
  todayState: null,
  latestMoodLog: null,
  logCount: 0,
  refreshTodayState: async () => {},
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Converts a MoodLog (Supabase shape) to CheckInSnapshot (engine shape). */
function moodLogToCheckin(log: MoodLog): CheckInSnapshot {
  return {
    mood:          log.mood,
    energy:        log.energy,
    symptoms:      log.symptoms ?? [],
    sleep_hours:   log.sleep_hours,
    sleep_quality: log.sleep_quality,
    cravings:      log.cravings ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {

  // ── Existing state (unchanged) ────────────────────────────────────────────
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualCycleDay, setManualCycleDay] = useState<number | null>(null);
  const [newCyclePrompt, setNewCyclePrompt] = useState(false);

  // ── New state (Step 2) ────────────────────────────────────────────────────
  const [latestMoodLog, setLatestMoodLog] = useState<MoodLog | null>(null);
  const [logCount, setLogCount]           = useState<number>(0);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED: cycleDay (unchanged logic)
  // ─────────────────────────────────────────────────────────────────────────

  const cycleDay = (() => {
    if (manualCycleDay !== null) return manualCycleDay;
    if (profile?.period_start_date) {
      return calcCycleDayFromDate(profile.period_start_date, profile.cycle_length ?? 28);
    }
    return profile?.cycle_day ?? 8;
  })();

  const cycleParams: CycleParams = {
    cycleLength:     profile?.cycle_length     ?? 28,
    periodLength:    profile?.period_length    ?? 5,
    ovulationLength: profile?.ovulation_length ?? 3,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED: todayState — computed via useMemo, recomputes when deps change.
  // Dependencies: cycleDay, cycleParams, latestMoodLog, profile.goals, logCount.
  // generateTodayState is pure — safe inside useMemo.
  // ─────────────────────────────────────────────────────────────────────────

  const todayState = useMemo<TodayState | null>(() => {
    // Don't compute until we have at least a phase
    if (!profile && !cycleDay) return null;

    const phase = getPhase(cycleDay, cycleParams);

    return generateTodayState({
      phase,
      cycleDay,
      cycleParams,
      checkin:            latestMoodLog ? moodLogToCheckin(latestMoodLog) : null,
      userGoals:          profile?.goals ?? [],
      logCount,
    });
  }, [cycleDay, cycleParams, latestMoodLog, profile?.goals, logCount, profile]);

  // ─────────────────────────────────────────────────────────────────────────
  // MOOD LOG LOADER — single DB call, runs after profile loads
  // Fetches today's mood log and total log count (for data maturity).
  // ─────────────────────────────────────────────────────────────────────────

  const loadMoodData = useCallback(async (userId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Parallel: today's log + total count
      const [todayResult, countResult] = await Promise.all([
        supabase
          .from("mood_logs")
          .select("*")
          .eq("user_id", userId)
          .eq("date", today)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("mood_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      setLatestMoodLog(todayResult.data?.[0] ?? null);
      setLogCount(countResult.count ?? 0);
    } catch {
      // Non-critical — todayState will fall back to phase-only
      setLatestMoodLog(null);
      setLogCount(0);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // refreshTodayState — called by Mood page after save.
  // Re-fetches today's mood log so TodayState recomputes immediately.
  // ─────────────────────────────────────────────────────────────────────────

  const refreshTodayState = useCallback(async () => {
    if (!user) return;
    await loadMoodData(user.id);
  }, [user, loadMoodData]);

  // ─────────────────────────────────────────────────────────────────────────
  // EXISTING PROFILE LOGIC (unchanged)
  // ─────────────────────────────────────────────────────────────────────────

  const dismissNewCyclePrompt = useCallback(() => setNewCyclePrompt(false), []);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).limit(1);
      const p = data?.[0] ?? null;
      setProfile(p);

      if (p?.period_start_date) {
        const cycleLength = p.cycle_length ?? 28;
        const computed = calcCycleDayFromDate(p.period_start_date, cycleLength);

        if (computed > cycleLength) {
          setNewCyclePrompt(true);
        }

        if (computed !== p.cycle_day) {
          supabase.from("profiles")
            .update({ cycle_day: computed, updated_at: new Date().toISOString() })
            .eq("id", userId)
            .then(() => setProfile(prev => prev ? { ...prev, cycle_day: computed } : prev));
        }
      }

      // Load mood data after profile is ready
      await loadMoodData(userId);
    } catch {
      setProfile(null);
    }
  }, [loadMoodData]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user.id);
  }, [user, loadProfile]);

  const setPeriodStartToday = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    setManualCycleDay(null);
    setNewCyclePrompt(false);
    setProfile(prev => prev ? { ...prev, period_start_date: today, cycle_day: 1 } : prev);

    // Update profile — existing behaviour
    await supabase.from("profiles").update({
      period_start_date: today, cycle_day: 1, updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    // Record cycle start in history — ON CONFLICT DO NOTHING prevents duplicates
    // if the user taps "Day 1" multiple times on the same date
    await supabase.from("user_cycle_history").upsert([{
      user_id:                user.id,
      cycle_start_date:       today,
      cycle_length_at_start:  profile?.cycle_length  ?? 28,
      period_length_at_start: profile?.period_length ?? 5,
      source:                 "manual_set",
    }], { onConflict: "user_id,cycle_start_date", ignoreDuplicates: true });
  }, [user, profile?.cycle_length, profile?.period_length]);

  const setPeriodStartDate = useCallback(async (date: string) => {
    if (!user) return;
    setManualCycleDay(null);
    setNewCyclePrompt(false);
    setProfile(prev => prev ? { ...prev, period_start_date: date, cycle_day: 1 } : prev);

    // Update profile — existing behaviour
    await supabase.from("profiles").update({
      period_start_date: date, cycle_day: 1, updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    // Record cycle start in history — ON CONFLICT DO NOTHING prevents duplicates
    // if the user selects the same date from the calendar more than once
    await supabase.from("user_cycle_history").upsert([{
      user_id:                user.id,
      cycle_start_date:       date,
      cycle_length_at_start:  profile?.cycle_length  ?? 28,
      period_length_at_start: profile?.period_length ?? 5,
      source:                 "manual_set",
    }], { onConflict: "user_id,cycle_start_date", ignoreDuplicates: true });
  }, [user, profile?.cycle_length, profile?.period_length]);

  const setCycleDay = useCallback((day: number) => {
    setManualCycleDay(day);
    setProfile(prev => prev ? { ...prev, cycle_day: day } : prev);
  }, []);

  const [pendingDay, setPendingDay] = useState<number | null>(null);
  const setCycleDayAndSave = useCallback(
    (day: number) => { setCycleDay(day); setPendingDay(day); },
    [setCycleDay]
  );

  useEffect(() => {
    if (pendingDay === null || !user) return;
    const timer = setTimeout(() => {
      supabase.from("profiles").update({
        cycle_day: pendingDay, updated_at: new Date().toISOString(),
      }).eq("id", user.id);
      setPendingDay(null);
    }, 600);
    return () => clearTimeout(timer);
  }, [pendingDay, user]);

  // ─────────────────────────────────────────────────────────────────────────
  // AUTH STATE LISTENER (unchanged)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let profileTimer: ReturnType<typeof setTimeout>;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (u) profileTimer = setTimeout(() => loadProfile(u.id), 0);
      else {
        setProfile(null);
        setLatestMoodLog(null);
        setLogCount(0);
      }
    });
    return () => { subscription.unsubscribe(); clearTimeout(profileTimer); };
  }, [loadProfile]);

  // ─────────────────────────────────────────────────────────────────────────
  // PROVIDER VALUE
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AppContext.Provider value={{
      // Existing
      user, profile, cycleDay, cycleParams, loading,
      newCyclePrompt, dismissNewCyclePrompt,
      setCycleDay: setCycleDayAndSave,
      setPeriodStartToday, setPeriodStartDate, refreshProfile,
      // New
      todayState,
      latestMoodLog,
      logCount,
      refreshTodayState,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }
