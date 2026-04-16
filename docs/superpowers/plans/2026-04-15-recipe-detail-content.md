# Recipe Detail Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `description` field to the recipe data model, gate the recipe accordion on `has_real_instructions`, and populate 8 high-priority recipes (2 per phase) with real descriptions, weighted ingredients, and concise 3–4-step cooking guides.

**Architecture:** Three-task sequence — (1) DB migration + type + query layer, (2) UI accordion shows description and only renders for real-content recipes, (3) SQL UPDATE populates 8 seed recipes with real content and flips `has_real_instructions = true`. No new files created; all changes are additive to existing files.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (PostgreSQL), Vitest

---

## File Map

| File | Change |
|---|---|
| `supabase/migrations/012_recipe_description.sql` | CREATE — adds `description text NOT NULL DEFAULT ''` to `public.recipes` |
| `types/recipe.ts` | MODIFY — add `description: string` to `Recipe` interface |
| `lib/recipeQueries.ts` | MODIFY — map `description` in `dbRowToRecipe` |
| `components/MealRecommendationCards.tsx` | MODIFY — gate accordion on `has_real_instructions`, add description row inside accordion |

---

## Task 1: DB migration + type + query mapping

**Files:**
- Create: `supabase/migrations/012_recipe_description.sql`
- Modify: `types/recipe.ts`
- Modify: `lib/recipeQueries.ts`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/012_recipe_description.sql`:

```sql
-- Add description field to recipes.
-- Short 1–2 sentence summary of the dish shown inside the recipe accordion.
-- Empty string default means existing rows are unaffected.
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the Supabase MCP tool `apply_migration` with:
- `project_id`: `nngkzdriribywaqnkbui`
- `name`: `012_recipe_description`
- `query`: contents of the migration file above

Expected: `{"success":true}`

- [ ] **Step 3: Add `description` to the `Recipe` interface**

In `types/recipe.ts`, the `Recipe` interface currently ends with:
```typescript
  benefits: string;
}
```

Change it to:
```typescript
  benefits: string;
  description: string;
}
```

- [ ] **Step 4: Map `description` in `dbRowToRecipe`**

In `lib/recipeQueries.ts`, `dbRowToRecipe` currently ends with:
```typescript
    benefits:              (row.benefits as string) ?? "",
  };
}
```

Change it to:
```typescript
    benefits:              (row.benefits as string) ?? "",
    description:           (row.description as string) ?? "",
  };
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run from `C:\Users\Wirra89\Downloads\herphase`:
```bash
npx tsc --noEmit
```
Expected: no errors. If you see "Property 'description' does not exist on type 'Recipe'", the type edit in Step 3 was missed.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/012_recipe_description.sql types/recipe.ts lib/recipeQueries.ts
git commit -m "feat: add description field to Recipe type and DB schema"
```

---

## Task 2: Update accordion UI

**Files:**
- Modify: `components/MealRecommendationCards.tsx` (lines ~277, ~426–464)

The accordion currently shows for every recipe that has ingredients (`recipe.ingredients.length > 0`). The spec requires it only shows for recipes with real content. Inside the accordion, a new description row must appear above the ingredients when non-empty.

- [ ] **Step 1: Gate `showAccordion` on `has_real_instructions`**

In `components/MealRecommendationCards.tsx`, find (line ~277):
```typescript
            const showAccordion = recipe.ingredients.length > 0;
```

Replace with:
```typescript
            const showAccordion = recipe.has_real_instructions;
```

This means the Recipe button only appears for recipes that have been populated with real content (Task 3 sets this flag).

- [ ] **Step 2: Add description row inside accordion, keep existing ingredients + steps**

Find the entire `{/* Recipe accordion */}` block (lines ~426–464):
```tsx
                {/* Recipe accordion */}
                {isOpen && showAccordion && (
                  <div
                    className="mx-4 mb-4 rounded-xl px-4 py-3"
                    style={{ background: "rgba(0,0,0,0.2)", borderTop: `2px solid ${color}33` }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: `${color}99` }}>
                      Ingredients
                    </p>
                    <ul className={recipe.has_real_instructions ? "mb-4 space-y-1" : "space-y-1"}>
                      {recipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs font-body text-white/70">
                          <span className="mt-0.5 flex-shrink-0" style={{ color }}>•</span>
                          <span>{ing}</span>
                        </li>
                      ))}
                    </ul>
                    {recipe.has_real_instructions && recipe.instructions.length > 0 && (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wider mt-4 mb-2" style={{ color: `${color}99` }}>
                          Preparation
                        </p>
                        <ol className="space-y-2">
                          {recipe.instructions.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs font-body text-white/70">
                              <span
                                className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold leading-none"
                                style={{ background: `${color}33`, color }}
                              >
                                {idx + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </>
                    )}
                  </div>
                )}
```

