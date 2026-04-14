"use client";

// components/MealFoodLibrary.tsx
import { useState, useMemo } from "react";
import { FOOD_LIBRARY, MEAL_TYPE_LABELS, MEAL_TYPE_ORDER, type FoodItem, type MealType, type Phase } from "@/lib/foods";
import { QUICK_FOODS, type QuickFood } from "@/lib/quickFoods";
import { type MealEntry } from "@/lib/supabase";

type TabType = "all" | MealType | "search";

function MacroPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
      style={{ background: `${color}18`, color }}>
      {label}: {value}
    </span>
  );
}

function FoodCard({ food, expanded, onExpand, onAdd, showPhase }: {
  food: FoodItem; expanded: boolean; onExpand: () => void;
  onAdd: () => void; showPhase?: boolean;
}) {
  const typeStyle = MEAL_TYPE_LABELS[food.mealType];
  return (
    <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-2xl flex-shrink-0">{food.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-dark font-semibold text-sm">{food.name}</p>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: typeStyle.bg, color: typeStyle.text }}>{typeStyle.label}</span>
            {showPhase && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-accent text-secondary">{food.phase}</span>
            )}
          </div>
          <p className="text-dark/50 text-xs font-body mt-0.5">{food.reason}</p>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            <MacroPill label="kcal" value={food.calories} color="#C48A97" />
            <MacroPill label="P" value={`${food.protein}g`} color="#7B6D8D" />
            <MacroPill label="C" value={`${food.carbs}g`} color="#F59E0B" />
            <MacroPill label="F" value={`${food.fats}g`} color="#34D399" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button onClick={onExpand}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-dark/30 transition-all"
            style={{ background: "var(--color-ghost)" }}>
            <span className="text-xs">{expanded ? "↑" : "↓"}</span>
          </button>
          <button onClick={onAdd}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-lg transition-all active:scale-90 shadow-soft"
            style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
            +
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--color-border)] pt-3">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-background rounded-xl p-2.5">
              <p className="text-xs text-dark/40 uppercase tracking-wide font-semibold mb-1">Portion</p>
              <p className="text-dark text-xs font-semibold">{food.portion}</p>
            </div>
            <div className="bg-background rounded-xl p-2.5">
              <p className="text-xs text-dark/40 uppercase tracking-wide font-semibold mb-1">Key Nutrient</p>
              <p className="text-primary text-xs font-semibold">{food.keyNutrient}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: "Calories", value: `${food.calories}`, unit: "kcal" },
              { label: "Protein",  value: `${food.protein}`,  unit: "g" },
              { label: "Carbs",    value: `${food.carbs}`,    unit: "g" },
              { label: "Fats",     value: `${food.fats}`,     unit: "g" },
            ].map((m) => (
              <div key={m.label} className="bg-background rounded-xl p-2 text-center">
                <p className="font-display font-bold text-sm text-dark">{m.value}</p>
                <p className="text-xs text-dark/40 uppercase tracking-wide font-semibold">{m.unit}</p>
                <p className="text-xs text-dark/30">{m.label}</p>
              </div>
            ))}
          </div>
          {food.fiber && <p className="text-xs text-dark/40 font-body mt-2 text-center">Fiber: {food.fiber}g</p>}
        </div>
      )}
    </div>
  );
}

// Phase pill styling
const PHASE_STYLES: Record<string, { bg: string; text: string; emoji: string }> = {
  menstrual:  { bg: "rgba(248,113,113,0.12)",  text: "#DC2626", emoji: "🌙" },
  follicular: { bg: "rgba(52,211,153,0.12)",   text: "#059669", emoji: "🌱" },
  ovulation:  { bg: "rgba(251,191,36,0.12)",   text: "#B45309", emoji: "⚡" },
  luteal:     { bg: "rgba(167,139,250,0.12)",  text: "#6D28D9", emoji: "🍂" },
};

