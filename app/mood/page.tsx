"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/mood/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getPhaseData } from "@/lib/cycle";
import { saveMoodLog, getTodayMoodLog } from "@/lib/supabase";

const moods = [
  { emoji: "😣", label: "Rough", value: 1 },
  { emoji: "😔", label: "Low",   value: 2 },
  { emoji: "😐", label: "Okay",  value: 3 },
  { emoji: "🙂", label: "Good",  value: 4 },
  { emoji: "😄", label: "Great", value: 5 },
];

const energyLevels = ["Exhausted", "Tired", "Moderate", "Energised", "Peak"];

const phaseSymptoms: Record<string, { positive: string[]; negative: string[] }> = {
  menstrual: {
    positive: ["Introspective", "Calm", "Restful sleep", "Emotional clarity", "Craving healthy food"],
    negative: ["Cramps", "Bloating", "Headache", "Fatigue", "Mood swings", "Back pain", "Nausea", "Low energy"],
  },
  follicular: {
    positive: ["High energy", "Creative", "Motivated", "Sociable", "Confident", "Clear-headed", "Strong in gym"],
    negative: ["Mild bloating", "Restlessness", "Appetite changes", "Light headache", "Skin breakout"],
  },
  ovulation: {
    positive: ["Peak energy", "Confident", "Attractive feeling", "Strong libido", "Sharp focus", "PR in gym", "Social butterfly"],
    negative: ["Mild cramps", "Breast tenderness", "Bloating", "Mood swings", "Headache", "Ovulation pain"],
  },
  luteal: {
    positive: ["Productive", "Detail-oriented", "Nesting energy", "Emotional depth", "Intuitive"],
    negative: ["PMS", "Cravings", "Bloating", "Breast tenderness", "Brain fog", "Anxiety", "Insomnia", "Irritability", "Water retention"],
  },
};