Replace with:
```tsx
                {/* Recipe accordion — only rendered when has_real_instructions */}
                {isOpen && showAccordion && (
                  <div
                    className="mx-4 mb-4 rounded-xl px-4 py-3"
                    style={{ background: "rgba(0,0,0,0.2)", borderTop: `2px solid ${color}33` }}
                  >
                    {/* Description */}
                    {recipe.description && (
                      <p className="text-xs font-body leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>
                        {recipe.description}
                      </p>
                    )}

                    {/* Ingredients */}
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: `${color}99` }}>
                      Ingredients
                    </p>
                    <ul className="mb-4 space-y-1">
                      {recipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs font-body text-white/70">
                          <span className="mt-0.5 flex-shrink-0" style={{ color }}>•</span>
                          <span>{ing}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Preparation steps */}
                    {recipe.instructions.length > 0 && (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: `${color}99` }}>
                          Preparation
                        </p>
                        <ol className="space-y-2">
                          {recipe.instructions.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs font-body text-white/70">
                              <span
                                className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold leading-none"
                                style={{ background: `${color}33`, color }}
                              >
                                {idx + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </>
                    )}
                  </div>
                )}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors. The `recipe.description` access is valid because Task 1 added it to the type.

- [ ] **Step 4: Commit**

```bash
git add components/MealRecommendationCards.tsx
git commit -m "feat: show recipe description in accordion, gate on has_real_instructions"
```

---

## Task 3: Populate 8 high-priority recipes with real content

**Files:** No code files — SQL UPDATEs only via Supabase MCP `execute_sql`.

8 recipes are chosen: 2 per phase (one breakfast-eligible, one lunch/dinner-only). These are the ones most likely to surface first across all 4 phases given the engine's scoring and slot assignment.

All 8 UPDATEs set `has_real_instructions = true`. After this task the Recipe button will appear on these 8 cards.

- [ ] **Step 1: Update menstrual recipes (2 recipes)**

Execute via Supabase MCP `execute_sql` (`project_id`: `nngkzdriribywaqnkbui`):

```sql
-- Menstrual #1: Beef Power Bowl (lunch/dinner)
UPDATE public.recipes SET
  description        = 'A warming iron-rich bowl built to support your body during menstruation. Lean beef and spinach deliver iron and protein while rice keeps energy steady.',
  ingredients        = ARRAY[
    '150g lean beef mince',
    '80g cooked white rice',
    '60g fresh baby spinach',
    '1 tsp olive oil',
    '½ tsp garlic powder',
    'Salt and pepper to taste'
  ],
  instructions       = ARRAY[
    'Season beef with garlic powder, salt and pepper. Heat olive oil in a pan over medium-high heat and cook for 5–6 min, breaking apart until browned.',
    'While beef cooks, microwave or heat your rice until steaming.',
    'Plate the rice, top with beef and fresh spinach. The heat from the beef will gently wilt the spinach as you serve.'
  ],
  has_real_instructions = true
WHERE slug = 'beef-power-bowl-1';

-- Menstrual #2: Egg Comfort Wrap (breakfast/lunch/dinner)
UPDATE public.recipes SET
  description        = 'A protein-rich wrap that feels grounding and easy to digest. Eggs and spinach on wholegrain toast give you steady energy without heaviness — ideal when your appetite is lower.',
  ingredients        = ARRAY[
    '3 large eggs',
    '40g fresh baby spinach',
    '1 slice wholegrain bread',
    '½ tsp olive oil',
    'Pinch of salt and pepper'
  ],
  instructions       = ARRAY[
    'Scramble eggs with salt and pepper in a lightly oiled pan over medium heat, stirring gently for 2–3 min until just set and creamy.',
    'Toast the wholegrain bread while the eggs finish cooking.',
    'Top toast with fresh spinach then spoon over the scrambled eggs. Serve immediately.'
  ],
  has_real_instructions = true
