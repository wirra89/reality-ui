"use client";

// context/AppContext.tsx
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase, type Profile } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { calcCycleDayFromDate, type CycleParams } from "@/lib/cycle";

interface AppContextValue {
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
}

const AppContext = createContext<AppContextValue>({
  user: null, profile: null, cycleDay: 8, cycleParams: {}, loading: true,
  newCyclePrompt: false, dismissNewCyclePrompt: () => {},
  setCycleDay: () => {}, setPeriodStartToday: async () => {},
  setPeriodStartDate: async () => {}, refreshProfile: async () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualCycleDay, setManualCycleDay] = useState<number | null>(null);
  const [newCyclePrompt, setNewCyclePrompt] = useState(false);

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

  const dismissNewCyclePrompt = useCallback(() => setNewCyclePrompt(false), []);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).limit(1);
      const p = data?.[0] ?? null;
      setProfile(p);

      if (p?.period_start_date) {
        const cycleLength = p.cycle_length ?? 28;
        const computed = calcCycleDayFromDate(p.period_start_date, cycleLength);

        // If we've gone past the expected cycle length, prompt user to start new cycle
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
    } catch {
      setProfile(null);
    }
  }, []);

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
    await supabase.from("profiles").update({ period_start_date: today, cycle_day: 1, updated_at: new Date().toISOString() }).eq("id", user.id);
  }, [user]);

  const setPeriodStartDate = useCallback(async (date: string) => {
    if (!user) return;
    setManualCycleDay(null);
    setNewCyclePrompt(false);
    setProfile(prev => prev ? { ...prev, period_start_date: date, cycle_day: 1 } : prev);
    await supabase.from("profiles").update({ period_start_date: date, cycle_day: 1, updated_at: new Date().toISOString() }).eq("id", user.id);
  }, [user]);

  const setCycleDay = useCallback((day: number) => {
    setManualCycleDay(day);
    setProfile(prev => prev ? { ...prev, cycle_day: day } : prev);
  }, []);

  const [pendingDay, setPendingDay] = useState<number | null>(null);
  const setCycleDayAndSave = useCallback((day: number) => { setCycleDay(day); setPendingDay(day); }, [setCycleDay]);

  useEffect(() => {
    if (pendingDay === null || !user) return;
    const timer = setTimeout(() => {
      supabase.from("profiles").update({ cycle_day: pendingDay, updated_at: new Date().toISOString() }).eq("id", user.id);
      setPendingDay(null);
    }, 600);
    return () => clearTimeout(timer);
  }, [pendingDay, user]);

  useEffect(() => {
    let profileTimer: ReturnType<typeof setTimeout>;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (u) profileTimer = setTimeout(() => loadProfile(u.id), 0);
      else setProfile(null);
    });
    return () => { subscription.unsubscribe(); clearTimeout(profileTimer); };
  }, [loadProfile]);

  return (
    <AppContext.Provider value={{ user, profile, cycleDay, cycleParams, loading, newCyclePrompt, dismissNewCyclePrompt, setCycleDay: setCycleDayAndSave, setPeriodStartToday, setPeriodStartDate, refreshProfile }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }
