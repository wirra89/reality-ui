"use client";

// components/NutritionFoodSearch.tsx
// MFP-style food database search panel.
// Sources: Open Food Facts (branded), USDA FoodData Central (generic),
// HerPhase recipe database (recipes), Supabase user foods (my foods), recent logs.

import { useState, useEffect, useRef, useCallback } from "react";
import type { Phase } from "@/lib/cycle";
import {
  searchFoodsUnified,
  lookupBarcodeUnified,
  type UnifiedFood,
  type SearchFilter,
} from "@/lib/foodSearch";
import {
  getRecentFoods,
  getFavoriteUids,
  addFavorite,
  removeFavorite,
  recentToUnifiedFood,
  getMyFoodsUnified,
} from "@/lib/foodLogs";
import FoodResultCard  from "@/components/FoodResultCard";
import FoodDetailModal from "@/components/FoodDetailModal";
import BarcodeScanner  from "@/components/BarcodeScanner";

// ── Phase context hints ───────────────────────────────────────────────────────

const PHASE_HINT: Record<Phase, { icon: string; text: string }> = {
  menstrual:  { icon: "🩸", text: "Focus: iron-rich foods, omega-3, and anti-inflammatory meals" },
  follicular: { icon: "🌱", text: "Focus: lean protein, complex carbs, and probiotic foods"       },
  ovulation:  { icon: "⚡", text: "Focus: high protein, zinc, and antioxidant-rich foods"          },
  luteal:     { icon: "🌙", text: "Focus: magnesium, serotonin foods, and stable complex carbs"    },
};

// ── Filter tab config ─────────────────────────────────────────────────────────

const FILTERS: { id: SearchFilter; label: string; icon: string }[] = [
  { id: "all",      label: "All",      icon: "🔍" },
  { id: "branded",  label: "Branded",  icon: "🏷️" },
  { id: "generic",  label: "Generic",  icon: "🌿" },
  { id: "recipes",  label: "Recipes",  icon: "✨" },
  { id: "my_foods", label: "My Foods", icon: "⭐" },
  { id: "recent",   label: "Recent",   icon: "🕐" },
];

// ── Phase colours ─────────────────────────────────────────────────────────────

