// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Types ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  cycle_day: number;
  cycle_length: number;
  period_length: number;
  ovulation_length?: number;
  goals: string[];
  units: "kg" | "lbs";
  notifications: boolean;
  avatar_index: number;
  avatar_url?: string;       // uploaded photo URL
  period_start_date?: string;
  // Body metrics
  height_cm?: number;
  weight_kg?: number;
  age?: number;
  activity_level?: string;
  body_goal?: string;
  calculated_calories?: number;
  calculated_protein?: number;
  calculated_carbs?: number;
  calculated_fats?: number;
}

export interface WorkoutExercise {
  name: string;
  sets: { reps: string; weight: string }[];
}

export interface Workout {
  id?: number;
  created_at?: string;
  name: string;
  cycle_day: number;
  phase: string;
  exercises: WorkoutExercise[];
}

export interface MealEntry {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  time: string;
  mealType: string;
}

export interface MealLog {
  id?: number;
  date?: string;
  cycle_day: number;
  phase: string;
  meals: MealEntry[];
}

export interface MoodLog {
  id?: number;
  date?: string;
  cycle_day: number;
  phase: string;
  mood: number;
  energy: number;
  symptoms: string[];
  note: string;
  sleep_hours?: number;
  sleep_quality?: number;
  cravings?: string[];   // added in migration add_cravings_to_mood_logs
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, name: string) {
  return supabase.auth.signUp({ email, password, options: { data: { name } } });
}

export async function signInWithGoogle() {
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}`
    : `${window.location.origin}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://herphase-eta.vercel.app"}/auth`,
  });
}

export async function getUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

// ── Profile ────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<Profile | null> {
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data ?? null;
}

export async function saveProfile(updates: Partial<Profile>, userId?: string): Promise<{ success: boolean; error?: string }> {
  let uid = userId;
  if (!uid) {
    const { data: { session } } = await supabase.auth.getSession();
    uid = session?.user?.id;
  }
  if (!uid) return { success: false, error: "Not logged in" };
  const { error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", uid);
  return error ? { success: false, error: error.message } : { success: true };
}

// ── Cycle log (existing table) ─────────────────────────────────────────────

export async function saveCycleLog(cycleDay: number, phase: string) {
  const { error } = await supabase.from("cycle_logs").insert([{ cycle_day: cycleDay, phase }]);
  return error ? { success: false, error: error.message } : { success: true };
}

// ── Workouts ───────────────────────────────────────────────────────────────

export async function saveWorkout(workout: Workout): Promise<{ success: boolean; error?: string; id?: number }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not logged in" };
  const { data, error } = await supabase.from("workouts").insert([{ ...workout, user_id: user.id }]).select("id").single();
  return error ? { success: false, error: error.message } : { success: true, id: data?.id };
}

