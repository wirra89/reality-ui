// lib/usdaFoodData.ts
// USDA FoodData Central API wrapper — whole foods + generic ingredient search.
// Free API key at https://fdc.nal.usda.gov/api-key-signup.html
// Env: NEXT_PUBLIC_USDA_API_KEY. Falls back to DEMO_KEY (30 req/hr).

export interface USDAFood {
  fdcId:          number;
  name:           string;
  brand:          string | null;
  dataType:       string;
  kcalPer100g:    number;
  proteinPer100g: number;
  carbsPer100g:   number;
  fatsPer100g:    number;
  fiberPer100g:   number | null;
  servingSizeG:   number | null;
  confidence:     "high" | "medium" | "low";
}

const BASE = "https://api.nal.usda.gov/fdc/v1";

function apiKey(): string {
  return (typeof process !== "undefined" && process.env.NEXT_PUBLIC_USDA_API_KEY)
    ? process.env.NEXT_PUBLIC_USDA_API_KEY
    : "DEMO_KEY";
}

// Nutrient IDs from FDC nutrient list
const NID = {
  kcal:    1008,
  protein: 1003,
  carbs:   1005,
  fat:     1004,
  fiber:   1079,
} as const;

function getNutrient(
  nutrients: Array<{ nutrientId?: number; value?: number }>,
  id: number,
): number {
  return nutrients.find(n => n.nutrientId === id)?.value ?? 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFood(f: Record<string, any>): USDAFood | null {
  const nutrients = (f.foodNutrients ?? []) as Array<{ nutrientId?: number; value?: number }>;
  const kcal    = getNutrient(nutrients, NID.kcal);
  const protein = getNutrient(nutrients, NID.protein);
  const carbs   = getNutrient(nutrients, NID.carbs);
  const fat     = getNutrient(nutrients, NID.fat);
  const fiber   = getNutrient(nutrients, NID.fiber);

  if (!f.description || kcal === 0) return null;

  const confidence: USDAFood["confidence"] =
    kcal > 0 && protein > 0 ? "high" : kcal > 0 ? "medium" : "low";

  return {
    fdcId:          Number(f.fdcId),
    name:           String(f.description).trim(),
    brand:          f.brandOwner ?? f.brandName ?? null,
    dataType:       f.dataType ?? "Unknown",
    kcalPer100g:    Math.round(kcal),
    proteinPer100g: Math.round(protein * 10) / 10,
    carbsPer100g:   Math.round(carbs   * 10) / 10,
    fatsPer100g:    Math.round(fat     * 10) / 10,
    fiberPer100g:   fiber > 0 ? Math.round(fiber * 10) / 10 : null,
    servingSizeG:   f.servingSize ? Number(f.servingSize) : null,
    confidence,
  };
}

export async function searchUSDA(query: string, limit = 20): Promise<USDAFood[]> {
  if (!query.trim()) return [];
  try {
    const url =
      `${BASE}/foods/search` +
      `?query=${encodeURIComponent(query.trim())}` +
      `&api_key=${apiKey()}` +
      `&pageSize=${limit}` +
      `&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.foods ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((f: any) => mapFood(f))
      .filter((f: USDAFood | null): f is USDAFood => f !== null)
      .slice(0, limit);
  } catch {
    return [];
  }
}