// Card for quickFoods — phase pills, key nutrient, gram input, auto-calculated macros
function QuickFoodCard({ food, onAdd }: { food: QuickFood; onAdd: (entry: MealEntry) => void }) {
  const [grams, setGrams] = useState("100");
  const [expanded, setExpanded] = useState(false);

  const calc = useMemo(() => {
    const g = parseFloat(grams) || 100;
    const r = g / 100;
    return {
      calories: Math.round(food.per100g.calories * r),
      protein:  Math.round(food.per100g.protein  * r * 10) / 10,
      carbs:    Math.round(food.per100g.carbs    * r * 10) / 10,
      fats:     Math.round(food.per100g.fats     * r * 10) / 10,
    };
  }, [grams, food]);

  function handleAdd() {
    onAdd({
      name: `${food.emoji} ${food.name} (${grams}g)`,
      calories: String(calc.calories),
      protein:  String(calc.protein),
      carbs:    String(calc.carbs),
      fats:     String(calc.fats),
      time:     new Date().toTimeString().slice(0, 5),
      mealType: "snack",
    });
  }

  return (
    <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-2xl flex-shrink-0">{food.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-dark font-semibold text-sm">{food.name}</p>
          <p className="text-dark/50 text-xs font-body mt-0.5">{food.keyNutrient}</p>
          {/* Phase pills */}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {food.phases.map(p => {
              const s = PHASE_STYLES[p];
              return (
                <span key={p} className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: s.bg, color: s.text }}>
                  {s.emoji} {p.charAt(0).toUpperCase() + p.slice(1)}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-dark/30 transition-all"
            style={{ background: "var(--color-ghost)" }}>
            <span className="text-xs">{expanded ? "↑" : "↓"}</span>
          </button>
          <button onClick={handleAdd}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-lg transition-all active:scale-90 shadow-soft"
            style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
            +
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--color-border)] pt-3 space-y-3">
          {/* Gram input */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-dark/50 flex-shrink-0">Amount</label>
            <input type="number" value={grams} min="1" max="2000" step="5"
              onChange={(e) => setGrams(e.target.value)}
              className="flex-1 text-center bg-background rounded-xl px-3 py-2 text-sm font-semibold text-dark outline-none border border-transparent focus:border-primary/30 transition-colors" />
            <span className="text-sm font-semibold text-dark/40 flex-shrink-0">g</span>
          </div>
          {/* Macros */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: "kcal", value: calc.calories, color: "#C48A97" },
              { label: "P",    value: `${calc.protein}g`, color: "#7B6D8D" },
              { label: "C",    value: `${calc.carbs}g`,   color: "#F59E0B" },
              { label: "F",    value: `${calc.fats}g`,    color: "#34D399" },
            ].map(m => (
              <div key={m.label} className="bg-background rounded-xl p-2 text-center">
                <p className="font-display font-bold text-sm" style={{ color: m.color }}>{m.value}</p>
                <p className="text-xs text-dark/30 uppercase font-semibold">{m.label}</p>
              </div>
            ))}
          </div>
          {/* Phase reasons */}
          {food.phases.length > 0 && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(135deg, #2A2330, #3D3248)" }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Why these phases?</p>
              {food.phases.map(p => {
                const s = PHASE_STYLES[p];
                const reason = food.phaseReasons[p];
                if (!reason) return null;
                return (
                  <div key={p} className="flex items-start gap-2">
                    <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: s.text }}>{s.emoji}</span>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{reason}</p>
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={handleAdd}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white active:scale-95 transition-all"
            style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
            Add {food.name} ({grams}g)
          </button>
        </div>
      )}
    </div>
  );
}

function TabPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
      style={{
        background: active ? "linear-gradient(135deg, #C48A97, #7B6D8D)" : "var(--color-surface)",
        color: active ? "var(--color-surface)" : "var(--color-text-dim)",
        boxShadow: "0 1px 4px rgba(var(--color-text-rgb),0.06)",
      }}>
      {label}
    </button>
  );
}

interface Props {
  phase: Phase;
  onAddFood: (entry: MealEntry) => void;
}

