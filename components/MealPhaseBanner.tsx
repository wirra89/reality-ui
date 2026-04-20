"use client";

// components/MealPhaseBanner.tsx
// Refactored in Step 6 — now accepts optional mealFocus from TodayState.
// When mealFocus is provided: displays engine-driven headline, reasoning, macro note, foods.
// When mealFocus is null: falls back to original rotating phase-based tip bank.

import type { PhaseData } from "@/lib/cycle";
import type { MealFocus } from "@/lib/dailyPlan";

const PHASE_BAND_BG: Record<string, string> = {
  menstrual:  "#FEE2E2",
  follicular: "#D1FAE5",
  ovulation:  "#FEF3C7",
  luteal:     "#EDE9FE",
};
const PHASE_BAND_TEXT: Record<string, string> = {
  menstrual:  "#B91C1C",
  follicular: "#065F46",
  ovulation:  "#92400E",
  luteal:     "#5B21B6",
};
const PHASE_COLOR: Record<string, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

// ── Fallback rotating message bank (original, preserved) ─────────────────
const PHASE_STARTS: Record<string, number> = {
  menstrual: 1, follicular: 6, ovulation: 14, luteal: 17,
};

const mealPhaseMessages: Record<string, {
  category: string; title: string; detail: string;
  tips: { emoji: string; label: string }[];
}[]> = {
  menstrual: [
    { category: "Iron focus",      title: "Iron + Omega-3",             detail: "You're losing iron through bleeding. Red meat, lentils, and spinach replenish it. Pair with vitamin C to triple absorption. Omega-3 from salmon or sardines reduces prostaglandins — the chemicals causing cramps.", tips: [{ emoji: "🥩", label: "Red meat" }, { emoji: "🥬", label: "Spinach" }, { emoji: "🐟", label: "Salmon" }, { emoji: "🍋", label: "Vitamin C" }] },
    { category: "Anti-cramp",      title: "Magnesium + Dark chocolate", detail: "Magnesium deficiency directly causes cramping. Dark chocolate (70%+), almonds, and pumpkin seeds are all high in magnesium. This is one of the few times chocolate is genuinely medicinal.", tips: [{ emoji: "🍫", label: "Dark choc" }, { emoji: "🌰", label: "Almonds" }, { emoji: "🎃", label: "Pumpkin seeds" }, { emoji: "🥬", label: "Leafy greens" }] },
    { category: "Warmth & comfort", title: "Warming foods",             detail: "Cold foods can worsen cramping. Warm broths, soups, herbal teas, and cooked grains are easier on your system right now. Ginger has anti-inflammatory properties that specifically target menstrual pain.", tips: [{ emoji: "🍵", label: "Ginger tea" }, { emoji: "🫙", label: "Bone broth" }, { emoji: "🍲", label: "Warm soups" }, { emoji: "🌾", label: "Oats" }] },
    { category: "Blood sugar",      title: "Stable energy",              detail: "Blood sugar swings worsen mood and fatigue during your period. Eat every 3-4 hours, combine protein with complex carbs at every meal, and avoid skipping meals even when appetite is low.", tips: [{ emoji: "🥚", label: "Eggs" }, { emoji: "🍠", label: "Sweet potato" }, { emoji: "🫘", label: "Lentils" }, { emoji: "🥑", label: "Avocado" }] },
    { category: "Hydration",        title: "Reduce bloating",            detail: "Counterintuitively, drinking more water reduces period bloating. Avoid excess salt, caffeine, and alcohol this week — all worsen water retention and inflammation.", tips: [{ emoji: "💧", label: "Water" }, { emoji: "🍵", label: "Herbal tea" }, { emoji: "🫐", label: "Blueberries" }, { emoji: "🥒", label: "Cucumber" }] },
  ],
  follicular: [
    { category: "Muscle building",   title: "Lean protein + Complex carbs", detail: "Rising oestrogen increases muscle protein synthesis. This is the best time to push protein intake — your body will use it more efficiently now than any other phase. Fuel heavy sessions with complex carbs beforehand.", tips: [{ emoji: "🥚", label: "Eggs" }, { emoji: "🍚", label: "Brown rice" }, { emoji: "🥦", label: "Broccoli" }, { emoji: "🍗", label: "Chicken" }] },
    { category: "Gut & hormones",    title: "Fermented foods",             detail: "Oestrogen is metabolised through the gut. Fermented foods (kimchi, yogurt, kefir) support the microbiome's ability to process hormones cleanly — directly affecting how you'll feel in your next luteal phase.", tips: [{ emoji: "🫙", label: "Kimchi" }, { emoji: "🥛", label: "Kefir" }, { emoji: "🧀", label: "Yogurt" }, { emoji: "🥦", label: "Cruciferous" }] },
    { category: "Oestrogen support", title: "Phytoestrogens + Zinc",       detail: "Flaxseeds contain lignans that support healthy oestrogen balance. Zinc from pumpkin seeds supports follicle development. Broccoli and cauliflower help the liver process excess oestrogen.", tips: [{ emoji: "🌻", label: "Flaxseeds" }, { emoji: "🎃", label: "Pumpkin seeds" }, { emoji: "🥦", label: "Broccoli" }, { emoji: "🍓", label: "Vitamin C" }] },
    { category: "Energy fuel",       title: "Carb-load for training",      detail: "Your pain tolerance is higher and energy is rising. Fuel it — carbohydrate-rich meals before training sessions are particularly effective in the follicular phase. Don't under-eat on high-output days.", tips: [{ emoji: "🍌", label: "Banana" }, { emoji: "🌾", label: "Oats" }, { emoji: "🍠", label: "Sweet potato" }, { emoji: "🫘", label: "Beans" }] },
  ],
  ovulation: [
    { category: "Peak fuel",            title: "High carbs + High protein",  detail: "You're at peak metabolic output. Your body is burning more fuel than usual. Maximum carbohydrates before training, maximum protein within 30 minutes after. Don't undereat on your strongest days.", tips: [{ emoji: "🍚", label: "Rice" }, { emoji: "🥩", label: "Lean meat" }, { emoji: "💧", label: "Hydration" }, { emoji: "🍌", label: "Banana" }] },
    { category: "Zinc for ovulation",   title: "Zinc + Antioxidants",        detail: "Zinc is essential for the LH surge that triggers ovulation. Oysters, beef, pumpkin seeds, and chickpeas are top sources. Antioxidant-rich berries and leafy greens protect the egg from oxidative stress.", tips: [{ emoji: "🥩", label: "Zinc foods" }, { emoji: "🫐", label: "Blueberries" }, { emoji: "🥬", label: "Spinach" }, { emoji: "🥑", label: "Avocado" }] },
    { category: "Anti-inflammatory",    title: "Omega-3 + Fibre",            detail: "Peak oestrogen can cause mild inflammation. Omega-3 from salmon and walnuts, combined with high-fibre vegetables, helps the body manage and clear excess oestrogen before the luteal phase begins.", tips: [{ emoji: "🐟", label: "Salmon" }, { emoji: "🌰", label: "Walnuts" }, { emoji: "🫘", label: "Fibre" }, { emoji: "🥗", label: "Raw veg" }] },
  ],
  luteal: [
    { category: "PMS prevention",       title: "Magnesium + B6",             detail: "Magnesium and B6 are the two most evidence-backed nutrients for reducing PMS. Magnesium from almonds, spinach, and dark chocolate. B6 from turkey, banana, and chickpeas. Start loading these now.", tips: [{ emoji: "🌰", label: "Almonds" }, { emoji: "🍫", label: "Dark choc" }, { emoji: "🦃", label: "Turkey" }, { emoji: "🍌", label: "Banana" }] },
    { category: "Blood sugar stability", title: "Stable carbs every 3-4h",   detail: "Progesterone raises your metabolic rate — you genuinely need more fuel. But blood sugar crashes worsen mood swings and cravings dramatically. Eat complex carbs every 3-4 hours to keep levels steady.", tips: [{ emoji: "🍠", label: "Sweet potato" }, { emoji: "🌾", label: "Oats" }, { emoji: "🥚", label: "Eggs" }, { emoji: "🥑", label: "Avocado" }] },
    { category: "Serotonin boost",       title: "Tryptophan + Healthy fats",  detail: "Serotonin drops in the luteal phase — this drives low mood and cravings. Tryptophan (from turkey, eggs, and cheese) is the direct precursor to serotonin. Healthy fats help absorb it.", tips: [{ emoji: "🦃", label: "Turkey" }, { emoji: "🥚", label: "Eggs" }, { emoji: "🧀", label: "Cheese" }, { emoji: "🐟", label: "Salmon" }] },
    { category: "Reduce bloating",       title: "Anti-bloat foods",           detail: "Progesterone slows digestion, causing bloating. Reduce salt, avoid carbonated drinks, and eat probiotic-rich foods. Herbal teas — especially chamomile and peppermint — directly soothe bloating.", tips: [{ emoji: "🍵", label: "Chamomile" }, { emoji: "🫙", label: "Probiotics" }, { emoji: "🥒", label: "Cucumber" }, { emoji: "🌿", label: "Peppermint" }] },
    { category: "Comfort without crash", title: "Smart comfort foods",        detail: "Cravings for carbs and sugar are driven by falling serotonin. Satisfy them smartly — dark chocolate, sweet potato, oats with banana. These give the serotonin hit without the blood sugar crash.", tips: [{ emoji: "🍫", label: "Dark choc" }, { emoji: "🍠", label: "Sweet potato" }, { emoji: "🌾", label: "Oats" }, { emoji: "🍌", label: "Banana" }] },
    { category: "Omega-3",               title: "Reduce inflammation",        detail: "Omega-3 from salmon, sardines, and walnuts directly reduces the prostaglandins that will cause cramping when your period arrives. Loading omega-3 in late luteal is one of the most effective things you can do for next period.", tips: [{ emoji: "🐟", label: "Salmon" }, { emoji: "🐠", label: "Sardines" }, { emoji: "🌰", label: "Walnuts" }, { emoji: "🫙", label: "Fish oil" }] },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  phaseData: PhaseData;
  cycleDay: number;
  mealFocus?: MealFocus | null;       // from TodayState — optional
  adaptedFromCheckin?: boolean;
}

export default function MealPhaseBanner({ phaseData, cycleDay, mealFocus, adaptedFromCheckin }: Props) {
  const phase  = phaseData.phase;
  const msgs   = mealPhaseMessages[phase] ?? mealPhaseMessages.menstrual;
  const start  = PHASE_STARTS[phase] ?? 1;
  const msgIdx = Math.max(0, cycleDay - start) % msgs.length;
  const msg    = msgs[msgIdx];

  // ── TodayState version — engine-driven meal focus ─────────────────────
  if (mealFocus) {
    const bandBg   = PHASE_BAND_BG[phase]   ?? "#FEE2E2";
    const bandText = PHASE_BAND_TEXT[phase] ?? "#B91C1C";
    const dotColor = PHASE_COLOR[phase]     ?? "#F87171";
    return (
      <div className="rounded-2xl mb-3 overflow-hidden shadow-card"
        style={{ background: "var(--color-surface)" }}>

        {/* Phase band */}
        <div className="flex items-center justify-between px-4 py-2.5"
          style={{ background: bandBg }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: dotColor }} />
            <span className="text-xs font-extrabold uppercase tracking-widest" style={{ color: bandText }}>
              {phase} phase
              {adaptedFromCheckin && " · personalised"}
            </span>
          </div>
          <span className="font-display text-xs font-bold" style={{ color: bandText }}>Day {cycleDay}</span>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{phaseData.emoji}</span>
              <p className="text-dark font-display font-semibold text-base">
                {mealFocus.headline}
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: bandBg, color: bandText }}>
              Meal focus
            </span>
          </div>

        {/* Reasoning */}
        <p className="text-[var(--color-text-mid)] text-xs font-body leading-relaxed mb-3">
          {mealFocus.reasoning.split(".")[0].trim() + "."}
        </p>

        {/* Macro adjustment — shown only if present */}
        {mealFocus.macroAdjustment && (
          <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-xl"
            style={{ background: "rgba(0,0,0,0.03)" }}>
            <span className="text-sm flex-shrink-0">⚡</span>
            <p className="text-[var(--color-text-mid)] text-xs font-body leading-relaxed">
              {mealFocus.macroAdjustment}
            </p>
          </div>
        )}

        {/* Suggested foods as chips */}
        {mealFocus.suggestedFoods && mealFocus.suggestedFoods.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {mealFocus.suggestedFoods.map((food) => (
              <div key={food}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: bandBg, color: bandText }}>
                {food}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    );
  }

  // ── Fallback — rotating phase tip ────────────────────────────────────
  const bandBg2   = PHASE_BAND_BG[phase]   ?? "#FEE2E2";
  const bandText2 = PHASE_BAND_TEXT[phase] ?? "#B91C1C";
  const dotColor2 = PHASE_COLOR[phase]     ?? "#F87171";

  return (
    <div className="rounded-2xl mb-3 overflow-hidden shadow-card"
      style={{ background: "var(--color-surface)" }}>

      {/* Phase band */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ background: bandBg2 }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: dotColor2 }} />
          <span className="text-xs font-extrabold uppercase tracking-widest" style={{ color: bandText2 }}>
            {phase} phase
          </span>
        </div>
        <span className="font-display text-xs font-bold" style={{ color: bandText2 }}>Day {cycleDay}</span>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{phaseData.emoji}</span>
            <div>
              <p className="text-dark font-display font-semibold text-base">{msg.title}</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: bandBg2, color: bandText2 }}>
            {msg.category}
          </span>
        </div>
        <p className="text-[var(--color-text-mid)] text-xs font-body leading-relaxed mb-3">{msg.detail}</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {msg.tips.map((tip) => (
            <div key={tip.label}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: bandBg2, color: bandText2 }}>
              <span>{tip.emoji}</span><span>{tip.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          {msgs.map((_, i) => (
            <div key={i} className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === msgIdx ? 16 : 6,
                background: i === msgIdx ? dotColor2 : "var(--color-border)",
              }} />
          ))}
        </div>
      </div>
    </div>
  );
}