WHERE slug = 'egg-comfort-wrap-4';
```

- [ ] **Step 2: Update follicular recipes (2 recipes)**

Execute via Supabase MCP `execute_sql`:

```sql
-- Follicular #1: Chicken Power Bowl (lunch/dinner)
UPDATE public.recipes SET
  description        = 'A clean, high-protein bowl perfect for the follicular phase when your body is primed to build. Quinoa adds a complete amino acid profile alongside grilled chicken.',
  ingredients        = ARRAY[
    '150g chicken breast, sliced thin',
    '80g cooked quinoa',
    '70g cucumber, diced',
    '1 tsp olive oil',
    '½ tsp mixed dried herbs',
    'Salt and pepper to taste'
  ],
  instructions       = ARRAY[
    'Season chicken with herbs, salt and pepper. Heat oil in a pan over medium-high and cook slices 4–5 min each side until cooked through.',
    'While chicken rests, cook or reheat quinoa per packet instructions.',
    'Assemble bowl: quinoa base, sliced chicken and cucumber on top. Drizzle with any resting juices from the pan.'
  ],
  has_real_instructions = true
WHERE slug = 'chicken-power-bowl-31';

-- Follicular #2: Egg White Comfort Salad (breakfast/lunch/dinner)
UPDATE public.recipes SET
  description        = 'Light and protein-forward — egg whites give you clean protein without extra fat, and salty feta with earthy mushrooms make this satisfying without feeling heavy.',
  ingredients        = ARRAY[
    '4 large egg whites (or 120ml carton egg whites)',
    '80g mushrooms, sliced',
    '30g feta cheese, crumbled',
    '½ tsp olive oil',
    'Salt, pepper and fresh herbs to taste'
  ],
  instructions       = ARRAY[
    'Heat olive oil in a non-stick pan over medium heat. Add mushrooms and sauté 3–4 min until golden and any moisture has cooked off.',
    'Pour egg whites into the pan, season with salt and pepper, and stir gently for 2 min until just set.',
    'Plate immediately and top with crumbled feta and fresh herbs.'
  ],
  has_real_instructions = true
WHERE slug = 'egg-white-comfort-salad-34';
```

- [ ] **Step 3: Update ovulation recipes (2 recipes)**

Execute via Supabase MCP `execute_sql`:

```sql
-- Ovulation #1: Salmon Poke Bowl (lunch/dinner)
UPDATE public.recipes SET
  description        = 'A fresh, light poke-style bowl designed for ovulation phase when your digestion is at its best. Omega-3s from salmon support anti-inflammatory hormone balance.',
  ingredients        = ARRAY[
    '130g fresh salmon fillet, cut into 2cm cubes',
    '100g cooked sushi rice',
    '60g avocado (approx ½ medium), sliced',
    '1 tsp low-sodium soy sauce',
    '½ tsp rice vinegar',
    '1 tsp sesame seeds'
  ],
  instructions       = ARRAY[
    'Toss salmon cubes with soy sauce and rice vinegar. Leave to marinate for 5 min while you prep everything else.',
    'Cook or reheat sushi rice and pack firmly into a bowl.',
    'Arrange marinated salmon and avocado slices over rice. Sprinkle with sesame seeds and serve immediately.'
  ],
  has_real_instructions = true
WHERE slug = 'salmon-poke-bowl-61';

-- Ovulation #2: Egg Rice Bowl (breakfast/lunch/dinner)
UPDATE public.recipes SET
  description        = 'A clean, satisfying bowl that works for any meal of the day. Creamy avocado and fresh tomato keep it light and anti-bloat — ideal during ovulation when digestion is smooth.',
  ingredients        = ARRAY[
    '2 large eggs',
    '80g cooked rice',
    '60g avocado (approx ½ medium), sliced',
    '1 medium tomato, diced',
    '½ tsp olive oil',
    'Salt and pepper to taste'
  ],
  instructions       = ARRAY[
    'Heat olive oil in a non-stick pan over medium heat. Cook eggs to your preference — fried (3 min), scrambled (2 min stirring), or poached (3 min in simmering water).',
    'Warm or reheat rice until steaming.',
    'Plate the rice, arrange avocado and diced tomato alongside, and top with eggs. Season and serve.'
  ],
  has_real_instructions = true
