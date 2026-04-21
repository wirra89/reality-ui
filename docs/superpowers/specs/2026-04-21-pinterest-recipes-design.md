# Pinterest Recipes Seed — Design Spec
**Date:** 2026-04-21
**Status:** Approved

## Summary

Add 50 high-protein, Pinterest-style recipes to the HerPhase `recipes` table via a new SQL migration. Each recipe is phase-assigned based on its nutritional profile so the scoring engine can surface it at the right point in the user's cycle.

## Delivery

**Single file:** `supabase/migrations/011_seed_pinterest_recipes.sql`

All 50 recipes are inserted in one migration. Slugs use a `pinterest-` prefix to avoid collisions with the existing recipe seed data.

## Phase Assignment Strategy

Recipes are assigned to phases based on the dominant nutrient that benefits that phase:

| Nutritional signal | Phase(s) |
|---|---|
| Zinc / heme iron (beef, steak, shrimp) | ovulation (LH surge), menstrual (blood replenishment) |
| Omega-3 (salmon, tuna) | menstrual (anti-inflammatory), luteal (PMS reduction) |
| Tryptophan (turkey, cottage cheese) | luteal (serotonin support) |
| Phytoestrogens / DIM (tofu, chickpeas, broccoli) | follicular (oestrogen support) |
| High carb + lean protein (chicken, egg white) | ovulation, follicular (performance fuel) |
| Magnesium / casein (cottage cheese, PB, dark choc) | luteal (craving/PMS support) |
| Slow-release carbs + protein (oats, overnight oats) | follicular, luteal (blood sugar stability) |
| All-phase versatile (egg muffins, protein balls) | all 4 phases |

## Recipe Categories

### Protein Bowls (15)
1. Chicken Avocado Rice Bowl → follicular, ovulation
2. Salmon Quinoa Bowl → menstrual, follicular
3. Spicy Tuna Poke Bowl → ovulation
4. Beef Teriyaki Bowl → ovulation, menstrual
5. Greek Chicken Bowl → follicular, ovulation
6. Turkey Taco Bowl → luteal
7. Shrimp Garlic Rice Bowl → ovulation
8. Cottage Cheese Power Bowl → luteal
9. Egg + Potato Breakfast Bowl → menstrual, follicular
10. Peanut Chicken Bowl → follicular, ovulation
11. Steak Chimichurri Bowl → ovulation
12. Mediterranean Chickpea Bowl → luteal
13. Buffalo Chicken Bowl → ovulation, follicular
14. BBQ Beef Bowl → ovulation
15. Tofu Sesame Bowl → follicular

### Wraps & Quick Meals (10)
16. Chicken Avocado Wrap → follicular, ovulation
17. Tuna Yogurt Wrap → follicular, ovulation
18. Turkey Lettuce Wrap → luteal
19. Egg White Breakfast Wrap → ovulation
20. Cottage Cheese Tortilla Wrap → luteal
21. Beef Fajita Wrap → ovulation
22. Buffalo Chicken Wrap → ovulation, follicular
23. Salmon Spinach Wrap → menstrual, luteal
24. Greek Yogurt Chicken Wrap → follicular
25. Low-Carb Steak Wrap → ovulation, luteal

### Breakfast (10)
26. Protein Overnight Oats → follicular, luteal
27. Greek Yogurt + Berries Bowl → follicular, ovulation
28. Protein Pancakes → ovulation, follicular
29. Egg Muffins Meal Prep → menstrual, follicular, ovulation, luteal
30. Cottage Cheese Scrambled Eggs → luteal
31. Peanut Butter Protein Oats → follicular, luteal
32. Banana Protein Smoothie → ovulation, follicular
33. Avocado Egg Toast → luteal, menstrual
34. Egg + Turkey Breakfast Plate → ovulation, follicular
35. Yogurt Granola Protein Bowl → follicular, ovulation

### Simple Dinners (10)
36. Chicken Broccoli Meal Prep → follicular
37. Steak Salad → ovulation
38. Salmon + Asparagus → menstrual, luteal
39. One-Pan Chicken Veggies → follicular, luteal
40. Garlic Butter Shrimp → ovulation
41. Turkey Meatballs + Rice → luteal, follicular
42. Chicken Stir Fry → follicular, ovulation
43. Beef + Sweet Potato Skillet → ovulation, menstrual
44. Tuna Pasta High-Protein → ovulation, follicular
45. Lemon Chicken + Potatoes → follicular, ovulation

### Snacks & Desserts (5)
46. Protein Balls → luteal, follicular
47. Greek Yogurt Dessert → follicular, luteal
48. Protein Brownies → luteal
49. Cottage Cheese Cheesecake → luteal
50. Peanut Butter Protein Cookies → luteal, follicular

## Schema Contract

Each INSERT populates all required columns per `010_recipes.sql` + `012_recipe_description.sql`:

```
slug, name, phases[], meal_types[], prep_time_min, cook_time_min,
difficulty, macro_profile, goals[], phase_tags[], symptom_tags[],
energy_tags[], calories, protein_g, carbs_g, fat_g, fiber_g,
ingredients[], instructions[], has_real_instructions,
is_vegetarian, is_pescatarian, is_high_protein, is_comfort_meal,
is_low_bloat, sort_priority, image_url, benefits, description
```

- `is_quick` is a generated column (prep_time_min ≤ 15) — not inserted
- `is_high_protein: true` where protein_g ≥ 30
- `has_real_instructions: true` for all 50 (full steps included)
- `image_url: null` for all (images added later)
- `sort_priority: 0` for all

## Scoring Engine Wiring

Tags are chosen to fire the engine's existing maps:

| Tag | Engine map | Effect |
|---|---|---|
| `anti_inflammatory` | SYMPTOM_TAG_MAP → cramps | +8 score when user reports cramps |
| `mood_support`, `magnesium_support` | SYMPTOM_TAG_MAP → low_mood | +8 score for low mood |
| `steady_energy`, `iron_support` | SYMPTOM_TAG_MAP → fatigue | +8 score for fatigue |
| `anti_bloat` | SYMPTOM_TAG_MAP → bloating | +8 score for bloating |
| `high_protein`, `performance` | GOAL_TAG_MAP → muscle_gain/recomp | +5 per match |
| `light_fuel`, `lean_build` | GOAL_TAG_MAP → fat_loss | +5 per match |
| `low_energy` | energy_tags | +12 when energy ≤ 2 |

## No App Code Changes Required

The migration is purely additive. The existing `getRecipesForPhase` query, scoring engine, and UI components handle new recipes automatically.