const PHASE_COLOR: Record<Phase, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  cycleDay: number;
  phase:    Phase;
  onLogged: () => void;
  onCancel: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NutritionFoodSearch({ cycleDay, phase, onLogged, onCancel }: Props) {
  const phaseColor = PHASE_COLOR[phase];
  const phaseHint  = PHASE_HINT[phase];

  const [query,        setQuery]        = useState("");
  const [filter,       setFilter]       = useState<SearchFilter>("all");
  const [results,      setResults]      = useState<UnifiedFood[]>([]);
  const [favUids,      setFavUids]      = useState<Set<string>>(new Set());
  const [selectedFood, setSelectedFood] = useState<UnifiedFood | null>(null);
  const [showScanner,  setShowScanner]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [barcodeMsg,   setBarcodeMsg]   = useState<string | null>(null);
  const [hasSearched,  setHasSearched]  = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  // ── Load favorites on mount ───────────────────────────────────────────────

  useEffect(() => {
    getFavoriteUids().then(setFavUids);
  }, []);

  // ── Pre-load for tabs that don't need a query ─────────────────────────────

  useEffect(() => {
    if (filter === "recent") {
      setLoading(true);
      getRecentFoods(20).then(foods => {
        setResults(foods.map(recentToUnifiedFood));
        setLoading(false);
        setHasSearched(true);
      });
    } else if (filter === "my_foods" && !query.trim()) {
      setLoading(true);
      getMyFoodsUnified().then(foods => {
        setResults(foods);
        setLoading(false);
        setHasSearched(true);
      });
    } else if (!query.trim()) {
      // filter is already not "recent" or "my_foods" — TypeScript narrows this
      setResults([]);
      setHasSearched(false);
    }
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced search ──────────────────────────────────────────────────────

  const runSearch = useCallback(
    (q: string, f: SearchFilter) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();

      // Instant tabs
      if (f === "recent") return;

      if (!q.trim() && f === "my_foods") {
        setLoading(true);
        getMyFoodsUnified().then(foods => {
          setResults(foods);
          setLoading(false);
          setHasSearched(true);
        });
        return;
      }

      if (!q.trim()) {
        setResults([]);
        setHasSearched(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        abortRef.current = new AbortController();
        try {
          const foods = await searchFoodsUnified({ query: q, filter: f, phase, limit: 30 });
          setResults(foods);
          setHasSearched(true);
        } catch {
          // Ignore abort errors
        } finally {
          setLoading(false);
        }
      }, 350);
    },
    [phase],
  );

  useEffect(() => {
    runSearch(query, filter);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, filter, runSearch]);

  // ── Favourite toggle ──────────────────────────────────────────────────────

  async function handleToggleFav(food: UnifiedFood) {
    const isFav = favUids.has(food.uid.replace(/^[^:]+:/, (m) => {
      const src = m.slice(0, -1);
      return `${src}:`;
    })) || favUids.has(food.uid.slice(food.uid.indexOf(":")));

    const uidKey = food.uid;
    if (favUids.has(uidKey)) {
      setFavUids(prev => { const s = new Set(prev); s.delete(uidKey); return s; });
      await removeFavorite(uidKey);
    } else {
      setFavUids(prev => new Set(prev).add(uidKey));
      await addFavorite(food);
    }
  }

  // ── Barcode flow ──────────────────────────────────────────────────────────

  async function handleBarcodeDetected(barcode: string) {
    setShowScanner(false);
    setBarcodeMsg("Looking up barcode…");
    const food = await lookupBarcodeUnified(barcode);
    setBarcodeMsg(null);
    if (food) {
      setSelectedFood(food);
    } else {
      setBarcodeMsg(`Barcode ${barcode} not found in Open Food Facts. Try searching by name.`);
      setTimeout(() => setBarcodeMsg(null), 4000);
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function emptyLabel() {
    if (filter === "recent")   return "No recent foods — start logging to see them here.";
    if (filter === "my_foods") return "No custom foods yet. Create one from any search result.";
    if (!query.trim())         return null; // no message before user types
    return `No results for "${query}".`;
  }

  return (
    <>
      {/* Barcode scanner overlay */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Food detail / log modal */}
      {selectedFood && (
        <FoodDetailModal
          food={selectedFood}
          phase={phase}
          cycleDay={cycleDay}
          onClose={() => setSelectedFood(null)}
          onLogged={() => { setSelectedFood(null); onLogged(); }}
        />
      )}

      <div
        className="rounded-2xl overflow-hidden mb-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-dark">Search food</p>
            <button
              onClick={onCancel}
              className="text-dark/30 text-lg leading-none w-7 h-7 flex items-center justify-center rounded-full active:bg-ghost"
            >
              ✕
            </button>
          </div>

          {/* Search bar + barcode button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30 text-sm pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                placeholder="Chicken breast, oats, Kit Kat…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-background rounded-xl pl-8 pr-8 py-2.5 text-sm text-dark outline-none placeholder:text-dark/25 font-body"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/30 text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>

            {/* Barcode button */}
            <button
              onClick={() => setShowScanner(true)}
              aria-label="Scan barcode"
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
              style={{ background: `${phaseColor}15`, color: phaseColor }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M21 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3"/>
                <line x1="8" y1="8" x2="8" y2="16"/><line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="16" y1="8" x2="16" y2="16"/>
              </svg>
            </button>
          </div>

          {/* Barcode status message */}
          {barcodeMsg && (
            <p className="text-xs font-body mt-2 px-1" style={{ color: phaseColor }}>
              {barcodeMsg}
            </p>
          )}
        </div>

        {/* ── Filter tabs ──────────────────────────────────────────────────── */}
        <div
          className="flex gap-0 border-b border-[var(--color-border)]"
          style={{ overflowX: "auto", scrollbarWidth: "none" }}
        >
          {FILTERS.map(f => {
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="flex-shrink-0 flex items-center gap-1 px-3.5 py-2.5 text-xs font-semibold transition-all relative whitespace-nowrap"
                style={{ color: isActive ? phaseColor : "var(--color-text-mid)" }}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: phaseColor }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Phase hint banner (only on All tab when no query typed) ──────── */}
        {filter === "all" && !query.trim() && (
          <div
            className="px-4 py-2.5 flex items-center gap-2 border-b border-[var(--color-border)]"
            style={{ background: `${phaseColor}08` }}
          >
            <span className="text-sm flex-shrink-0">{phaseHint.icon}</span>
            <p className="text-[11px] font-body" style={{ color: `${phaseColor}cc` }}>
              {phaseHint.text}
            </p>
          </div>
        )}

        {/* ── Results list ─────────────────────────────────────────────────── */}
        <div className="max-h-[22rem] overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <span className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{ borderColor: `${phaseColor}30`, borderTopColor: phaseColor }} />
              <span className="text-xs text-dark/30 font-body">
                {filter === "branded" ? "Searching Open Food Facts…"
                 : filter === "generic" ? "Searching USDA database…"
                 : "Searching…"}
              </span>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              {filter === "all" && !hasSearched ? (
                <>
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-sm font-semibold text-dark mb-1">Search 3M+ foods</p>
                  <p className="text-xs text-dark/40 font-body">
                    Branded foods via Open Food Facts · Whole foods via USDA · Your HerPhase recipes
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {["Chicken", "Greek yogurt", "Oat", "Salmon", "Banana"].map(s => (
                      <button
                        key={s}
                        onClick={() => setQuery(s)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold"
                        style={{ background: `${phaseColor}12`, color: phaseColor }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-dark/30 font-body">{emptyLabel()}</p>
              )}
            </div>
          ) : (
            <div>
              {/* Result count */}
              <div className="px-4 py-1.5 border-b border-[var(--color-border)]"
                style={{ background: "var(--color-ghost)" }}>
                <p className="text-[10px] text-dark/30 font-body">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                  {query.trim() ? ` for "${query}"` : ""}
                  {filter !== "all" ? ` · ${FILTERS.find(f => f.id === filter)?.label}` : ""}
                </p>
              </div>
              {results.map(food => (
                <FoodResultCard
                  key={food.uid}
                  food={food}
                  phaseColor={phaseColor}
                  isFavorite={favUids.has(food.uid)}
                  onSelect={setSelectedFood}
                  onToggleFav={handleToggleFav}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer: source attribution ────────────────────────────────────── */}
        <div className="px-4 py-2 border-t border-[var(--color-border)]"
          style={{ background: "var(--color-ghost)" }}>
          <p className="text-[9px] text-dark/20 font-body text-center">
            Food data: Open Food Facts (CC BY-SA) · USDA FoodData Central · HerPhase recipes
          </p>
        </div>
      </div>
    </>
  );
}
