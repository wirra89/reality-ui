"use client";

// components/MealLogForm.tsx
import { useState, useMemo, useEffect } from "react";
import { type MealEntry } from "@/lib/supabase";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from "@/lib/foods";
import { searchQuickFoods, type QuickFood } from "@/lib/quickFoods";
import { getCustomMeals, saveCustomMeal, deleteCustomMeal, type CustomMeal } from "@/lib/supabase";

interface Ingredient { id: string; food: QuickFood; grams: number; }

function nowTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

const MEAL_TYPE_OPTIONS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch",     label: "Lunch"     },
  { value: "dinner",    label: "Dinner"    },
  { value: "snack",     label: "Snack"     },
] as const;

const EMOJIS = ["🍽️","🥗","🍲","🥘","🍱","🥙","🌮","🍝","🥚","🐟","🍗","🥩","🥑","🍌","🍎","🧀","🥛","🌾","🍜","🥞"];

interface Props {
  onAdd: (entry: MealEntry) => void;
  onCancel: () => void;
}

export default function MealLogForm({ onAdd, onCancel }: Props) {
  const [mode, setMode] = useState<"search" | "build" | "mine">("search");
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("snack");
  const [time, setTime] = useState(nowTime());

  // ── Search mode ──
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<QuickFood | null>(null);
  const [grams, setGrams] = useState("100");
  const searchResults = useMemo(() => searchQuickFoods(searchQuery), [searchQuery]);
  const calculated = useMemo(() => {
    if (!selectedFood) return null;
    const g = parseFloat(grams);
    if (!g || g <= 0) return null;
    const r = g / 100;
    return {
      calories: Math.round(selectedFood.per100g.calories * r),
      protein:  Math.round(selectedFood.per100g.protein  * r * 10) / 10,
      carbs:    Math.round(selectedFood.per100g.carbs    * r * 10) / 10,
      fats:     Math.round(selectedFood.per100g.fats     * r * 10) / 10,
    };
  }, [selectedFood, grams]);

  // ── Build mode ──
  const [mealEmoji, setMealEmoji] = useState("🍽️");
  const [mealName, setMealName] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [activeIngSearch, setActiveIngSearch] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const ingResults = useMemo(() => activeIngSearch ? searchQuickFoods(ingredientSearch) : [], [ingredientSearch, activeIngSearch]);
  const totals = useMemo(() => ingredients.reduce((acc, ing) => {
    const r = ing.grams / 100;
    return { calories: acc.calories + Math.round(ing.food.per100g.calories * r), protein: acc.protein + ing.food.per100g.protein * r, carbs: acc.carbs + ing.food.per100g.carbs * r, fats: acc.fats + ing.food.per100g.fats * r };
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 }), [ingredients]);

  // ── My meals mode ──
  const [myMeals, setMyMeals] = useState<CustomMeal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(false);

  useEffect(() => {
    if (mode === "mine" && myMeals.length === 0) {
      setLoadingMeals(true);
      getCustomMeals().then(m => { setMyMeals(m); setLoadingMeals(false); });
    }
  }, [mode]);

  useEffect(() => {
    if (ingredients.length === 1) { setMealEmoji(ingredients[0].food.emoji); if (!mealName) setMealName(ingredients[0].food.name); }
  }, [ingredients.length]);

  // ── Handlers ──
  function addIngredient(food: QuickFood) {
    setIngredients(prev => [...prev, { id: crypto.randomUUID(), food, grams: 100 }]);
    setIngredientSearch(""); setActiveIngSearch(false);
  }

  async function handleSaveToMyMeals() {
    if (!mealName.trim() || ingredients.length === 0) return;
    setSavingMeal(true);
    await saveCustomMeal({
      name: mealName.trim(), emoji: mealEmoji,
      calories: Math.round(totals.calories),
      protein:  Math.round(totals.protein * 10) / 10,
      carbs:    Math.round(totals.carbs   * 10) / 10,
      fats:     Math.round(totals.fats    * 10) / 10,
      ingredients: ingredients.map(i => ({ name: i.food.name, emoji: i.food.emoji, grams: i.grams })),
    });
    const updated = await getCustomMeals();
    setMyMeals(updated);
    setSaveConfirm(true); setSavingMeal(false);
    setTimeout(() => setSaveConfirm(false), 2500);
  }

  function handleAddFromSearch() {
    if (!selectedFood || !calculated) return;
    onAdd({ name: `${selectedFood.emoji} ${selectedFood.name} (${grams}g)`, calories: String(calculated.calories), protein: String(calculated.protein), carbs: String(calculated.carbs), fats: String(calculated.fats), time, mealType });
    setSelectedFood(null); setSearchQuery(""); setGrams("100");
  }

  function handleLogBuild() {
    if (!mealName.trim() || ingredients.length === 0) return;
    onAdd({ name: `${mealEmoji} ${mealName}`, calories: String(Math.round(totals.calories)), protein: String(Math.round(totals.protein * 10) / 10), carbs: String(Math.round(totals.carbs * 10) / 10), fats: String(Math.round(totals.fats * 10) / 10), time, mealType });
  }

  function handleLogMine(meal: CustomMeal) {
    onAdd({ name: `${meal.emoji} ${meal.name}`, calories: String(meal.calories), protein: String(meal.protein), carbs: String(meal.carbs), fats: String(meal.fats), time, mealType });
  }

  async function handleDeleteMine(id: number) {
    await deleteCustomMeal(id);
    setMyMeals(prev => prev.filter(m => m.id !== id));
  }

  // ── Shared top row ──
  const topRow = (
    <div className="flex gap-2 mb-3">
      <select value={mealType} onChange={(e) => setMealType(e.target.value as typeof mealType)}
        className="bg-background rounded-xl px-2 py-2.5 text-xs font-semibold text-dark outline-none flex-shrink-0" style={{ minWidth: 90 }}>
        {MEAL_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
        className="flex-1 bg-background rounded-xl px-3 py-2.5 text-sm text-dark outline-none font-body" />
    </div>
  );

  return (
    <div className="bg-surface rounded-2xl shadow-card p-4 mb-4">

      {/* Mode toggle */}
      <div className="flex rounded-xl bg-background p-1 gap-1 mb-3">
        {([
          { id: "search", label: "🔍 Search" },
          { id: "build",  label: "🍳 Build" },
          { id: "mine",   label: `⭐ Mine${myMeals.length > 0 ? ` (${myMeals.length})` : ""}` },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setMode(t.id)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: mode === t.id ? "var(--color-surface)" : "transparent", color: mode === t.id ? "var(--color-text)" : "var(--color-text-dim)", boxShadow: mode === t.id ? "0 1px 4px rgba(var(--color-text-rgb),0.08)" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {topRow}

      {/* ── SEARCH MODE ── */}
      {mode === "search" && (
        <div className="space-y-2.5">
          <div className="relative">
            <input type="text" placeholder="Search: banana, chicken, oats…" value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedFood(null); }}
              className="w-full bg-background rounded-xl px-3 py-2.5 text-sm text-dark outline-none placeholder:text-dark/30 font-body pr-8" autoComplete="off" />
            {searchQuery && <button onClick={() => { setSearchQuery(""); setSelectedFood(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/30 text-lg leading-none">×</button>}
          </div>
          {searchQuery && !selectedFood && searchResults.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-[var(--color-border)] max-h-44 overflow-y-auto">
              {searchResults.map(food => (
                <button key={food.id} onClick={() => { setSelectedFood(food); setSearchQuery(food.name); setGrams("100"); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left active:bg-ghost border-b border-[var(--color-border)] last:border-0">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 18 }}>{food.emoji}</span>
                    <span className="text-sm font-semibold text-dark">{food.name}</span>
                  </div>
                  <span className="text-xs text-dark/30">{food.per100g.calories} kcal/100g</span>
                </button>
              ))}
            </div>
          )}
          {searchQuery && !selectedFood && searchResults.length === 0 && (
            <p className="text-xs text-dark/30 font-body px-1">No results — try Build tab to compose a meal</p>
          )}
          {selectedFood && (
            <div className="rounded-xl bg-background p-3 space-y-3">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 22 }}>{selectedFood.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-dark">{selectedFood.name}</p>
                  <p className="text-[10px] text-dark/40 font-body">Per 100g: {selectedFood.per100g.calories} kcal · {selectedFood.per100g.protein}g P · {selectedFood.per100g.carbs}g C · {selectedFood.per100g.fats}g F</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-dark/50 flex-shrink-0">Amount</label>
                <input type="number" value={grams} onChange={(e) => setGrams(e.target.value)} min="1" max="2000" step="5"
                  className="flex-1 bg-surface rounded-xl px-3 py-2 text-sm text-dark outline-none font-body text-center border border-transparent focus:border-primary/30 transition-colors" />
                <span className="text-sm font-semibold text-dark/40 flex-shrink-0">g</span>
              </div>
              {calculated && (
                <div className="grid grid-cols-4 gap-1.5">
                  {[{ label: "kcal", value: calculated.calories, color: "#C48A97" }, { label: "P", value: `${calculated.protein}g`, color: "#7B6D8D" }, { label: "C", value: `${calculated.carbs}g`, color: "#F59E0B" }, { label: "F", value: `${calculated.fats}g`, color: "#34D399" }].map(m => (
                    <div key={m.label} className="bg-surface rounded-xl p-2 text-center">
                      <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                      <p className="text-[9px] text-dark/30 font-semibold uppercase">{m.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── BUILD MODE ── */}
      {mode === "build" && (
        <>
          <div className="flex gap-2 mb-3">
            <select value={mealEmoji} onChange={(e) => setMealEmoji(e.target.value)}
              className="bg-background rounded-xl px-2 py-2.5 text-lg outline-none flex-shrink-0 w-12 text-center">
              {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <input type="text" placeholder="Meal name (e.g. Spaghetti Bolognese)" value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              className="flex-1 bg-background rounded-xl px-3 py-2.5 text-sm text-dark outline-none placeholder:text-dark/30 font-body" />
          </div>

          {ingredients.length > 0 && (
            <div className="space-y-2 mb-3">
              {ingredients.map(ing => {
                const cal = Math.round(ing.food.per100g.calories * ing.grams / 100);
                return (
                  <div key={ing.id} className="flex items-center gap-2 bg-background rounded-xl px-3 py-2">
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{ing.food.emoji}</span>
                    <span className="text-sm font-semibold text-dark flex-1 truncate">{ing.food.name}</span>
                    <input type="number" value={ing.grams} min="1" max="2000" step="5"
                      onChange={(e) => setIngredients(prev => prev.map(i => i.id === ing.id ? { ...i, grams: parseFloat(e.target.value) || 1 } : i))}
                      className="w-16 text-center bg-surface rounded-lg px-2 py-1 text-sm font-semibold text-dark outline-none border border-transparent focus:border-primary/30 transition-colors flex-shrink-0" />
                    <span className="text-xs text-dark/40 flex-shrink-0">g</span>
                    <span className="text-xs text-dark/30 font-body w-12 text-right flex-shrink-0">{cal} kcal</span>
                    <button onClick={() => setIngredients(prev => prev.filter(i => i.id !== ing.id))}
                      className="text-dark/20 hover:text-rose-400 transition-colors text-lg leading-none flex-shrink-0 ml-1">×</button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mb-3">
            {!activeIngSearch ? (
              <button onClick={() => setActiveIngSearch(true)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-dashed transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{ borderColor: "rgba(196,138,151,0.3)", color: "#C48A97" }}>
                + Add ingredient
              </button>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input type="text" autoFocus placeholder="Search ingredient…" value={ingredientSearch}
                    onChange={(e) => setIngredientSearch(e.target.value)}
                    className="w-full bg-background rounded-xl px-3 py-2.5 text-sm text-dark outline-none placeholder:text-dark/30 font-body pr-8" />
                  <button onClick={() => { setActiveIngSearch(false); setIngredientSearch(""); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/30 text-lg leading-none">×</button>
                </div>
                {ingResults.length > 0 && (
                  <div className="rounded-xl overflow-hidden border border-[var(--color-border)] max-h-44 overflow-y-auto">
                    {ingResults.map(food => (
                      <button key={food.id} onClick={() => addIngredient(food)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left active:bg-ghost border-b border-[var(--color-border)] last:border-0">
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 16 }}>{food.emoji}</span>
                          <span className="text-sm font-semibold text-dark">{food.name}</span>
                        </div>
                        <span className="text-xs text-dark/30">{food.per100g.calories} kcal/100g</span>
                      </button>
                    ))}
                  </div>
                )}
                {ingredientSearch && ingResults.length === 0 && (
                  <p className="text-xs text-dark/30 px-1 font-body">No results for "{ingredientSearch}"</p>
                )}
              </div>
            )}
          </div>

          {ingredients.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-[var(--color-border)] mb-3">
              <div className="grid grid-cols-4 divide-x divide-[var(--color-border)]">
                {[{ label: "kcal", value: Math.round(totals.calories), color: "#C48A97" }, { label: "P", value: `${Math.round(totals.protein * 10) / 10}g`, color: "#7B6D8D" }, { label: "C", value: `${Math.round(totals.carbs * 10) / 10}g`, color: "#F59E0B" }, { label: "F", value: `${Math.round(totals.fats * 10) / 10}g`, color: "#34D399" }].map(m => (
                  <div key={m.label} className="py-2 text-center">
                    <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                    <p className="text-[9px] text-dark/30 uppercase font-semibold">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ingredients.length > 0 && mealName.trim() && (
            <button onClick={handleSaveToMyMeals} disabled={savingMeal}
              className="w-full py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5 mb-2"
              style={{ background: saveConfirm ? "rgba(52,211,153,0.1)" : "rgba(196,138,151,0.08)", color: saveConfirm ? "#059669" : "#C48A97" }}>
              {saveConfirm ? "✓ Saved to My Meals!" : savingMeal ? "Saving…" : "⭐ Save to My Meals"}
            </button>
          )}
        </>
      )}

      {/* ── MY MEALS MODE ── */}
      {mode === "mine" && (
        <div className="mb-3">
          {loadingMeals ? (
            <p className="text-xs text-dark/40 text-center py-6">Loading…</p>
          ) : myMeals.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-2">⭐</p>
              <p className="text-sm font-semibold text-dark mb-1">No saved meals yet</p>
              <p className="text-xs text-dark/40 font-body leading-snug">Go to Build tab, add ingredients and tap "Save to My Meals"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myMeals.map(meal => {
                const ings = (meal.ingredients as { name: string; emoji: string; grams: number }[] | undefined) ?? [];
                return (
                  <div key={meal.id} className="bg-background rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: 20 }}>{meal.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-dark truncate">{meal.name}</p>
                        <p className="text-[10px] text-dark/40 font-body">{meal.calories} kcal · {meal.protein}g P · {meal.carbs}g C · {meal.fats}g F</p>
                        {ings.length > 0 && <p className="text-[10px] text-dark/25 font-body mt-0.5 truncate">{ings.map(i => `${i.emoji} ${i.grams}g`).join(" · ")}</p>}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => handleLogMine(meal)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold active:scale-90 transition-all"
                          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>+</button>
                        <button onClick={() => meal.id && handleDeleteMine(meal.id)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-dark/25 active:text-rose-400 transition-colors bg-surface">×</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-dark/40 bg-ghost active:scale-95">Cancel</button>
        {mode === "search" && (
          <button onClick={handleAddFromSearch} disabled={!selectedFood || !calculated}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white active:scale-95 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>Add meal</button>
        )}
        {mode === "build" && (
          <button onClick={handleLogBuild} disabled={!mealName.trim() || ingredients.length === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white active:scale-95 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>Log meal</button>
        )}
      </div>
    </div>
  );
}