// ── Craving → nutrient → food map — fully phase-aware ─────────────────────
const cravings: {
  id: string; emoji: string; label: string; nutrient: string;
  phases: Record<string, { reason: string; foods: { emoji: string; name: string }[] }>;
}[] = [
  {
    id: "sweet", emoji: "🍫", label: "Sweet", nutrient: "Magnesium",
    phases: {
      menstrual:  { reason: "Iron and magnesium are both low right now — your period depletes both. Dark chocolate actually covers both at once. This craving is your body being precise.", foods: [{ emoji: "🍫", name: "Dark chocolate (70%+)" }, { emoji: "🍌", name: "Banana" }, { emoji: "🥬", name: "Spinach" }, { emoji: "🫘", name: "Lentils" }] },
      follicular: { reason: "Sweet cravings in follicular are usually habit or blood sugar dips rather than a deficiency — your hormones are rising and energy is good. Stabilise with complex carbs instead of sugar.", foods: [{ emoji: "🍓", name: "Fresh berries" }, { emoji: "🍌", name: "Banana" }, { emoji: "🌾", name: "Oats with honey" }, { emoji: "🍠", name: "Sweet potato" }] },
      ovulation:  { reason: "Sweet cravings at peak are usually driven by high energy output. Your metabolism is at its fastest — you need fuel, not sugar. Complex carbs will satisfy it longer.", foods: [{ emoji: "🍌", name: "Banana" }, { emoji: "🍚", name: "Brown rice" }, { emoji: "🥭", name: "Mango" }, { emoji: "🫐", name: "Blueberries" }] },
      luteal:     { reason: "Progesterone is at its peak right now — this directly depletes magnesium, which drives sugar cravings. Your body isn't weak. It's asking for magnesium, not sugar. This is genuinely medicinal.", foods: [{ emoji: "🍫", name: "Dark chocolate (70%+)" }, { emoji: "🌰", name: "Almonds" }, { emoji: "🍠", name: "Sweet potato" }, { emoji: "🎃", name: "Pumpkin seeds" }] },
    },
  },
  {
    id: "salty", emoji: "🧂", label: "Salty", nutrient: "Electrolytes",
    phases: {
      menstrual:  { reason: "You're losing sodium and electrolytes through bleeding and inflammation. Salt cravings right now are your body being smart — it genuinely needs rebalancing.", foods: [{ emoji: "🫒", name: "Olives" }, { emoji: "🥬", name: "Leafy greens" }, { emoji: "🥑", name: "Avocado" }, { emoji: "🐟", name: "Salmon" }] },
      follicular: { reason: "Salty cravings in follicular are uncommon and usually signal dehydration or under-eating. Drink water first — if the craving persists, add healthy sodium sources.", foods: [{ emoji: "🥜", name: "Mixed nuts" }, { emoji: "🫒", name: "Olives" }, { emoji: "🧀", name: "Feta cheese" }, { emoji: "🥬", name: "Seaweed snack" }] },
      ovulation:  { reason: "High oestrogen increases fluid retention slightly. If you're craving salt during ovulation, you may be sweating more during workouts. Replenish with whole food sources, not processed salt.", foods: [{ emoji: "🥑", name: "Avocado" }, { emoji: "🫒", name: "Olives" }, { emoji: "🥒", name: "Pickles" }, { emoji: "🌿", name: "Celery with nut butter" }] },
      luteal:     { reason: "Progesterone causes fluid shifts and disrupts electrolyte balance — especially sodium and potassium. Your body is compensating. Focus on potassium alongside sodium.", foods: [{ emoji: "🥑", name: "Avocado" }, { emoji: "🍌", name: "Banana" }, { emoji: "🥜", name: "Mixed nuts" }, { emoji: "🫒", name: "Olives" }] },
    },
  },
  {
    id: "fatty", emoji: "🍟", label: "Fatty", nutrient: "Omega-3 & healthy fats",
    phases: {
      menstrual:  { reason: "Omega-3 directly reduces prostaglandins — the chemicals causing your cramps. This craving is your body trying to reduce its own inflammation. Honour it with the right fats.", foods: [{ emoji: "🐟", name: "Salmon or sardines" }, { emoji: "🌰", name: "Walnuts" }, { emoji: "🥑", name: "Avocado" }, { emoji: "🫙", name: "Flaxseed oil" }] },
      follicular: { reason: "Fat cravings in follicular support the rising oestrogen production — hormones are made from fats. Your body is building up for ovulation. Focus on unsaturated fats.", foods: [{ emoji: "🥚", name: "Eggs" }, { emoji: "🥑", name: "Avocado" }, { emoji: "🌰", name: "Walnuts" }, { emoji: "🫙", name: "Olive oil" }] },
      ovulation:  { reason: "Peak oestrogen increases anti-inflammatory needs. Omega-3 supports hormone clearance and reduces ovulation inflammation. Your body is preparing for the luteal phase.", foods: [{ emoji: "🐟", name: "Salmon" }, { emoji: "🫐", name: "Blueberries + nuts" }, { emoji: "🥑", name: "Avocado" }, { emoji: "🌿", name: "Chia seeds" }] },
      luteal:     { reason: "Healthy fats in luteal help absorb fat-soluble vitamins (A, D, E, K) and support progesterone production. They also slow sugar absorption, reducing cravings later.", foods: [{ emoji: "🥑", name: "Avocado" }, { emoji: "🐟", name: "Salmon" }, { emoji: "🌰", name: "Walnuts" }, { emoji: "🫙", name: "Extra virgin olive oil" }] },
    },
  },
  {
    id: "carbs", emoji: "🍞", label: "Carbs", nutrient: "Serotonin precursors",
    phases: {
      menstrual:  { reason: "Oestrogen is at its lowest and serotonin drops with it. Your energy is low and blood sugar needs stabilising. Complex carbs every 3-4 hours is the best thing you can do right now.", foods: [{ emoji: "🌾", name: "Oats with banana" }, { emoji: "🍠", name: "Sweet potato" }, { emoji: "🫘", name: "Lentil soup" }, { emoji: "🥣", name: "Brown rice" }] },
      follicular: { reason: "Rising oestrogen means your insulin sensitivity is improving — your body uses carbs very efficiently right now. Carb cravings in follicular are usually for energy to fuel workouts.", foods: [{ emoji: "🍌", name: "Banana before training" }, { emoji: "🍚", name: "Brown rice" }, { emoji: "🌾", name: "Oats" }, { emoji: "🥖", name: "Sourdough" }] },
      ovulation:  { reason: "Your metabolism is fastest at ovulation. Carb cravings here mean your body is burning through fuel quickly. Carb-load before training — you'll use it all.", foods: [{ emoji: "🍌", name: "Banana" }, { emoji: "🍚", name: "Rice" }, { emoji: "🌾", name: "Oats" }, { emoji: "🥔", name: "Potato" }] },
      luteal:     { reason: "Progesterone raises your metabolic rate by up to 300 kcal/day — you genuinely need more fuel. Serotonin also drops, and carbs directly trigger tryptophan release (the serotonin precursor). Eat complex carbs every 3-4 hours to prevent mood crashes.", foods: [{ emoji: "🍠", name: "Sweet potato" }, { emoji: "🌾", name: "Oats" }, { emoji: "🫘", name: "Lentils" }, { emoji: "🍚", name: "Brown rice" }] },
    },
  },
  {
    id: "dairy", emoji: "🧀", label: "Dairy", nutrient: "Calcium & tryptophan",
    phases: {
      menstrual:  { reason: "Calcium helps relax uterine muscle contractions — literally reducing cramps. Fermented dairy like kefir and yogurt also support gut health, which affects how you process inflammation.", foods: [{ emoji: "🥛", name: "Warm milk with honey" }, { emoji: "🫙", name: "Greek yogurt" }, { emoji: "🧀", name: "Feta or goat cheese" }, { emoji: "🥛", name: "Kefir" }] },
      follicular: { reason: "Fermented dairy supports the gut microbiome that processes oestrogen. A healthy gut in follicular means more balanced oestrogen — directly affecting your energy and mood going forward.", foods: [{ emoji: "🫙", name: "Greek yogurt with berries" }, { emoji: "🥛", name: "Kefir" }, { emoji: "🧀", name: "Cottage cheese" }, { emoji: "🥚", name: "Eggs" }] },
      ovulation:  { reason: "Calcium-rich foods support bone density, which is best absorbed when oestrogen is high — exactly now. Your gut is also most efficient at ovulation, maximising dairy's benefits.", foods: [{ emoji: "🫙", name: "Greek yogurt" }, { emoji: "🧀", name: "Aged cheese" }, { emoji: "🥛", name: "Kefir" }, { emoji: "🌿", name: "Sesame seeds" }] },
      luteal:     { reason: "Studies show calcium supplementation reduces PMS severity by up to 50%. Tryptophan in dairy is also a direct serotonin precursor — your body is asking for a mood boost via the most efficient pathway.", foods: [{ emoji: "🧀", name: "Aged cheese" }, { emoji: "🫙", name: "Greek yogurt" }, { emoji: "🥛", name: "Warm milk" }, { emoji: "🥚", name: "Eggs" }] },
    },
  },
  {
    id: "meat", emoji: "🥩", label: "Meat", nutrient: "Iron & B12",
    phases: {
      menstrual:  { reason: "You are losing iron right now through bleeding. Protein cravings during your period are your body being biologically precise. Red meat is the most bioavailable source of haem iron you can eat.", foods: [{ emoji: "🥩", name: "Red meat (beef, lamb)" }, { emoji: "🫘", name: "Lentils + vitamin C" }, { emoji: "🥚", name: "Eggs" }, { emoji: "🌿", name: "Spirulina" }] },
      follicular: { reason: "Rising oestrogen increases muscle protein synthesis — your body uses protein more efficiently this week than any other. This craving is your body preparing for optimal gains.", foods: [{ emoji: "🍗", name: "Chicken breast" }, { emoji: "🥚", name: "Eggs" }, { emoji: "🐟", name: "White fish" }, { emoji: "🫘", name: "Beans and legumes" }] },
      ovulation:  { reason: "At peak, your body is primed for muscle building. Protein within 30 minutes after training is especially effective right now. Testosterone briefly peaks — maximise it with adequate protein.", foods: [{ emoji: "🥩", name: "Lean red meat" }, { emoji: "🍗", name: "Chicken" }, { emoji: "🐟", name: "Salmon" }, { emoji: "🫘", name: "Chickpeas" }] },
      luteal:     { reason: "Progesterone increases protein breakdown slightly. Your muscles need more protein to maintain mass during the luteal phase. Turkey and eggs also provide tryptophan for serotonin production.", foods: [{ emoji: "🦃", name: "Turkey" }, { emoji: "🥚", name: "Eggs" }, { emoji: "🐟", name: "Salmon" }, { emoji: "🫘", name: "Lentils" }] },
    },
  },
  {
    id: "sour", emoji: "🍋", label: "Sour",
    nutrient: "Vitamin C & digestive enzymes",
    phases: {
      menstrual:  { reason: "Sour cravings during your period often signal your body wants vitamin C — which triples iron absorption from plant foods. Lemon, citrus and fermented foods are ideal. Your gut is also more sensitive now, and sour foods stimulate digestive enzymes that ease bloating.", foods: [{ emoji: "🍋", name: "Lemon water" }, { emoji: "🍊", name: "Orange" }, { emoji: "🫙", name: "Sauerkraut" }, { emoji: "🥝", name: "Kiwi" }] },
      follicular: { reason: "Sour cravings in follicular are often gut-driven — your microbiome is most active now. Fermented sour foods like kefir and kombucha directly support oestrogen metabolism, improving how you'll feel in the next luteal phase.", foods: [{ emoji: "🥛", name: "Kefir" }, { emoji: "🫙", name: "Kimchi" }, { emoji: "🍋", name: "Lemon in water" }, { emoji: "🫙", name: "Kombucha" }] },
      ovulation:  { reason: "At peak, your liver is working hard to metabolise high oestrogen. Sour and citrus foods stimulate liver enzymes that clear excess oestrogen — helping prevent the hormonal hangover that starts luteal phase.", foods: [{ emoji: "🍋", name: "Lemon water" }, { emoji: "🥒", name: "Pickles" }, { emoji: "🍊", name: "Grapefruit" }, { emoji: "🫙", name: "Apple cider vinegar" }] },
      luteal:     { reason: "Sour cravings in luteal are usually a digestive signal — progesterone slows gut motility, causing bloating and discomfort. Fermented sour foods introduce probiotics that directly counteract this. Apple cider vinegar before meals improves digestion significantly.", foods: [{ emoji: "🫙", name: "Sauerkraut" }, { emoji: "🥒", name: "Pickles" }, { emoji: "🫙", name: "Apple cider vinegar" }, { emoji: "🍋", name: "Lemon water" }] },
    },
  },
  {
    id: "junk", emoji: "🍕", label: "Junk Food",
    nutrient: "Dopamine & stress hormones",
    phases: {
      menstrual:  { reason: "Junk food cravings during your period are driven by low dopamine and serotonin — both drop when oestrogen crashes. Your brain is seeking a fast reward hit. The problem is the crash that follows makes everything worse. Satisfy the craving with foods that actually raise dopamine without the crash.", foods: [{ emoji: "🍫", name: "Dark chocolate" }, { emoji: "🥜", name: "Peanut butter on rice cake" }, { emoji: "🍠", name: "Sweet potato fries (baked)" }, { emoji: "🧀", name: "Cheese + wholegrain crackers" }] },
      follicular: { reason: "Junk food cravings in follicular are unusual — your dopamine and energy are naturally rising. This usually points to habit, dehydration, or under-eating. Drink water first. If the craving persists, your calorie intake is probably too low for your increasing activity level.", foods: [{ emoji: "💧", name: "Water first" }, { emoji: "🥜", name: "Trail mix" }, { emoji: "🍌", name: "Banana + nut butter" }, { emoji: "🧀", name: "Cheese + fruit" }] },
      ovulation:  { reason: "Junk food cravings at peak are almost always habit or stress-triggered rather than hormonal. Your hormones are optimal right now. If you're craving junk food, check your stress levels — cortisol triggers dopamine-seeking behaviour regardless of hormone phase.", foods: [{ emoji: "🥑", name: "Guacamole + veg sticks" }, { emoji: "🫙", name: "Hummus + pitta" }, { emoji: "🍿", name: "Air-popped popcorn" }, { emoji: "🥜", name: "Mixed nuts" }] },
      luteal:     { reason: "Junk food cravings in luteal are the most powerful in your cycle — and the most understood. Progesterone raises cortisol, drops serotonin, and spikes dopamine-seeking behaviour all at once. Your brain is genuinely under stress. Satisfy it with high-reward whole foods that hit the same pathways without the inflammatory aftermath.", foods: [{ emoji: "🍫", name: "Dark chocolate (70%+)" }, { emoji: "🍕", name: "Homemade pizza on pitta" }, { emoji: "🥔", name: "Baked potato with toppings" }, { emoji: "🌯", name: "Burrito bowl (home)" }] },
    },
  },
];