export default function MealFoodLibrary({ phase, onAddFood }: Props) {
  const [activeTab, setActiveTab]       = useState<TabType>("all");
  const [expandedFood, setExpandedFood] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]   = useState("");
  const [toast, setToast]               = useState<{ name: string; id: number } | null>(null);

  const phaseFoods = useMemo(() => FOOD_LIBRARY.filter(f => f.phase === phase), [phase]);

  const allTabFoods = useMemo(() => {
    const result: FoodItem[] = [];
    MEAL_TYPE_ORDER.forEach(type => {
      result.push(...phaseFoods.filter(f => f.mealType === type).slice(0, 2));
    });
    return result;
  }, [phaseFoods]);

  const typeTabFoods = useMemo(() => {
    if (activeTab === "all" || activeTab === "search") return [];
    return phaseFoods.filter(f => f.mealType === activeTab).slice(0, 5);
  }, [phaseFoods, activeTab]);

  // Combined search — FOOD_LIBRARY + QUICK_FOODS
  const { phaseSearchResults, quickSearchResults } = useMemo(() => {
    if (!searchQuery.trim()) return { phaseSearchResults: [], quickSearchResults: [] };
    const q = searchQuery.toLowerCase();
    const phaseSearchResults = FOOD_LIBRARY.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.reason.toLowerCase().includes(q) ||
      f.keyNutrient.toLowerCase().includes(q)
    ).slice(0, 10);
    const quickSearchResults = QUICK_FOODS.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
    ).slice(0, 10);
    return { phaseSearchResults, quickSearchResults };
  }, [searchQuery]);

  const totalSearchResults = phaseSearchResults.length + quickSearchResults.length;
  const displayFoods = activeTab === "all" ? allTabFoods
    : activeTab === "search" ? phaseSearchResults
    : typeTabFoods;

  function addFromLibrary(food: FoodItem) {
    onAddFood({
      name: `${food.emoji} ${food.name}`,
      calories: String(food.calories),
      protein:  String(food.protein),
      carbs:    String(food.carbs),
      fats:     String(food.fats),
      time:     new Date().toTimeString().slice(0, 5),
      mealType: food.mealType,
    });
    showToast(`${food.emoji} ${food.name}`);
  }

  function addFromQuick(entry: MealEntry) {
    onAddFood(entry);
    showToast(entry.name);
  }

  function showToast(name: string) {
    const id = Date.now();
    setToast({ name, id });
    setTimeout(() => setToast(t => t?.id === id ? null : t), 2500);
  }

  return (
    <>
      {/* Search */}
      <div className="bg-surface rounded-2xl flex items-center gap-2 px-3 py-3 shadow-card mb-3">
        <svg className="w-4 h-4 text-dark/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
        </svg>
        <input type="text" placeholder="Search all foods — orange, banana, chicken…" value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setActiveTab(e.target.value ? "search" : "all"); }}
          className="flex-1 text-sm text-dark outline-none bg-transparent placeholder:text-dark/30 font-body" />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(""); setActiveTab("all"); }}
            className="text-dark/30 hover:text-dark text-lg leading-none">×</button>
        )}
      </div>

      {/* Tabs — only when not searching */}
      {!searchQuery && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2.5 px-1">
            {activeTab === "all" ? `Recommended for ${phase} phase` : MEAL_TYPE_LABELS[activeTab as MealType]?.label ?? "Foods"}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <TabPill label="All" active={activeTab === "all"} onClick={() => setActiveTab("all")} />
            {MEAL_TYPE_ORDER.map(type => (
              <TabPill key={type} label={MEAL_TYPE_LABELS[type].label} active={activeTab === type} onClick={() => setActiveTab(type)} />
            ))}
          </div>
        </div>
      )}

      {/* Search results count */}
      {searchQuery && (
        <p className="text-xs text-dark/40 font-body px-1 mb-2">
          {totalSearchResults} result{totalSearchResults !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
        </p>
      )}

      {/* Food list */}
      <div className="space-y-2 mb-4">
        {/* Phase/meal foods */}
        {displayFoods.map((food) => (
          <FoodCard key={food.id} food={food}
            expanded={expandedFood === food.id}
            onExpand={() => setExpandedFood(expandedFood === food.id ? null : food.id)}
            onAdd={() => addFromLibrary(food)}
            showPhase={activeTab === "search"} />
        ))}

        {/* QuickFoods results — shown below phase foods when searching */}
        {searchQuery && quickSearchResults.length > 0 && (
          <>
            {phaseSearchResults.length > 0 && (
              <p className="text-xs font-semibold text-dark/40 uppercase tracking-wide px-1 pt-2">
                Generic foods
              </p>
            )}
            {quickSearchResults.map(food => (
              <QuickFoodCard key={food.id} food={food} onAdd={addFromQuick} />
            ))}
          </>
        )}

        {/* No results */}
        {searchQuery && totalSearchResults === 0 && (
          <div className="text-center py-6">
            <p className="text-sm font-semibold text-dark/40">No results for &quot;{searchQuery}&quot;</p>
            <p className="text-xs text-dark/30 font-body mt-1">Try Log Custom Meal to add it manually</p>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 pointer-events-none"
          style={{ transform: "translateX(-50%)" }}>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)", whiteSpace: "nowrap" }}>
            <span>✓</span>
            <span>{toast.name} added</span>
          </div>
        </div>
      )}
    </>
  );
}