WHERE slug = 'egg-rice-bowl-65';
```

- [ ] **Step 4: Update luteal recipes (2 recipes)**

Execute via Supabase MCP `execute_sql`:

```sql
-- Luteal #1: Chicken Power Bowl (lunch/dinner)
UPDATE public.recipes SET
  description        = 'A hearty, comforting bowl designed to steady energy and curb cravings in the luteal phase. Sweet potato provides slow-release carbs and magnesium to support mood.',
  ingredients        = ARRAY[
    '150g chicken breast, diced',
    '100g sweet potato, cut into 1cm cubes',
    '80g cooked white rice',
    '1 tsp olive oil, divided',
    '½ tsp smoked paprika',
    'Salt and pepper to taste'
  ],
  instructions       = ARRAY[
    'Toss sweet potato cubes in ½ tsp oil and paprika. Roast at 200°C for 20 min until tender and lightly caramelised — or microwave covered for 5 min as a shortcut.',
    'Season chicken and cook in remaining oil over medium-high heat for 5–6 min, turning once, until cooked through.',
    'Warm rice. Assemble the bowl with rice as base, then chicken and sweet potato. Season to taste and serve.'
  ],
  has_real_instructions = true
WHERE slug = 'chicken-power-bowl-91';

-- Luteal #2: Egg Comfort Skillet (breakfast/lunch/dinner)
UPDATE public.recipes SET
  description        = 'A warming skillet that hits protein, carbs and fat in one pan — exactly what you need in the luteal phase to feel full, calm and energised without blood sugar spikes.',
  ingredients        = ARRAY[
    '3 large eggs',
    '150g potato (approx 1 medium), diced small',
    '30g cheddar cheese, grated',
    '½ tsp olive oil',
    '½ tsp mixed dried herbs',
    'Salt and pepper to taste'
  ],
  instructions       = ARRAY[
    'Boil diced potato in salted water for 5 min until just tender, then drain. (Or microwave with a splash of water, covered, for 4 min.)',
    'Heat oil in an oven-safe pan over medium heat. Add potato and cook 3–4 min until golden. Push to one side and crack eggs into the pan, stirring gently for 2 min until mostly set.',
    'Combine potato and eggs, scatter grated cheese over the top, cover with a lid for 1 min to melt. Season with herbs and serve straight from the pan.'
  ],
  has_real_instructions = true
WHERE slug = 'egg-comfort-skillet-94';
```

- [ ] **Step 5: Verify 8 rows updated**

Execute via Supabase MCP `execute_sql`:
```sql
SELECT slug, description, has_real_instructions
FROM public.recipes
WHERE has_real_instructions = true
ORDER BY id;
```
Expected: 8 rows, each with a non-empty `description` and `has_real_instructions = true`.

- [ ] **Step 6: Deploy to Vercel**

Run from `C:\Users\Wirra89\Downloads\herphase`:
```bash
npx vercel deploy --prod
```
Expected: exit code 0. The 8 recipe cards will now show a Recipe button that opens description + ingredients + steps.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/012_recipe_description.sql
git commit -m "content: populate 8 real recipes with description, ingredients, and steps"
```

---

## Self-Review

**Spec coverage:**
- ✅ Short recipe description in expandable section → `description` field + accordion first row
- ✅ Ingredients list with weights/units → real weight strings in `ingredients[]`
- ✅ 3–4 step prep/cook guide → 3-step `instructions[]` per recipe
- ✅ Update data model and DB schema → `012_recipe_description` migration + `types/recipe.ts`
- ✅ Don't show dropdown for recipes without real content → `showAccordion = recipe.has_real_instructions`
- ✅ Enable UI + data structure first (Tasks 1+2), then populate (Task 3)
- ✅ High-priority recipes = 2 per phase, breakfast-eligible + lunch/dinner covered

**Placeholder scan:** None found. All SQL values, ingredient strings, instruction steps, and file paths are concrete.

**Type consistency:** `recipe.description` added in Task 1 Step 3, mapped in Task 1 Step 4, read in Task 2 Step 2. Consistent across all tasks.