// ── Message bank — rotates by cycleDay within phase ──────────────────────
const PHASE_STARTS: Record<string, number> = {
  menstrual: 1, follicular: 6, ovulation: 14, luteal: 17,
};

const moodMessages: Record<string, { category: string; message: string }[]> = {
  menstrual: [
    { category: "Affirmation", message: "Rest is productive. Your body is doing powerful work right now. 🌙" },
    { category: "Mindset",     message: "You don't have to earn rest. Slowing down is part of the process, not a step back." },
    { category: "Science",     message: "Your oestrogen and progesterone are at their lowest today. Low mood is hormonal — it's not you, it's chemistry." },
    { category: "Compassion",  message: "Notice what your body needs today and give it exactly that. No guilt, no negotiations." },
    { category: "Closing",     message: "The hardest phase of your cycle is almost done. Oestrogen starts rising tomorrow. 🌱" },
  ],
  follicular: [
    { category: "Motivation",  message: "You're building momentum. Every rep, every meal, every good habit you build now compounds forward. 🌱" },
    { category: "Science",     message: "Rising oestrogen is sharpening your focus and lifting your mood. This isn't luck — your biology is working for you." },
    { category: "Energy",      message: "Notice how your capacity has expanded from last week? That's the follicular shift. Use it intentionally." },
    { category: "Inspiration", message: "This is the phase where new habits stick. Whatever you start this week has the best chance of lasting." },
  ],
  ovulation: [
    { category: "Peak",        message: "You are at your peak. Physically, mentally, hormonally. Go after exactly what you want today. ⚡" },
    { category: "Science",     message: "Your testosterone briefly peaks today alongside oestrogen. You are literally at your strongest. This is rare — use it." },
    { category: "Social",      message: "You'll feel more confident and charismatic today than almost any other day in your cycle. Say yes to the things that matter." },
  ],
  luteal: [
    { category: "Consistency", message: "Consistency beats intensity. Showing up today — even at 70% — is what separates progress from stagnation. 🍂" },
    { category: "Science",     message: "Progesterone is rising and your temperature is higher. Feeling slower is physiological — it's not a reflection of your effort or worth." },
    { category: "Cravings",    message: "If cravings are loud today, that's progesterone raising your metabolic rate. You genuinely need more fuel. Eat the complex carbs." },
    { category: "Magnesium",   message: "Anxiety and poor sleep this week are often magnesium deficiency in disguise. Dark chocolate, almonds, and spinach are your allies right now." },
    { category: "Reframe",     message: "Luteal phase brings a quieter, more focused energy. You're not less — you're different. Detail work, deep thinking, and introspection thrive here." },
    { category: "Compassion",  message: "The irritability and emotional sensitivity this week are real and hormonal. Being hard on yourself for having them only adds a second layer of suffering." },
  ],
};

