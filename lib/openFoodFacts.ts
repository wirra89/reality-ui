// lib/openFoodFacts.ts
// Open Food Facts API wrapper — branded food search + barcode lookup.
// No API key required. Rate limit: ~10 req/s sustained; burst is fine for mobile.

export interface OFFFood {
  barcode:          string;
  name:             string;
  brand:            string | null;
  kcalPer100g:      number;
  proteinPer100g:   number;
  carbsPer100g:     number;
  fatsPer100g:      number;
  fiberPer100g:     number | null;
  servingSizeG:     number | null;
  servingSizeLabel: string | null;
  nutriscore:       "a" | "b" | "c" | "d" | "e" | null;
  confidence:       "high" | "medium" | "low";
}

const BASE   = "https://world.openfoodfacts.org";
const FIELDS = "code,product_name,brands,nutriments,serving_size,serving_quantity,nutriscore_grade";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(p: Record<string, any>): OFFFood | null {
  const n    = p.nutriments ?? {};
  const kcal = n["energy-kcal_100g"] ?? (n["energy_100g"] ? n["energy_100g"] / 4.184 : null);
  if (!p.product_name || kcal == null || Number(kcal) <= 0) return null;

  const protein = Number(n["proteins_100g"]       ?? 0);
  const carbs   = Number(n["carbohydrates_100g"]   ?? 0);
  const fat     = Number(n["fat_100g"]             ?? 0);
  const fiber   = n["fiber_100g"] != null ? Number(n["fiber_100g"]) : null;

  const confidence: OFFFood["confidence"] =
    kcal > 0 && protein > 0 && carbs >= 0 ? "high"
    : kcal > 0                             ? "medium"
    :                                        "low";

  const rawServing = p.serving_quantity ? Number(p.serving_quantity) : null;

  return {
    barcode:          String(p.code ?? ""),
    name:             String(p.product_name).trim(),
    brand:            p.brands ? String(p.brands).split(",")[0].trim() : null,
    kcalPer100g:      Math.round(Number(kcal)),
    proteinPer100g:   Math.round(protein * 10) / 10,
    carbsPer100g:     Math.round(carbs   * 10) / 10,
    fatsPer100g:      Math.round(fat     * 10) / 10,
    fiberPer100g:     fiber != null ? Math.round(fiber * 10) / 10 : null,
    servingSizeG:     rawServing,
    servingSizeLabel: p.serving_size ? String(p.serving_size) : null,
    nutriscore:       p.nutriscore_grade ?? null,
    confidence,
  };
}

export async function searchOFF(query: string, limit = 20): Promise<OFFFood[]> {
  if (!query.trim()) return [];
  try {
    const url =
      `${BASE}/cgi/search.pl` +
      `?search_terms=${encodeURIComponent(query.trim())}` +
      `&json=true&page_size=${limit}&fields=${FIELDS}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.products ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => mapProduct(p))
      .filter((p: OFFFood | null): p is OFFFood => p !== null)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function lookupBarcode(barcode: string): Promise<OFFFood | null> {
  if (!barcode.trim()) return null;
  try {
    const url = `${BASE}/api/v2/product/${encodeURIComponent(barcode.trim())}.json?fields=${FIELDS}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    return mapProduct({ ...data.product, code: barcode });
  } catch {
    return null;
  }
}