export async function updateWorkout(id: number, workout: Workout): Promise<{ success: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not logged in" };
  const { error } = await supabase.from("workouts")
    .update({ ...workout, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", user.id);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function getTodayWorkout(cycleDay: number): Promise<(Workout & { id: number }) | null> {
  const user = await getUser();
  if (!user) return null;
  const today = new Date().toISOString().split("T")[0];
  // Filter by today's date only — cycle_day can repeat across cycles
  const { data } = await supabase.from("workouts")
    .select("*").eq("user_id", user.id)
    .gte("created_at", today + "T00:00:00.000Z")
    .lt("created_at",  today + "T23:59:59.999Z")
    .order("created_at", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

export async function getRecentWorkouts(limit = 10): Promise<Workout[]> {
  const user = await getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("workouts").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}

// ── Meals ──────────────────────────────────────────────────────────────────

export async function saveMealLog(log: MealLog): Promise<{ success: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not logged in" };
  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("meal_logs").upsert({
    user_id: user.id,
    date: today,
    cycle_day: log.cycle_day,
    phase: log.phase,
    meals: log.meals,
    sleep_hours: (log as any).sleep_hours ?? null,
    sleep_quality: (log as any).sleep_quality ?? null,
  }, { onConflict: "user_id,date" });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function getTodayMealLog(cycleDay?: number): Promise<MealLog | null> {
  const user = await getUser();
  if (!user) return null;

  let query = supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", user.id);

  // If cycleDay provided, fetch by cycle_day; otherwise fetch today's date
  if (cycleDay !== undefined) {
    query = query.eq("cycle_day", cycleDay);
  } else {
    const today = new Date().toISOString().split("T")[0];
    query = query.eq("date", today);
  }

  const { data } = await query.order("created_at", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

// ── Mood ───────────────────────────────────────────────────────────────────

export async function saveMoodLog(log: MoodLog): Promise<{ success: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not logged in" };
  const today = new Date().toISOString().split("T")[0];

  // Delete existing log for this specific cycle_day
  await supabase
    .from("mood_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("cycle_day", log.cycle_day);

  const { error } = await supabase.from("mood_logs").insert([{
    user_id: user.id,
    date: today,
    cycle_day: log.cycle_day,
    phase: log.phase,
    mood: log.mood,
    energy: log.energy,
    symptoms: log.symptoms,
    note: log.note,
    sleep_hours: log.sleep_hours ?? null,
    sleep_quality: log.sleep_quality ?? null,
    cravings: log.cravings ?? [],
  }]);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function getTodayMoodLog(cycleDay?: number): Promise<MoodLog | null> {
  const user = await getUser();
  if (!user) return null;

  let query = supabase
    .from("mood_logs")
    .select("*")
    .eq("user_id", user.id);

  if (cycleDay !== undefined) {
    query = query.eq("cycle_day", cycleDay);
  } else {
    const today = new Date().toISOString().split("T")[0];
    query = query.eq("date", today);
  }

  const { data } = await query.order("created_at", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

// ── Workout Templates ──────────────────────────────────────────────────────

export interface WorkoutTemplate {
  id?: number;
  created_at?: string;
  name: string;
  phase: string;
  exercises: WorkoutExercise[];
}

export async function saveWorkoutTemplate(template: WorkoutTemplate): Promise<{ success: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not logged in" };
  const { error } = await supabase.from("workout_templates").insert([{ ...template, user_id: user.id }]);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function getWorkoutTemplates(): Promise<WorkoutTemplate[]> {
  const user = await getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("workout_templates").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(20);
  return data ?? [];
}

export async function deleteWorkoutTemplate(id: number): Promise<{ success: boolean }> {
  const user = await getUser();
  if (!user) return { success: false };
  const { error } = await supabase.from("workout_templates").delete().eq("id", id).eq("user_id", user.id);
  return { success: !error };
}

// ── Streak ─────────────────────────────────────────────────────────────────

export async function getCheckinStreak(): Promise<number> {
  const user = await getUser();
  if (!user) return 0;
  const { data } = await supabase
    .from("mood_logs").select("date").eq("user_id", user.id)
    .order("date", { ascending: false }).limit(60);
  if (!data || data.length === 0) return 0;
  // Deduplicate dates without spread Set (TS target compatibility)
  const dates = data.map((d: { date: string }) => d.date).filter((v, i, arr) => arr.indexOf(v) === i);
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  // If neither today nor yesterday has a log, streak is 0
  if (!dates.includes(today) && !dates.includes(yesterday)) return 0;
  // Start counting from today or yesterday
  let streak = 0;
  let check = new Date(dates.includes(today) ? today : yesterday);
  for (let i = 0; i < 62; i++) {
    const ds = check.toISOString().split("T")[0];
    if (dates.includes(ds)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ── Weight Logs ────────────────────────────────────────────────────────────

export interface WeightLog {
  id?: number;
  date: string;
  weight_kg: number;
  note?: string;
}

export async function saveWeightLog(weightKg: number, note = ""): Promise<{ success: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not logged in" };
  const today = new Date().toISOString().split("T")[0];
  // Delete today's existing entry first (one per day)
  await supabase.from("weight_logs").delete().eq("user_id", user.id).eq("date", today);
  const { error } = await supabase.from("weight_logs").insert([{
    user_id: user.id, date: today, weight_kg: weightKg, note,
  }]);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function getWeightLogs(limit = 60): Promise<WeightLog[]> {
  const user = await getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("weight_logs").select("*").eq("user_id", user.id)
    .order("date", { ascending: true }).limit(limit);
  return data ?? [];
}

// ── Readiness from mood ────────────────────────────────────────────────────

export async function getYesterdayMoodLog(): Promise<MoodLog | null> {
  const user = await getUser();
  if (!user) return null;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];
  const { data } = await supabase
    .from("mood_logs").select("*").eq("user_id", user.id).eq("date", dateStr).limit(1);
  return data?.[0] ?? null;
}

// ── Custom Meals ───────────────────────────────────────────────────────────

export interface CustomMeal {
  id?: number;
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients?: { name: string; emoji: string; grams: number }[];
}

export async function getCustomMeals(): Promise<CustomMeal[]> {
  const user = await getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("custom_meals").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function saveCustomMeal(meal: CustomMeal): Promise<{ success: boolean; id?: number }> {
  const user = await getUser();
  if (!user) return { success: false };
  const { data, error } = await supabase.from("custom_meals")
    .insert([{ ...meal, user_id: user.id }]).select("id").single();
  return error ? { success: false } : { success: true, id: data?.id };
}

export async function deleteCustomMeal(id: number): Promise<void> {
  const user = await getUser();
  if (!user) return;
  await supabase.from("custom_meals").delete().eq("id", id).eq("user_id", user.id);
}

// ── Personal Records ───────────────────────────────────────────────────────

export interface PersonalRecord {
  id?: number;
  exercise: string;
  reps: number;
  weight: number;
  notes?: string;
  phase?: string;
  cycle_day?: number;
  logged_at?: string;
}

export async function savePR(pr: PersonalRecord): Promise<{ success: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not logged in" };
  const { error } = await supabase.from("personal_records").insert([{
    user_id: user.id,
    exercise: pr.exercise,
    reps: pr.reps,
    weight: pr.weight,
    notes: pr.notes ?? null,
    phase: pr.phase ?? null,
    cycle_day: pr.cycle_day ?? null,
    logged_at: new Date().toISOString().split("T")[0],
  }]);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function getPRs(exerciseName?: string): Promise<PersonalRecord[]> {
  const user = await getUser();
  if (!user) return [];
  let q = supabase
    .from("personal_records")
    .select("*")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false });
  if (exerciseName) q = q.ilike("exercise", `%${exerciseName}%`);
  const { data } = await q.limit(100);
  return data ?? [];
}

export async function getBestPRPerExercise(): Promise<PersonalRecord[]> {
  const user = await getUser();
  if (!user) return [];
  // Get all PRs then derive bests client-side (simpler than complex SQL)
  const { data } = await supabase
    .from("personal_records")
    .select("*")
    .eq("user_id", user.id)
    .order("weight", { ascending: false });
  if (!data) return [];
  // Keep highest weight per exercise
  const best: Record<string, PersonalRecord> = {};
  for (const pr of data) {
    const key = pr.exercise.toLowerCase();
    if (!best[key] || pr.weight > best[key].weight!) {
      best[key] = pr;
    }
  }
  return Object.values(best).sort((a, b) => (a.exercise > b.exercise ? 1 : -1));
}

export async function deletePR(id: number): Promise<void> {
  const user = await getUser();
  if (!user) return;
  await supabase.from("personal_records").delete().eq("id", id).eq("user_id", user.id);
}