export default function MoodPage() {
  const { user, cycleDay, cycleParams, loading, refreshTodayState } = useApp();
  const router = useRouter();
  const phaseData = getPhaseData(cycleDay, cycleParams);

  // Pick today's message based on day within phase
  const msgs    = moodMessages[phaseData.phase] ?? moodMessages.menstrual;
  const start   = PHASE_STARTS[phaseData.phase] ?? 1;
  const dayIdx  = Math.max(0, cycleDay - start) % msgs.length;
  const todayMsg = msgs[dayIdx];

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState(3);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [alreadyLogged, setAlreadyLogged] = useState(false);
  const [activeCraving, setActiveCraving] = useState<string | null>(null);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [sleepQuality, setSleepQuality] = useState<number>(3);

  useEffect(() => { if (!loading && !user) router.replace("/auth"); }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getTodayMoodLog(cycleDay).then((log) => {
      if (log) {
        setSelectedMood(log.mood);
        setEnergy(log.energy);
        setSelectedSymptoms(log.symptoms ?? []);
        setNote(log.note ?? "");
        setSleepHours((log as any).sleep_hours ?? 7);
        setSleepQuality((log as any).sleep_quality ?? 3);
        setAlreadyLogged(true);
      } else {
        setSelectedMood(null);
        setEnergy(3);
        setSelectedSymptoms([]);
        setNote("");
        setSleepHours(7);
        setSleepQuality(3);
        setAlreadyLogged(false);
      }
    });
  }, [user, cycleDay]);

  function toggleSymptom(s: string) {
    setSelectedSymptoms(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  }

  async function handleSave() {
    if (selectedMood === null) return;
    setSaveStatus("loading");
    const result = await saveMoodLog({
      cycle_day: cycleDay, phase: phaseData.phase,
      mood: selectedMood, energy, symptoms: selectedSymptoms, note,
      sleep_hours: sleepHours, sleep_quality: sleepQuality,
    } as any);
    setSaveStatus(result.success ? "success" : "error");
    if (result.success) {
      setAlreadyLogged(true);
      refreshTodayState(); // recompute TodayState — Dashboard updates automatically
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setTimeout(() => setSaveStatus("idle"), 2500);
  }

  if (loading || !user) return <PageSkeleton />;

  return (
    <div className="min-h-dvh bg-background">
      <div className="fixed top-0 left-0 right-0 h-48 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(196,138,151,0.15) 0%, transparent 70%)" }} />

      <main className="relative z-10 mx-auto max-w-app px-4 pt-6">
        <header className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest mb-1">Wellness</p>
            <h1 className="font-display text-2xl font-semibold text-dark">How are you feeling?</h1>
          </div>
          {alreadyLogged && <span className="text-xs text-emerald-500 font-semibold">✓ Today</span>}
        </header>

        {/* Already logged banner */}
        {alreadyLogged && (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4"
            style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}>
            <span className="text-xl flex-shrink-0">✅</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-700">Check-in logged today</p>
              <p className="text-xs text-emerald-600/70 font-body">You can update your entry below anytime.</p>
            </div>
          </div>
        )}

        {/* Daily message */}
        <div className="rounded-2xl p-4 mb-4"
          style={{ background: "linear-gradient(135deg, #2A2330, #3D3248)" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-xs font-body uppercase tracking-widest">{phaseData.phase} phase · Day {cycleDay}</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
              {todayMsg.category}
            </span>
          </div>
          <p className="text-white font-display italic text-base leading-snug">"{todayMsg.message}"</p>
          {/* Day indicator dots */}
          <div className="flex gap-1.5 mt-3">
            {msgs.map((_, i) => (
              <div key={i} className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === dayIdx ? 16 : 6,
                  background: i === dayIdx ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)",
                }} />
            ))}
          </div>
        </div>

        {/* Mood */}
        <div className="bg-white rounded-2xl p-4 shadow-card mb-3">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">Overall mood</p>
          <div className="flex justify-between">
            {moods.map((mood) => {
              const active = selectedMood === mood.value;
              return (
                <button key={mood.value} onClick={() => setSelectedMood(mood.value)}
                  className="flex flex-col items-center gap-1 transition-all active:scale-90">
                  <span className="text-3xl transition-all duration-200"
                    style={{ filter: active ? "none" : "grayscale(60%) opacity(0.5)", transform: active ? "scale(1.2)" : "scale(1)" }}>
                    {mood.emoji}
                  </span>
                  <span className="text-xs font-semibold transition-colors" style={{ color: active ? "#C48A97" : "#9CA3AF" }}>
                    {mood.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Energy */}
        <div className="bg-white rounded-2xl p-4 shadow-card mb-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide">Energy level</p>
            <span className="text-sm font-semibold text-primary">{energyLevels[energy - 1]}</span>
          </div>
          <input type="range" min={1} max={5} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="w-full" />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-dark/30">Low</span>
            <span className="text-xs text-dark/30">Peak</span>
          </div>
        </div>

        {/* Symptoms */}
        <div className="bg-white rounded-2xl p-4 shadow-card mb-3">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">
            How are you feeling physically?
          </p>

          {/* Positive symptoms */}
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399", display: "inline-block", flexShrink: 0 }}/>
            <span className="text-emerald-600">Positive</span>
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {phaseSymptoms[phaseData.phase].positive.map((s) => {
              const active = selectedSymptoms.includes(s);
              return (
                <button key={s} onClick={() => toggleSymptom(s)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
                  style={{
                    background: active ? "rgba(52,211,153,0.15)" : "#F9FAFB",
                    color: active ? "#059669" : "#6B7280",
                    border: `1px solid ${active ? "rgba(52,211,153,0.4)" : "transparent"}`,
                  }}>
                  {active ? "✓ " : ""}{s}
                </button>
              );
            })}
          </div>

          {/* Negative symptoms */}
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F87171", display: "inline-block", flexShrink: 0 }}/>
            <span className="text-rose-500">Symptoms</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {phaseSymptoms[phaseData.phase].negative.map((s) => {
              const active = selectedSymptoms.includes(s);
              return (
                <button key={s} onClick={() => toggleSymptom(s)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
                  style={{
                    background: active ? "rgba(196,138,151,0.15)" : "#F9FAFB",
                    color: active ? "#C48A97" : "#6B7280",
                    border: `1px solid ${active ? "rgba(196,138,151,0.4)" : "transparent"}`,
                  }}>
                  {active ? "✓ " : ""}{s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cravings */}
        <div className="bg-white rounded-2xl p-4 shadow-card mb-3">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-1">Any cravings today?</p>
          <p className="text-xs text-dark/30 font-body mb-3">Tap a craving to find out what your body really needs.</p>
          <div className="flex flex-wrap gap-2">
            {cravings.map((c) => {
              const active = activeCraving === c.id;
              return (
                <button key={c.id}
                  onClick={() => setActiveCraving(active ? null : c.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
                  style={{
                    background: active ? "rgba(196,138,151,0.15)" : "#F9FAFB",
                    color: active ? "#C48A97" : "#6B7280",
                    border: `1px solid ${active ? "rgba(196,138,151,0.4)" : "transparent"}`,
                  }}>
                  <span style={{ fontSize: 14 }}>{c.emoji}</span>
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Expanded craving card */}
          {activeCraving && (() => {
            const c = cravings.find(x => x.id === activeCraving)!;
            const phaseData_ = c.phases[phaseData.phase] ?? c.phases.luteal;
            return (
              <div className="mt-4 rounded-2xl overflow-hidden"
                style={{ background: "linear-gradient(135deg, #2A2330, #3D3248)" }}>
                <div className="px-4 pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span style={{ fontSize: 20 }}>{c.emoji}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">{c.label} cravings = low {c.nutrient}</p>
                      <p className="text-white/40 text-xs font-body uppercase tracking-wide">{phaseData.phase} phase · Day {cycleDay}</p>
                    </div>
                  </div>
                  <p className="text-white/65 text-xs font-body leading-relaxed mb-3">
                    {phaseData_.reason}
                  </p>
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-2">Eat this instead</p>
                  <div className="flex flex-wrap gap-2">
                    {phaseData_.foods.map((f) => (
                      <div key={f.name}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)" }}>
                        <span style={{ fontSize: 13 }}>{f.emoji}</span>
                        {f.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Sleep */}
        <div className="bg-white rounded-2xl p-4 shadow-card mb-3">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">Last night's sleep 😴</p>
          {/* Hours */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-dark/60 font-body">Hours slept</p>
            <p className="text-sm font-semibold text-dark">{sleepHours}h</p>
          </div>
          <input type="range" min={3} max={12} step={0.5} value={sleepHours}
            onChange={(e) => setSleepHours(parseFloat(e.target.value))}
            className="w-full mb-4" />
          {/* Quality */}
          <p className="text-sm text-dark/60 font-body mb-2">Sleep quality</p>
          <div className="flex justify-between gap-2">
            {[
              { value: 1, emoji: "😫", label: "Terrible" },
              { value: 2, emoji: "😔", label: "Poor" },
              { value: 3, emoji: "😐", label: "Okay" },
              { value: 4, emoji: "😊", label: "Good" },
              { value: 5, emoji: "😴", label: "Great" },
            ].map((q) => (
              <button key={q.value} onClick={() => setSleepQuality(q.value)}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all active:scale-95"
                style={{
                  background: sleepQuality === q.value ? "rgba(196,138,151,0.12)" : "#F9FAFB",
                  border: sleepQuality === q.value ? "1.5px solid rgba(196,138,151,0.4)" : "1.5px solid transparent",
                }}>
                <span className="text-xl" style={{ filter: sleepQuality === q.value ? "none" : "grayscale(60%) opacity(0.5)" }}>{q.emoji}</span>
                <span className="text-xs font-semibold" style={{ color: sleepQuality === q.value ? "#C48A97" : "#9CA3AF" }}>{q.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl p-4 shadow-card mb-4">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-2">Notes (optional)</p>
          <textarea placeholder="How's your body feeling today?…" value={note}
            onChange={(e) => setNote(e.target.value)} rows={3}
            className="w-full text-sm text-dark font-body outline-none placeholder:text-dark/30 bg-transparent resize-none" />
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={selectedMood === null || saveStatus === "loading"}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base tracking-wide transition-all duration-300 active:scale-95 shadow-soft mb-2 disabled:opacity-40"
          style={{ background: saveStatus === "success" ? "linear-gradient(135deg, #34D399, #10B981)" : "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
          {saveStatus === "loading" ? "Saving…" : saveStatus === "success" ? "✓ Mood Logged!" : selectedMood === null ? "Select a mood first" : alreadyLogged ? "Update Check-in" : "Save Check-in"}
        </button>
      </main>
    </div>
  );
}
