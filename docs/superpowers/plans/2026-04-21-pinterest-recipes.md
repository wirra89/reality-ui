# Pinterest Recipes Seed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed 50 high-protein Pinterest-style recipes into the Supabase `recipes` table via a single SQL migration file.

**Architecture:** One new migration file `supabase/migrations/011_seed_pinterest_recipes.sql` containing 50 INSERT statements. No app code changes required — the existing query layer, scoring engine, and UI handle new rows automatically. Slugs are prefixed `pinterest-` to avoid collisions with existing seeds.

**Tech Stack:** PostgreSQL / Supabase, SQL, Supabase MCP (`mcp__claude_ai_Supabase__execute_sql` or dashboard SQL editor)

---

## File Map

| Action | Path |
|---|---|
| Create | `supabase/migrations/011_seed_pinterest_recipes.sql` |

---

### Task 1: Create the migration file

**Files:**
- Create: `supabase/migrations/011_seed_pinterest_recipes.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/011_seed_pinterest_recipes.sql` with the exact content below:

```sql
-- supabase/migrations/011_seed_pinterest_recipes.sql
-- 50 Pinterest-style high-protein recipes for HerPhase.
-- Slugs prefixed pinterest- to avoid collision with existing seeds.
-- is_quick is a generated column (prep_time_min <= 15) — not inserted.

INSERT INTO public.recipes (
  slug, name, phases, meal_types, prep_time_min, cook_time_min, difficulty,
  macro_profile, goals, phase_tags, symptom_tags, energy_tags,
  calories, protein_g, carbs_g, fat_g, fiber_g,
  ingredients, instructions, has_real_instructions,
  is_vegetarian, is_pescatarian, is_high_protein, is_comfort_meal, is_low_bloat,
  sort_priority, image_url, benefits, description
) VALUES

-- ── PROTEIN BOWLS (1–15) ─────────────────────────────────────────────────────

(
  'pinterest-chicken-avocado-rice-bowl',
  'Chicken Avocado Rice Bowl',
  ARRAY['follicular','ovulation'],
  ARRAY['lunch','dinner'],
  10, 15, 'easy', 'high_protein',
  ARRAY['muscle_gain','recomp','performance'],
  ARRAY['performance','lean_build','high_protein'],
  ARRAY['steady_energy'],
  ARRAY[]::text[],
  550, 42, 52, 16, 6,
  ARRAY['180g chicken breast','150g cooked white rice','½ avocado sliced','1 tbsp olive oil','Juice of ½ lime','Salt, pepper, paprika','Fresh coriander'],
  ARRAY['Season chicken with paprika, salt, and pepper. Pan-fry in olive oil 6–7 min per side until cooked through.','Rest 2 min then slice thinly.','Spoon rice into a bowl, lay chicken and avocado on top.','Squeeze lime, scatter coriander, and serve.'],
  true, false, false, true, false, false, 0, null,
  'Lean chicken protein supports muscle synthesis during the follicular and ovulation phases when anabolic potential is highest.',
  'A clean, filling rice bowl with juicy sliced chicken, creamy avocado, and a hit of lime — ready in 25 minutes.'
),

(
  'pinterest-salmon-quinoa-bowl',
  'Salmon Quinoa Bowl',
  ARRAY['menstrual','follicular'],
  ARRAY['lunch','dinner'],
  10, 20, 'easy', 'balanced',
  ARRAY['recovery','maintenance'],
  ARRAY['anti_inflammatory','iron_support'],
  ARRAY['anti_inflammatory','cramp_support'],
  ARRAY['steady_energy'],
  520, 38, 42, 18, 6,
  ARRAY['150g salmon fillet','120g cooked quinoa','Handful of spinach','½ cucumber sliced','1 tbsp olive oil','Lemon juice','Salt and pepper'],
  ARRAY['Season salmon and pan-sear in olive oil 4 min each side until cooked through. Set aside.','Fluff quinoa and layer with spinach and cucumber in a bowl.','Flake salmon on top, squeeze lemon, and drizzle any remaining oil.'],
  true, false, true, true, false, false, 0, null,
  'Salmon omega-3s reduce menstrual inflammation; quinoa provides all 9 amino acids for follicular muscle repair.',
  'Flaky pan-seared salmon over fluffy quinoa with fresh spinach — a nutrient-dense bowl that fights cramps and fuels recovery.'
),

(
  'pinterest-spicy-tuna-poke-bowl',
  'Spicy Tuna Poke Bowl',
  ARRAY['ovulation'],
  ARRAY['lunch','dinner'],
  15, 5, 'easy', 'high_protein',
  ARRAY['performance','recomp'],
  ARRAY['performance','high_protein'],
  ARRAY[],
  ARRAY[]::text[],
  490, 40, 48, 12, 5,
  ARRAY['150g sushi-grade tuna diced','150g sushi rice cooked','½ avocado diced','50g edamame shelled','1 tsp sriracha','1 tbsp soy sauce','1 tsp sesame oil','Sesame seeds, spring onion'],
  ARRAY['Cook and season sushi rice with a little rice vinegar. Spread to cool slightly.','Toss diced tuna with soy sauce, sriracha, and sesame oil.','Assemble bowl: rice base, then tuna, avocado, and edamame.','Top with sesame seeds and spring onion.'],
  true, false, true, true, false, false, 0, null,
  'Zinc from tuna supports the LH surge at ovulation; sushi rice provides rapid carb fuel for peak-phase training.',
  'Vibrant poke bowl with spicy sesame tuna, avocado, and edamame over sushi rice — restaurant quality in 20 minutes.'
),

(
  'pinterest-beef-teriyaki-bowl',
  'Beef Teriyaki Bowl',
  ARRAY['ovulation','menstrual'],
  ARRAY['lunch','dinner'],
  10, 15, 'easy', 'high_protein',
  ARRAY['muscle_gain','performance'],
  ARRAY['performance','high_protein','iron_support'],
  ARRAY['anti_inflammatory'],
  ARRAY['steady_energy'],
  580, 44, 55, 14, 4,
  ARRAY['180g sirloin beef strips','150g cooked jasmine rice','1 head broccoli cut into florets','2 tbsp soy sauce','1 tbsp honey','1 tsp sesame oil','1 garlic clove minced','Sesame seeds'],
  ARRAY['Mix soy sauce, honey, sesame oil, and garlic into a teriyaki sauce.','Stir-fry beef strips in a hot pan 3–4 min. Pour over half the sauce, toss to glaze.','Steam broccoli 4 min until tender-crisp.','Plate rice, add beef and broccoli, drizzle remaining sauce, and finish with sesame seeds.'],
  true, false, false, true, false, false, 0, null,
  'Haem iron from beef replenishes menstrual blood loss; zinc supports the LH surge at ovulation.',
  'Sticky teriyaki beef over jasmine rice with steamed broccoli — a 25-minute weeknight bowl that hits protein goals hard.'
),

(
  'pinterest-greek-chicken-bowl',
  'Greek Chicken Bowl',
  ARRAY['follicular','ovulation'],
  ARRAY['lunch','dinner'],
  10, 15, 'easy', 'high_protein',
  ARRAY['muscle_gain','recomp','maintenance'],
  ARRAY['performance','lean_build','high_protein'],
  ARRAY[],
  ARRAY[]::text[],
  520, 42, 38, 18, 5,
  ARRAY['180g chicken breast','100g cooked brown rice or grain','½ cucumber diced','100g cherry tomatoes halved','50g kalamata olives','60g feta crumbled','2 tbsp Greek yogurt dressing','1 tsp dried oregano','Olive oil','Salt and pepper'],
  ARRAY['Season chicken with oregano, olive oil, salt, and pepper. Grill or pan-fry 12–15 min until cooked.','Slice chicken and arrange over rice in a bowl.','Add cucumber, tomatoes, olives, and feta around the bowl.','Drizzle with yogurt dressing and serve.'],
  true, false, false, true, false, false, 0, null,
  'High protein chicken with Mediterranean fats and probiotics from yogurt supports hormone balance during the follicular and ovulation phases.',
  'Grilled chicken over grains with feta, olives, and a creamy yogurt dressing — Mediterranean flavours in a 25-minute bowl.'
),

(
  'pinterest-turkey-taco-bowl',
  'Turkey Taco Bowl',
  ARRAY['luteal'],
  ARRAY['lunch','dinner'],
  10, 15, 'easy', 'high_protein',
  ARRAY['recomp','maintenance','recovery'],
  ARRAY['mood_support','high_protein'],
  ARRAY['mood_support'],
  ARRAY['steady_energy'],
  510, 38, 48, 14, 8,
  ARRAY['180g turkey mince','150g cooked brown rice','1 tin black beans drained','½ red onion diced','1 tsp cumin','1 tsp smoked paprika','Salsa, guacamole, Greek yogurt to serve','Salt and pepper'],
  ARRAY['Cook turkey mince in a hot pan over medium heat, breaking up, 6–8 min until browned.','Season with cumin, paprika, salt, and pepper.','Warm black beans in a small pan.','Build bowl: rice, turkey, beans, salsa, guacamole, and a dollop of Greek yogurt.'],
  true, false, false, true, false, false, 0, null,
  'Turkey is the richest dietary source of tryptophan which converts directly to serotonin, easing luteal phase mood dips.',
  'Spiced turkey mince over brown rice with black beans and guacamole — a satisfying taco bowl that naturally supports mood during PMS.'
),

(
  'pinterest-shrimp-garlic-rice-bowl',
  'Shrimp Garlic Rice Bowl',
  ARRAY['ovulation'],
  ARRAY['lunch','dinner'],
  10, 15, 'easy', 'high_protein',
  ARRAY['performance','recomp'],
  ARRAY['performance','high_protein'],
  ARRAY[],
  ARRAY[]::text[],
  470, 36, 52, 10, 3,
  ARRAY['200g large shrimp peeled and deveined','150g cooked jasmine rice','3 garlic cloves minced','2 tbsp butter','1 tbsp olive oil','Juice of ½ lemon','Fresh parsley','Salt, pepper, chilli flakes'],
  ARRAY['Pat shrimp dry and season with salt, pepper, and chilli flakes.','Heat butter and olive oil in a pan over high heat. Add garlic 30 sec.','Add shrimp and cook 1–2 min per side until pink and slightly charred.','Squeeze lemon over shrimp and toss with parsley. Serve over rice.'],
  true, false, true, true, false, false, 0, null,
  'Shrimp is rich in iodine which supports thyroid function and zinc which aids the LH surge during ovulation.',
  'Juicy garlic butter shrimp served over fragrant jasmine rice — simple, impressive, and ready in 25 minutes.'
),

(
  'pinterest-cottage-cheese-power-bowl',
  'Cottage Cheese Power Bowl',
  ARRAY['luteal'],
  ARRAY['breakfast','snack'],
  5, 0, 'easy', 'high_protein',
  ARRAY['fat_loss','recomp','maintenance'],
  ARRAY['mood_support','high_protein'],
  ARRAY['magnesium_support'],
  ARRAY['low_energy'],
  320, 32, 28, 8, 3,
  ARRAY['200g full-fat cottage cheese','1 tbsp pumpkin seeds','1 tbsp sunflower seeds','Small handful berries','1 tsp honey','Pinch of cinnamon'],
  ARRAY['Spoon cottage cheese into a bowl.','Top with seeds, berries, a drizzle of honey, and a pinch of cinnamon.','Ready to eat immediately.'],
  true, true, false, true, false, false, 0, null,
  'Casein protein in cottage cheese reduces PMS cravings; pumpkin seeds deliver magnesium and zinc for mood support.',
  'Creamy cottage cheese loaded with seeds and berries — a high-protein, no-cook bowl that satisfies luteal phase sweet cravings healthily.'
),

(
  'pinterest-egg-potato-breakfast-bowl',
  'Egg + Potato Breakfast Bowl',
  ARRAY['menstrual','follicular'],
  ARRAY['breakfast'],
  5, 20, 'easy', 'balanced',
  ARRAY['maintenance','recovery'],
  ARRAY['iron_support','steady_energy'],
  ARRAY['recovery'],
  ARRAY['steady_energy'],
  420, 22, 45, 16, 5,
  ARRAY['3 eggs','200g baby potatoes halved','1 handful spinach','1 tbsp olive oil','½ tsp smoked paprika','Salt and pepper','Hot sauce to serve (optional)'],
  ARRAY['Boil potatoes 12–15 min until tender, drain, and let steam dry.','Heat olive oil in a pan, add potatoes, and fry 5 min until crispy. Season with paprika.','Push potatoes aside and crack eggs into the pan. Cook to your liking.','Add spinach to wilt 1 min. Plate everything together and serve with hot sauce.'],
  true, true, false, false, false, false, 0, null,
  'Eggs provide B12 and iron; potatoes give slow-release carbs for sustained energy during the low-energy menstrual phase.',
  'Crispy skillet potatoes with fried eggs and wilted spinach — a hearty one-pan breakfast that replenishes energy and iron.'
),

(
  'pinterest-peanut-chicken-bowl',
  'Peanut Chicken Bowl',
  ARRAY['follicular','ovulation'],
  ARRAY['lunch','dinner'],
  15, 15, 'easy', 'high_protein',
  ARRAY['muscle_gain','performance','recomp'],
  ARRAY['performance','high_protein','balanced_fuel'],
  ARRAY[],
  ARRAY['steady_energy'],
  570, 42, 48, 18, 5,
  ARRAY['180g chicken breast','150g cooked rice noodles or rice','2 tbsp peanut butter','1 tbsp soy sauce','1 tsp sesame oil','1 tsp sriracha','Juice of ½ lime','Shredded carrot, cucumber ribbons, spring onion','Crushed peanuts'],
  ARRAY['Grill or pan-fry chicken 12–15 min. Slice thinly.','Whisk peanut butter, soy sauce, sesame oil, sriracha, lime juice, and 2 tbsp warm water until smooth.','Toss noodles or rice with half the sauce.','Arrange base in bowl, top with chicken and vegetables, drizzle remaining sauce, and finish with crushed peanuts.'],
  true, false, false, true, false, false, 0, null,
  'Complete protein from chicken and healthy fats from peanut butter provide sustained fuel during the high-energy follicular and ovulation phases.',
  'Sliced chicken over noodles in a creamy peanut sesame sauce — bold Thai-inspired flavours with 42g of protein per bowl.'
),

(
  'pinterest-steak-chimichurri-bowl',
  'Steak Chimichurri Bowl',
  ARRAY['ovulation'],
  ARRAY['lunch','dinner'],
  15, 10, 'medium', 'high_protein',
  ARRAY['performance','muscle_gain'],
  ARRAY['performance','high_protein'],
  ARRAY[],
  ARRAY[]::text[],
  600, 48, 38, 24, 4,
  ARRAY['200g sirloin steak','150g cooked white rice or grain','Large handful fresh parsley finely chopped','2 garlic cloves minced','2 tbsp olive oil','1 tbsp red wine vinegar','Pinch of chilli flakes','Salt and pepper'],
  ARRAY['Make chimichurri: mix parsley, garlic, olive oil, red wine vinegar, chilli flakes, and salt. Set aside.','Bring steak to room temperature, season generously with salt and pepper.','Sear in a very hot pan 3 min per side for medium-rare. Rest 3 min before slicing.','Slice steak against the grain and serve over rice, spooning chimichurri generously over the top.'],
  true, false, false, true, false, false, 0, null,
  'Zinc from sirloin steak supports the LH surge at ovulation; iron fuels peak-phase training sessions.',
  'Juicy seared steak sliced over grains and drowned in herby chimichurri — the ultimate performance dinner for ovulation week.'
),

(
  'pinterest-mediterranean-chickpea-bowl',
  'Mediterranean Chickpea Bowl',
  ARRAY['luteal'],
  ARRAY['lunch','dinner'],
  10, 5, 'easy', 'balanced',
  ARRAY['maintenance','fat_loss','recovery'],
  ARRAY['mood_support','anti_bloat'],
  ARRAY['mood_support'],
  ARRAY['steady_energy'],
  420, 18, 52, 16, 12,
  ARRAY['1 tin chickpeas drained and rinsed','100g cherry tomatoes halved','½ cucumber diced','60g feta crumbled','30g kalamata olives','2 tbsp hummus','1 tbsp olive oil','Juice of ½ lemon','1 tsp dried oregano','Fresh mint'],
  ARRAY['Drain and rinse chickpeas. Pat dry.','Combine chickpeas, tomatoes, cucumber, olives, and feta in a bowl.','Dress with olive oil, lemon juice, oregano, and toss to combine.','Serve with hummus on the side and scatter fresh mint over the top.'],
  true, true, false, false, false, false, 0, null,
  'Chickpeas provide vitamin B6 which directly supports serotonin synthesis to ease luteal phase mood symptoms.',
  'Creamy hummus, tangy feta, and bright vegetables with protein-rich chickpeas — a no-cook Mediterranean bowl in 15 minutes.'
),

(
  'pinterest-buffalo-chicken-bowl',
  'Buffalo Chicken Bowl',
  ARRAY['ovulation','follicular'],
  ARRAY['lunch','dinner'],
  10, 20, 'easy', 'high_protein',
  ARRAY['performance','muscle_gain','recomp'],
  ARRAY['performance','high_protein','lean_build'],
  ARRAY[],
  ARRAY[]::text[],
  520, 44, 42, 14, 5,
  ARRAY['180g chicken breast','150g cooked white rice','2 tbsp hot sauce (Franks or similar)','1 tbsp butter','1 celery stalk sliced','30g blue cheese or ranch dressing','Shredded lettuce'],
  ARRAY['Grill or bake chicken 20 min at 200°C until cooked through.','Melt butter and stir in hot sauce. Toss cooked chicken in buffalo sauce.','Shred or slice chicken.','Build bowl: rice, shredded lettuce, buffalo chicken, celery, and a drizzle of dressing.'],
  true, false, false, true, false, false, 0, null,
  'High lean protein supports peak anabolic response during ovulation and follicular muscle-building windows.',
  'Spicy buffalo chicken over rice with crunchy celery and cool ranch — a crowd-pleasing bowl with 44g of protein.'
),

(
  'pinterest-bbq-beef-bowl',
  'BBQ Beef Bowl',
  ARRAY['ovulation'],
  ARRAY['lunch','dinner'],
  10, 20, 'easy', 'high_protein',
  ARRAY['muscle_gain','performance'],
  ARRAY['performance','high_protein'],
  ARRAY[],
  ARRAY['steady_energy'],
  590, 46, 50, 16, 4,
  ARRAY['200g beef mince or steak strips','150g cooked white rice','2 tbsp BBQ sauce','1 ear corn (or 80g tinned corn)','½ red onion sliced','30g cheddar grated','Fresh chives'],
  ARRAY['Brown beef in a pan over high heat 6–8 min, drain excess fat.','Stir in BBQ sauce and cook 2 min until glazed.','Grill or char corn briefly if using fresh. Slice off cob.','Build bowl: rice, BBQ beef, corn, red onion, and cheese. Finish with chives.'],
  true, false, false, true, true, false, 0, null,
  'Zinc and iron from beef fuel the LH surge and sustain peak-performance training during ovulation week.',
  'Smoky BBQ beef over rice loaded with charred corn, sharp cheddar, and tangy red onion — big flavour, bigger protein.'
),

(
  'pinterest-tofu-sesame-bowl',
  'Tofu Sesame Bowl',
  ARRAY['follicular'],
  ARRAY['lunch','dinner'],
  10, 15, 'easy', 'balanced',
  ARRAY['maintenance','recomp','recovery'],
  ARRAY['lean_build','balanced_fuel'],
  ARRAY[],
  ARRAY['steady_energy'],
  420, 24, 46, 16, 6,
  ARRAY['200g firm tofu pressed and cubed','150g cooked brown rice','2 tbsp soy sauce','1 tbsp sesame oil','1 tbsp rice vinegar','1 tsp sriracha','1 head broccoli in florets','Sesame seeds','Spring onion'],
  ARRAY['Press tofu 10 min between paper towels. Cut into cubes.','Toss tofu in 1 tbsp soy sauce. Pan-fry in sesame oil over high heat 3–4 min per side until golden and crispy.','Steam broccoli 4 min. Make sauce: remaining soy sauce, rice vinegar, sriracha.','Serve tofu and broccoli over rice, drizzle sauce, scatter sesame seeds and spring onion.'],
  true, true, false, false, false, false, 0, null,
  'Tofu isoflavones (phytoestrogens) gently support rising oestrogen levels during the follicular phase.',
  'Crispy golden tofu glazed in sesame sauce over brown rice with steamed broccoli — a plant-powered bowl that supports hormone balance.'
),

-- ── WRAPS & QUICK MEALS (16–25) ──────────────────────────────────────────────

(
  'pinterest-chicken-avocado-wrap',
  'Chicken Avocado Wrap',
  ARRAY['follicular','ovulation'],
  ARRAY['lunch'],
  10, 12, 'easy', 'high_protein',
  ARRAY['muscle_gain','recomp','fat_loss'],
  ARRAY['performance','lean_build','high_protein'],
  ARRAY[],
  ARRAY[]::text[],
  480, 38, 38, 16, 6,
  ARRAY['150g chicken breast','1 large whole grain tortilla wrap','½ avocado mashed','Shredded lettuce','1 tomato sliced','1 tsp lime juice','Salt, pepper, garlic powder'],
  ARRAY['Season chicken and pan-fry or grill 12 min until cooked. Slice or shred.','Mash avocado with lime juice, salt, and garlic powder.','Spread avocado on wrap, layer chicken, lettuce, and tomato.','Roll tightly and slice diagonally.'],
  true, false, false, true, false, false, 0, null,
  'Lean chicken protein fuels the follicular and ovulation anabolic windows; avocado healthy fats support oestrogen production.',
  'Shredded chicken with creamy avocado, fresh lettuce, and tomato wrapped in whole grain — a clean and filling lunch under 30 minutes.'
),

(
  'pinterest-tuna-yogurt-wrap',
  'Tuna Yogurt Wrap',
  ARRAY['follicular','ovulation'],
  ARRAY['lunch','snack'],
  5, 0, 'easy', 'high_protein',
  ARRAY['fat_loss','recomp','maintenance'],
  ARRAY['lean_build','high_protein'],
  ARRAY[],
  ARRAY[]::text[],
  380, 36, 34, 8, 3,
  ARRAY['1 tin tuna in water drained','2 tbsp Greek yogurt','1 tsp Dijon mustard','1 celery stalk finely diced','1 large tortilla wrap','Shredded lettuce','Squeeze of lemon'],
  ARRAY['Mix tuna with Greek yogurt, mustard, celery, lemon juice, salt, and pepper.','Lay lettuce on wrap, spoon tuna mixture down the centre.','Roll tightly and serve immediately or wrap in foil.'],
  true, false, true, true, false, true, 0, null,
  'Greek yogurt replaces mayo for a leaner, probiotic-rich tuna wrap that supports gut hormone metabolism.',
  'Creamy tuna salad made with Greek yogurt instead of mayo — a lighter, high-protein wrap ready in 5 minutes.'
),

(
  'pinterest-turkey-lettuce-wrap',
  'Turkey Lettuce Wrap',
  ARRAY['luteal'],
  ARRAY['lunch','snack'],
  10, 0, 'easy', 'high_protein',
  ARRAY['fat_loss','recomp','maintenance'],
  ARRAY['mood_support','lean_build','high_protein'],
  ARRAY['mood_support'],
  ARRAY['low_energy'],
  280, 30, 12, 12, 3,
  ARRAY['150g sliced turkey breast','6 large Romaine or Butter lettuce leaves','½ avocado sliced','Cherry tomatoes halved','1 tbsp cream cheese or hummus','Squeeze of lemon'],
  ARRAY['Lay lettuce leaves flat on a board.','Spread each with a little cream cheese or hummus.','Layer turkey, avocado, and tomatoes on each leaf.','Squeeze lemon, fold, and eat immediately.'],
  true, false, false, true, false, true, 0, null,
  'Turkey is the richest dietary source of tryptophan, which converts to serotonin to ease luteal phase mood swings.',
  'Light turkey and avocado in crisp lettuce cups — a low-carb, mood-supporting wrap that takes 10 minutes.'
),

(
  'pinterest-egg-white-breakfast-wrap',
  'Egg White Breakfast Wrap',
  ARRAY['ovulation'],
  ARRAY['breakfast'],
  5, 10, 'easy', 'high_protein',
  ARRAY['fat_loss','recomp','performance'],
  ARRAY['performance','lean_build','high_protein'],
  ARRAY[],
  ARRAY[]::text[],
  340, 32, 28, 8, 3,
  ARRAY['5 egg whites','1 whole egg','1 large whole grain tortilla','30g light cheese grated','Handful of spinach','2 tbsp salsa','Salt and pepper'],
  ARRAY['Whisk egg whites and whole egg together, season.','Cook in a lightly oiled pan over medium heat, folding into a soft scramble.','Warm tortilla in a dry pan 30 sec.','Layer eggs, cheese, spinach, and salsa on wrap. Roll and serve immediately.'],
  true, true, false, true, false, false, 0, null,
  'Egg whites provide maximum protein with minimal fat, ideal for the peak anabolic window during ovulation.',
  'Fluffy egg white scramble with spinach and salsa wrapped in whole grain — a lean, high-protein breakfast in 15 minutes.'
),

(
  'pinterest-cottage-cheese-tortilla-wrap',
  'Cottage Cheese Tortilla Wrap',
  ARRAY['luteal'],
  ARRAY['breakfast','snack'],
  5, 0, 'easy', 'high_protein',
  ARRAY['fat_loss','recomp','maintenance'],
  ARRAY['mood_support','high_protein'],
  ARRAY['magnesium_support'],
  ARRAY['low_energy'],
  320, 28, 30, 8, 3,
  ARRAY['150g cottage cheese','1 large tortilla wrap','1 tbsp pumpkin seeds','Sliced cucumber','Cherry tomatoes halved','Fresh chives','Salt and pepper'],
  ARRAY['Season cottage cheese with salt, pepper, and chives.','Spread generously over the tortilla.','Top with pumpkin seeds, cucumber, and tomatoes.','Roll or fold and eat immediately.'],
  true, true, false, true, false, false, 0, null,
  'Casein from cottage cheese suppresses luteal phase cravings; pumpkin seeds add magnesium for PMS relief.',
  'Creamy cottage cheese with crunchy seeds and fresh vegetables in a tortilla — a satisfying, craving-busting luteal phase snack.'
),

(
  'pinterest-beef-fajita-wrap',
  'Beef Fajita Wrap',
  ARRAY['ovulation'],
  ARRAY['lunch','dinner'],
  10, 15, 'easy', 'high_protein',
  ARRAY['performance','muscle_gain'],
  ARRAY['performance','high_protein'],
  ARRAY[],
  ARRAY['steady_energy'],
  520, 40, 44, 16, 5,
  ARRAY['180g sirloin or flank steak strips','1 red and 1 green pepper sliced','1 onion sliced','2 large tortilla wraps','1 tsp cumin','1 tsp smoked paprika','1 tbsp olive oil','Salsa, sour cream, guacamole to serve'],
  ARRAY['Season beef with cumin, paprika, salt, and pepper.','Heat olive oil in a cast-iron pan over high heat. Sear beef strips 2–3 min. Set aside.','In the same pan, stir-fry peppers and onion 4–5 min until slightly charred.','Warm tortillas. Fill with beef, peppers, onion, salsa, sour cream, and guacamole.'],
  true, false, false, true, true, false, 0, null,
  'Zinc and iron from beef fuel the LH surge and sustain peak-intensity training during ovulation.',
  'Sizzling beef strips with charred peppers in warm tortillas — a 25-minute fajita wrap built for peak-performance days.'
),

(
  'pinterest-buffalo-chicken-wrap',
  'Buffalo Chicken Wrap',
  ARRAY['ovulation','follicular'],
  ARRAY['lunch'],
  10, 15, 'easy', 'high_protein',
  ARRAY['performance','recomp','muscle_gain'],
  ARRAY['performance','lean_build','high_protein'],
  ARRAY[],
  ARRAY[]::text[],
  470, 38, 36, 14, 4,
  ARRAY['150g chicken breast','2 tbsp hot sauce','1 tbsp butter','1 large tortilla wrap','Shredded lettuce','1 tbsp ranch dressing','Celery sliced thin'],
  ARRAY['Pan-fry or bake chicken 15 min until cooked. Shred or slice.','Melt butter and mix with hot sauce. Toss chicken in buffalo sauce.','Warm tortilla. Layer shredded lettuce, buffalo chicken, celery, and ranch dressing.','Roll tightly and serve.'],
  true, false, false, true, false, false, 0, null,
  'High lean protein supports the follicular and ovulation anabolic windows when protein synthesis is highest.',
  'Spicy buffalo-coated chicken with cool ranch and crunchy celery in a warm tortilla — a satisfying high-protein lunch.'
),

(
  'pinterest-salmon-spinach-wrap',
  'Salmon Spinach Wrap',
  ARRAY['menstrual','luteal'],
  ARRAY['lunch','dinner'],
  10, 0, 'easy', 'balanced',
  ARRAY['recovery','maintenance'],
  ARRAY['anti_inflammatory','mood_support'],
  ARRAY['anti_inflammatory','cramp_support'],
  ARRAY['steady_energy'],
  380, 30, 28, 14, 4,
  ARRAY['100g smoked salmon','1 large whole grain wrap','2 tbsp cream cheese','1 cup baby spinach','¼ cucumber sliced thin','1 tbsp capers','Juice of ½ lemon','Black pepper'],
  ARRAY['Spread cream cheese generously across the wrap.','Layer spinach, cucumber, and capers across the centre.','Lay smoked salmon on top, squeeze lemon, and season with black pepper.','Roll tightly and slice in half.'],
  true, false, true, false, false, false, 0, null,
  'Salmon omega-3s reduce prostaglandins that cause menstrual cramps and ease PMS inflammation in the luteal phase.',
  'Silky smoked salmon with cream cheese, spinach, and capers in a whole grain wrap — a no-cook omega-3 boost in 10 minutes.'
),

(
  'pinterest-greek-yogurt-chicken-wrap',
  'Greek Yogurt Chicken Wrap',
  ARRAY['follicular'],
  ARRAY['lunch'],
  10, 12, 'easy', 'high_protein',
  ARRAY['muscle_gain','recomp','fat_loss'],
  ARRAY['lean_build','high_protein','balanced_fuel'],
  ARRAY[],
  ARRAY[]::text[],
  440, 38, 38, 12, 3,
  ARRAY['150g chicken breast','2 tbsp Greek yogurt','1 tsp garlic powder','1 tsp dried dill','1 large tortilla','Shredded lettuce','Tomato sliced','Cucumber sliced'],
  ARRAY['Mix Greek yogurt with garlic powder, dill, salt, and pepper to make a marinade.','Coat chicken in marinade and pan-fry 12 min until cooked through. Slice or shred.','Warm tortilla. Lay lettuce, tomato, and cucumber, then add chicken.','Spoon over any remaining marinade/yogurt and roll tightly.'],
  true, false, false, true, false, false, 0, null,
  'Greek yogurt marinade adds probiotics that support oestrogen metabolism during the follicular phase.',
  'Tender yogurt-marinated chicken with fresh salad vegetables in a tortilla — a lighter, probiotic-rich take on a chicken wrap.'
),

(
  'pinterest-low-carb-steak-wrap',
  'Low-Carb Steak Wrap',
  ARRAY['ovulation','luteal'],
  ARRAY['lunch','dinner'],
  10, 10, 'easy', 'high_protein',
  ARRAY['fat_loss','recomp'],
  ARRAY['performance','lean_build','high_protein'],
  ARRAY[],
  ARRAY[]::text[],
  420, 40, 18, 22, 3,
  ARRAY['180g sirloin steak','4 large Romaine or cos lettuce leaves (as wraps)','½ avocado sliced','1 tbsp sour cream','Cherry tomatoes halved','Salt, pepper, garlic powder'],
  ARRAY['Season steak with salt, pepper, and garlic powder.','Sear in a very hot pan 3 min per side for medium-rare. Rest 3 min, then slice thin.','Lay lettuce leaves out flat and layer each with avocado, steak slices, and tomato.','Add a small dollop of sour cream and wrap the leaves around the filling.'],
  true, false, false, true, false, true, 0, null,
  'Zinc from steak supports peak ovulation; low-carb lettuce wraps suit the lower-energy luteal phase without blood sugar spikes.',
  'Seared steak slices in crisp lettuce leaves with avocado and sour cream — an elegant, low-carb wrap with serious protein.'
),

-- ── BREAKFAST (26–35) ────────────────────────────────────────────────────────

(
  'pinterest-protein-overnight-oats',
  'Protein Overnight Oats',
  ARRAY['follicular','luteal'],
  ARRAY['breakfast'],
  5, 0, 'easy', 'balanced',
  ARRAY['muscle_gain','maintenance','recomp'],
  ARRAY['steady_energy','balanced_fuel'],
  ARRAY['magnesium_support'],
  ARRAY['steady_energy','low_energy'],
  440, 32, 52, 12, 8,
  ARRAY['80g rolled oats','1 scoop vanilla protein powder','250ml oat milk','1 tbsp chia seeds','1 tbsp almond butter','Pinch of cinnamon','Berries and banana to top'],
  ARRAY['Combine oats, protein powder, chia seeds, oat milk, almond butter, and cinnamon in a jar or container.','Stir well to ensure no dry pockets. Seal and refrigerate overnight.','In the morning, give it a stir, add a splash of extra milk if too thick.','Top with berries and banana slices before eating.'],
  true, true, false, true, false, false, 0, null,
  'Slow-release oats stabilise blood sugar during the follicular phase; protein and magnesium combat luteal phase energy crashes.',
  'Creamy overnight oats with protein powder and almond butter — prep it the night before and wake up to a 32g protein breakfast.'
),

(
  'pinterest-greek-yogurt-berries-bowl',
  'Greek Yogurt + Berries Bowl',
  ARRAY['follicular','ovulation'],
  ARRAY['breakfast','snack'],
  5, 0, 'easy', 'high_protein',
  ARRAY['fat_loss','maintenance','recomp'],
  ARRAY['lean_build','high_protein'],
  ARRAY[],
  ARRAY[]::text[],
  320, 22, 42, 6, 4,
  ARRAY['200g full-fat Greek yogurt','150g mixed berries (blueberries, strawberries, raspberries)','1 tbsp honey','1 tbsp granola','1 tbsp hemp or chia seeds'],
  ARRAY['Spoon Greek yogurt into a bowl.','Layer berries on top.','Sprinkle granola and seeds over the berries.','Finish with a drizzle of honey.'],
  true, true, false, false, false, false, 0, null,
  'Greek yogurt probiotics support oestrogen metabolism; berry antioxidants protect follicle development during the follicular phase.',
  'Thick Greek yogurt piled with fresh berries, granola, and honey — a 5-minute breakfast that is both delicious and phase-smart.'
),

(
  'pinterest-protein-pancakes',
  'Protein Pancakes',
  ARRAY['ovulation','follicular'],
  ARRAY['breakfast'],
  5, 10, 'easy', 'high_protein',
  ARRAY['muscle_gain','performance','recomp'],
  ARRAY['performance','high_protein'],
  ARRAY[],
  ARRAY['steady_energy'],
  460, 34, 48, 10, 4,
  ARRAY['1 scoop vanilla protein powder','1 ripe banana mashed','2 eggs','50ml oat milk','1 tsp baking powder','Pinch of cinnamon','Berries and maple syrup to serve'],
  ARRAY['Mash banana well. Mix with eggs, protein powder, oat milk, baking powder, and cinnamon until smooth.','Heat a non-stick pan over medium heat and lightly oil.','Pour small circles of batter (about 8cm). Cook 2 min until bubbles form, flip and cook 1 min more.','Stack and serve with berries and a drizzle of maple syrup.'],
  true, true, false, true, false, false, 0, null,
  'High-protein breakfast fuels the peak anabolic window during ovulation; banana provides fast carbs for morning training.',
  'Fluffy protein pancakes from just banana, eggs, and protein powder — a 15-minute stack with 34g protein and no flour needed.'
),

(
  'pinterest-egg-muffins-meal-prep',
  'Egg Muffins Meal Prep',
  ARRAY['menstrual','follicular','ovulation','luteal'],
  ARRAY['breakfast','snack'],
  10, 20, 'easy', 'high_protein',
  ARRAY['fat_loss','recomp','maintenance'],
  ARRAY['lean_build','high_protein','balanced_fuel'],
  ARRAY['recovery'],
  ARRAY['steady_energy','low_energy'],
  280, 24, 6, 18, 2,
  ARRAY['6 eggs','50g cheddar grated','½ red pepper diced','½ courgette grated','50g baby spinach chopped','Salt, pepper, dried mixed herbs','Olive oil spray'],
  ARRAY['Preheat oven to 180°C. Spray a 6-cup muffin tin with olive oil.','Whisk eggs, season well with salt, pepper, and herbs.','Divide pepper, courgette, and spinach evenly across the cups.','Pour egg mixture over the vegetables. Top with cheese.','Bake 18–20 min until puffed and golden. Cool before eating or storing in the fridge up to 4 days.'],
  true, true, false, true, false, false, 0, null,
  'Eggs provide complete protein, B12, and choline suitable for energy support across all four cycle phases.',
  'Make-ahead baked egg muffins loaded with vegetables and cheese — prep 6 on Sunday and grab one every morning all week.'
),

(
  'pinterest-cottage-cheese-scrambled-eggs',
  'Cottage Cheese Scrambled Eggs',
  ARRAY['luteal'],
  ARRAY['breakfast'],
  5, 8, 'easy', 'high_protein',
  ARRAY['recomp','maintenance','fat_loss'],
  ARRAY['mood_support','high_protein'],
  ARRAY['magnesium_support'],
  ARRAY['low_energy'],
  340, 30, 8, 18, 1,
  ARRAY['3 eggs','80g full-fat cottage cheese','1 tbsp butter','Fresh chives','Salt and pepper','2 slices whole grain toast (optional)'],
  ARRAY['Whisk eggs with cottage cheese, salt, and pepper.','Melt butter in a non-stick pan over low heat.','Pour in egg mixture and cook slowly, folding with a spatula every 30 sec, until just set and creamy.','Serve immediately scattered with chives, on toast if desired.'],
  true, true, false, true, false, false, 0, null,
  'Cottage cheese adds casein protein that reduces luteal phase cravings; eggs provide choline for progesterone-related brain fog.',
  'Silky scrambled eggs folded with cottage cheese for extra creaminess and protein — the fluffiest scrambled eggs you will make.'
),

(
  'pinterest-peanut-butter-protein-oats',
  'Peanut Butter Protein Oats',
  ARRAY['follicular','luteal'],
  ARRAY['breakfast'],
  5, 5, 'easy', 'balanced',
  ARRAY['muscle_gain','maintenance','recomp'],
  ARRAY['steady_energy','mood_support','balanced_fuel'],
  ARRAY['magnesium_support'],
  ARRAY['steady_energy','low_energy'],
  480, 24, 56, 18, 8,
  ARRAY['80g rolled oats','250ml oat milk','2 tbsp natural peanut butter','1 scoop vanilla protein powder','1 banana sliced','1 tsp honey','Pinch of sea salt'],
  ARRAY['Heat oats in oat milk over medium heat 4–5 min, stirring regularly, until creamy.','Stir in peanut butter and protein powder until fully combined.','Pour into a bowl and top with banana slices.','Drizzle honey and finish with a pinch of sea salt.'],
  true, true, false, false, false, false, 0, null,
  'Peanut butter magnesium eases both follicular muscle soreness and luteal phase PMS tension; slow-release oats keep blood sugar stable.',
  'Creamy peanut butter oats with protein powder and banana — warm, filling, and one of the best-tasting ways to hit 24g of protein at breakfast.'
),

(
  'pinterest-banana-protein-smoothie',
  'Banana Protein Smoothie',
  ARRAY['ovulation','follicular'],
  ARRAY['breakfast','snack'],
  5, 0, 'easy', 'high_protein',
  ARRAY['muscle_gain','performance','recomp'],
  ARRAY['performance','high_protein'],
  ARRAY[],
  ARRAY['steady_energy'],
  380, 30, 50, 6, 4,
  ARRAY['1 large ripe banana','1 scoop vanilla or chocolate protein powder','250ml oat milk','1 tbsp peanut butter','4 ice cubes','Pinch of cinnamon'],
  ARRAY['Add all ingredients to a blender.','Blend on high 45 sec until smooth and creamy.','Pour into a glass and drink immediately.'],
  true, true, false, true, false, false, 0, null,
  'Fast carbs from banana fuel peak-phase training; whey protein triggers muscle protein synthesis at ovulation anabolic peak.',
  'Thick, creamy banana protein smoothie with peanut butter — a 5-minute blender shake with 30g protein and zero effort.'
),

(
  'pinterest-avocado-egg-toast',
  'Avocado Egg Toast',
  ARRAY['luteal','menstrual'],
  ARRAY['breakfast'],
  5, 8, 'easy', 'balanced',
  ARRAY['maintenance','recovery','fat_loss'],
  ARRAY['mood_support','anti_inflammatory'],
  ARRAY['anti_inflammatory'],
  ARRAY['low_energy'],
  420, 18, 36, 24, 8,
  ARRAY['2 slices sourdough bread','1 ripe avocado','2 eggs','Juice of ½ lemon','Chilli flakes','Salt and pepper','Fresh coriander or chives (optional)'],
  ARRAY['Toast sourdough until golden.','Mash avocado with lemon juice, salt, and pepper. Spread thickly over toast.','Fry or poach eggs to your liking.','Place eggs on avocado toast, sprinkle chilli flakes and herbs.'],
  true, true, false, false, true, false, 0, null,
  'Avocado monounsaturated fats support progesterone production in the luteal phase; eggs provide B12 and iron during menstruation.',
  'Creamy smashed avocado and perfectly cooked eggs on sourdough toast — the classic done right, with 18g protein and anti-inflammatory fats.'
),

(
  'pinterest-egg-turkey-breakfast-plate',
  'Egg + Turkey Breakfast Plate',
  ARRAY['ovulation','follicular'],
  ARRAY['breakfast'],
  5, 12, 'easy', 'high_protein',
  ARRAY['muscle_gain','performance','recomp'],
  ARRAY['performance','high_protein','lean_build'],
  ARRAY[],
  ARRAY[]::text[],
  380, 36, 10, 20, 2,
  ARRAY['3 eggs','100g turkey breast slices','1 tbsp olive oil','Handful of cherry tomatoes halved','Fresh parsley','Salt and pepper'],
  ARRAY['Heat olive oil in a pan over medium heat. Add turkey slices and warm through 2–3 min per side.','In the same pan, fry eggs to your liking.','Plate turkey, eggs, and cherry tomatoes together.','Season and scatter fresh parsley to serve.'],
  true, false, false, true, false, false, 0, null,
  'Combining eggs and turkey front-loads protein first thing in the morning, maximising the follicular and ovulation anabolic window.',
  'Simple fried eggs alongside warm turkey slices and juicy tomatoes — a no-fuss, 17-minute breakfast plate with 36g of protein.'
),

(
  'pinterest-yogurt-granola-protein-bowl',
  'Yogurt Granola Protein Bowl',
  ARRAY['follicular','ovulation'],
  ARRAY['breakfast'],
  5, 0, 'easy', 'balanced',
  ARRAY['maintenance','recomp'],
  ARRAY['lean_build','high_protein','balanced_fuel'],
  ARRAY[],
  ARRAY[]::text[],
  420, 26, 52, 10, 4,
  ARRAY['200g full-fat Greek yogurt','50g high-protein granola','1 tbsp honey','100g mixed berries','1 tbsp hemp seeds','1 tsp vanilla extract (stirred into yogurt)'],
  ARRAY['Stir vanilla extract into Greek yogurt.','Spoon into a bowl.','Layer granola over yogurt.','Top with berries and hemp seeds, finish with honey.'],
  true, true, false, false, false, false, 0, null,
  'Greek yogurt probiotics support oestrogen metabolism and gut health during the high-energy follicular and ovulation phases.',
  'Thick vanilla Greek yogurt layered with crunchy granola, fresh berries, and hemp seeds — a no-cook breakfast that feels like dessert.'
),

-- ── SIMPLE DINNERS (36–45) ───────────────────────────────────────────────────

(
  'pinterest-chicken-broccoli-meal-prep',
  'Chicken Broccoli Meal Prep',
  ARRAY['follicular'],
  ARRAY['lunch','dinner'],
  10, 25, 'easy', 'high_protein',
  ARRAY['muscle_gain','recomp','fat_loss'],
  ARRAY['lean_build','high_protein','balanced_fuel'],
  ARRAY[],
  ARRAY['steady_energy'],
  480, 44, 42, 10, 7,
  ARRAY['600g chicken breast (4 portions)','400g broccoli florets','200g cooked brown rice (per portion)','2 tbsp olive oil','1 tsp garlic powder','1 tsp onion powder','Salt, pepper, paprika','Soy sauce or teriyaki sauce for serving'],
  ARRAY['Preheat oven to 200°C. Line two baking trays.','Cut chicken into even pieces. Toss with olive oil, garlic powder, paprika, salt, and pepper.','Spread chicken on one tray. Toss broccoli in remaining oil, spread on second tray.','Roast both 20–25 min until chicken is cooked and broccoli slightly charred.','Divide into containers with rice. Drizzle sauce when eating. Keeps 4 days in fridge.'],
  true, false, false, true, false, false, 0, null,
  'DIM compound in broccoli metabolises excess oestrogen during the follicular phase; lean chicken maximises muscle protein synthesis.',
  'Batch-roasted chicken and broccoli with brown rice — prep four meals in 35 minutes and nail protein goals all week.'
),

(
  'pinterest-steak-salad',
  'Steak Salad',
  ARRAY['ovulation'],
  ARRAY['lunch','dinner'],
  10, 10, 'easy', 'high_protein',
  ARRAY['performance','recomp','fat_loss'],
  ARRAY['performance','high_protein','lean_build'],
  ARRAY[],
  ARRAY[]::text[],
  480, 42, 16, 26, 5,
  ARRAY['200g sirloin or ribeye steak','4 large handfuls mixed salad leaves','100g cherry tomatoes halved','½ cucumber sliced','30g shaved parmesan or feta','2 tbsp balsamic vinaigrette','Salt, pepper, olive oil'],
  ARRAY['Bring steak to room temperature, season well with salt and pepper.','Sear in a very hot pan 3–4 min per side for medium-rare. Rest 5 min.','Assemble salad: leaves, tomatoes, and cucumber, dressed with vinaigrette.','Slice steak thin against the grain and lay over salad. Finish with parmesan and extra dressing.'],
  true, false, false, true, false, true, 0, null,
  'Zinc and iron from steak support the LH surge and peak training performance during ovulation week.',
  'Juicy sliced seared steak over crisp salad with parmesan and balsamic — an elegant, high-protein dinner in 20 minutes.'
),

(
  'pinterest-salmon-asparagus',
  'Salmon + Asparagus',
  ARRAY['menstrual','luteal'],
  ARRAY['dinner'],
  5, 15, 'easy', 'balanced',
  ARRAY['recovery','maintenance'],
  ARRAY['anti_inflammatory','mood_support'],
  ARRAY['anti_inflammatory','cramp_support'],
  ARRAY['steady_energy'],
  420, 36, 12, 24, 4,
  ARRAY['180g salmon fillet','1 bunch asparagus trimmed','1 tbsp olive oil','2 tbsp butter','2 garlic cloves minced','Juice of ½ lemon','Salt and pepper'],
  ARRAY['Preheat oven to 200°C. Lay asparagus on a baking tray, drizzle with olive oil, season.','Roast asparagus 10 min. Add salmon to the tray, season with salt and pepper.','Roast a further 10–12 min until salmon is cooked through and flakes easily.','While resting, melt butter with garlic in a small pan 1 min. Squeeze in lemon.','Plate salmon and asparagus and spoon garlic butter over both.'],
  true, false, true, true, false, false, 0, null,
  'Salmon omega-3s directly reduce the prostaglandins that cause menstrual cramps and PMS inflammation during the luteal phase.',
  'Oven-roasted salmon with tender asparagus in garlic butter — a clean, anti-inflammatory dinner ready in 20 minutes.'
),

(
  'pinterest-one-pan-chicken-veggies',
  'One-Pan Chicken Veggies',
  ARRAY['follicular','luteal'],
  ARRAY['dinner'],
  10, 25, 'easy', 'high_protein',
  ARRAY['maintenance','recomp','fat_loss'],
  ARRAY['lean_build','balanced_fuel','mood_support'],
  ARRAY[],
  ARRAY['steady_energy'],
  450, 40, 26, 18, 6,
  ARRAY['4 chicken thighs bone-in or 600g breast','1 courgette sliced','1 red pepper sliced','1 red onion sliced into wedges','200g cherry tomatoes','2 tbsp olive oil','1 tsp dried oregano','1 tsp garlic powder','Salt and pepper'],
  ARRAY['Preheat oven to 200°C.','Toss all vegetables in half the olive oil, garlic powder, and oregano. Spread across a large roasting tray.','Nestle chicken among the vegetables. Drizzle remaining oil over chicken, season well.','Roast 25–30 min until chicken is golden and cooked through and vegetables are slightly caramelised.'],
  true, false, false, true, false, false, 0, null,
  'Lean chicken protein supports follicular muscle building; fibre-rich vegetables stabilise luteal phase blood sugar and reduce bloating.',
  'Juicy chicken thighs roasted with courgette, peppers, and tomatoes all on one pan — easy prep, minimal washing up, maximum flavour.'
),

(
  'pinterest-garlic-butter-shrimp',
  'Garlic Butter Shrimp',
  ARRAY['ovulation'],
  ARRAY['dinner','lunch'],
  5, 10, 'easy', 'high_protein',
  ARRAY['performance','fat_loss','recomp'],
  ARRAY['performance','high_protein'],
  ARRAY[],
  ARRAY[]::text[],
  380, 36, 8, 20, 2,
  ARRAY['300g large shrimp peeled and deveined','3 tbsp butter','4 garlic cloves minced','Juice of 1 lemon','Handful fresh parsley chopped','Salt, pepper, chilli flakes','Crusty bread or rice to serve'],
  ARRAY['Pat shrimp completely dry — this ensures they sear rather than steam.','Melt butter in a large pan over high heat. Add garlic and chilli flakes, cook 30 sec.','Add shrimp in a single layer. Cook 1–2 min per side until pink and slightly charred. Do not overcook.','Squeeze lemon over shrimp, toss with parsley, and serve immediately over rice or with bread.'],
  true, false, true, true, false, false, 0, null,
  'Shrimp is one of the best dietary sources of iodine and zinc, both critical for thyroid function and the LH surge during ovulation.',
  'Juicy shrimp sizzled in garlic butter with lemon and chilli — the fastest impressive dinner you can make in under 15 minutes.'
),

(
  'pinterest-turkey-meatballs-rice',
  'Turkey Meatballs + Rice',
  ARRAY['luteal','follicular'],
  ARRAY['lunch','dinner'],
  15, 25, 'medium', 'high_protein',
  ARRAY['muscle_gain','maintenance','recomp'],
  ARRAY['mood_support','high_protein','balanced_fuel'],
  ARRAY['mood_support'],
  ARRAY['steady_energy'],
  520, 38, 52, 12, 3,
  ARRAY['400g turkey mince','1 egg','30g breadcrumbs','1 tsp garlic powder','1 tsp dried parsley','150g cooked white or brown rice per portion','400g tin chopped tomatoes','1 onion diced','1 tsp Italian seasoning','Salt and pepper'],
  ARRAY['Mix turkey mince, egg, breadcrumbs, garlic powder, parsley, salt, and pepper. Roll into 16 even balls.','Brown meatballs in a pan with olive oil 2–3 min per side until golden. Set aside.','In the same pan, cook onion 3 min. Add tomatoes, Italian seasoning, and simmer 5 min.','Return meatballs to sauce, cover and cook 12–15 min until cooked through. Serve over rice.'],
  true, false, false, true, true, false, 0, null,
  'Turkey tryptophan converts to serotonin which directly counteracts luteal phase mood dips; rice provides stable carbohydrate energy.',
  'Juicy turkey meatballs simmered in a quick tomato sauce served over rice — comforting, mood-supporting, and meal-prep friendly.'
),

(
  'pinterest-chicken-stir-fry',
  'Chicken Stir Fry',
  ARRAY['follicular','ovulation'],
  ARRAY['dinner','lunch'],
  10, 15, 'easy', 'high_protein',
  ARRAY['performance','muscle_gain','recomp'],
  ARRAY['performance','lean_build','high_protein'],
  ARRAY[],
  ARRAY['steady_energy'],
  480, 40, 44, 12, 5,
  ARRAY['200g chicken breast strips','150g rice noodles or white rice','1 head broccoli in florets','1 red pepper sliced','2 garlic cloves minced','1 tbsp ginger grated','2 tbsp soy sauce','1 tbsp oyster sauce','1 tsp sesame oil'],
  ARRAY['Cook noodles or rice per packet instructions.','Mix soy sauce, oyster sauce, and sesame oil into a stir-fry sauce.','Heat a wok over high heat. Stir-fry chicken strips 4–5 min until golden. Remove.','Add garlic and ginger 30 sec, then broccoli and pepper. Stir-fry 3 min.','Return chicken, pour sauce over, toss everything together. Serve over noodles or rice.'],
  true, false, false, true, false, false, 0, null,
  'High lean protein fuels the follicular muscle-building phase; broccoli DIM supports healthy oestrogen metabolism during ovulation.',
  'Quick wok chicken stir fry with broccoli and peppers in a savoury soy ginger sauce — better than takeaway and on the table in 25 minutes.'
),

(
  'pinterest-beef-sweet-potato-skillet',
  'Beef + Sweet Potato Skillet',
  ARRAY['ovulation','menstrual'],
  ARRAY['dinner'],
  10, 20, 'easy', 'high_protein',
  ARRAY['muscle_gain','performance','recovery'],
  ARRAY['performance','iron_support','high_protein'],
  ARRAY['anti_inflammatory'],
  ARRAY['steady_energy'],
  540, 38, 46, 18, 6,
  ARRAY['200g beef mince','1 large sweet potato peeled and diced small','1 onion diced','2 garlic cloves minced','1 tsp cumin','1 tsp smoked paprika','1 tbsp olive oil','Salt and pepper','Fresh parsley to serve'],
  ARRAY['Heat olive oil in a large oven-safe pan. Cook onion and sweet potato over medium heat 8–10 min until potato is tender.','Add garlic, cumin, and paprika, stir 1 min.','Push vegetables to one side, add beef mince and brown 5–6 min, breaking up.','Combine everything, season well, and cook a further 2 min. Scatter parsley and serve from the pan.'],
  true, false, false, true, true, false, 0, null,
  'Haem iron from beef replenishes menstrual blood loss; zinc supports the LH surge at ovulation; sweet potato provides vitamin C for iron absorption.',
  'Smoky beef and sweet potato cooked in one skillet with cumin and paprika — a 30-minute one-pan dinner that hits both iron and protein goals.'
),

(
  'pinterest-tuna-pasta-high-protein',
  'Tuna Pasta High-Protein',
  ARRAY['ovulation','follicular'],
  ARRAY['dinner','lunch'],
  5, 15, 'easy', 'carb_focus',
  ARRAY['performance','muscle_gain'],
  ARRAY['performance','high_protein'],
  ARRAY[],
  ARRAY['steady_energy'],
  560, 40, 68, 10, 5,
  ARRAY['100g pasta (penne or fusilli)','2 tins tuna in olive oil','2 garlic cloves minced','1 tbsp olive oil','Juice of ½ lemon','50g baby spinach','Salt, pepper, chilli flakes','Parmesan to serve'],
  ARRAY['Cook pasta al dente in well-salted water. Reserve ½ cup pasta water before draining.','In a large pan, heat olive oil and sauté garlic and chilli flakes 1 min.','Add drained tuna and pasta water, stir to combine into a light sauce.','Toss in pasta and spinach. Squeeze lemon, season well, and serve with parmesan.'],
  true, false, true, true, false, false, 0, null,
  'High carb and high protein combination maximises glycogen storage and muscle repair during peak ovulation training sessions.',
  'Simple high-protein tuna pasta with garlic, spinach, and lemon — 40g of protein in a 20-minute weeknight dinner.'
),

(
  'pinterest-lemon-chicken-potatoes',
  'Lemon Chicken + Potatoes',
  ARRAY['follicular','ovulation'],
  ARRAY['dinner'],
  10, 30, 'easy', 'high_protein',
  ARRAY['muscle_gain','performance','maintenance'],
  ARRAY['performance','lean_build','high_protein'],
  ARRAY[],
  ARRAY['steady_energy'],
  520, 42, 44, 14, 5,
  ARRAY['4 chicken thighs or 600g breast','600g baby potatoes halved','3 garlic cloves minced','Zest and juice of 1 lemon','2 tbsp olive oil','1 tsp dried thyme','1 tsp dried rosemary','Salt and pepper'],
  ARRAY['Preheat oven to 210°C.','Toss potatoes in half the oil, thyme, salt, and pepper. Spread in a large roasting dish, roast 10 min.','While potatoes start, mix remaining oil, garlic, lemon zest and juice with rosemary.','Add chicken to the dish, spoon lemon garlic mixture over chicken.','Roast everything together 25–30 min until chicken is golden and potatoes crispy.'],
  true, false, false, true, false, false, 0, null,
  'Lean chicken protein supports follicular muscle synthesis; potatoes provide complex carbs for sustained ovulation-phase energy.',
  'Golden roasted chicken with crispy lemon-herb potatoes from one pan — a classic Sunday dinner that is also a weekly protein staple.'
),

-- ── SNACKS & DESSERTS (46–50) ────────────────────────────────────────────────

(
  'pinterest-protein-balls',
  'Protein Balls',
  ARRAY['luteal','follicular'],
  ARRAY['snack'],
  15, 0, 'easy', 'balanced',
  ARRAY['maintenance','fat_loss','recomp'],
  ARRAY['mood_support','steady_energy'],
  ARRAY['magnesium_support'],
  ARRAY['low_energy'],
  180, 10, 20, 8, 3,
  ARRAY['100g rolled oats','2 tbsp peanut butter','2 tbsp honey','1 scoop vanilla protein powder','1 tbsp chia seeds','30g dark chocolate chips','Pinch of sea salt'],
  ARRAY['Combine all ingredients in a large bowl. Mix well until a sticky dough forms.','If mixture is too dry, add 1 tbsp water. If too wet, add more oats.','Roll into 12 even balls (about 30g each).','Place on a lined tray and refrigerate 20 min to firm. Store in the fridge up to 7 days.'],
  true, true, false, false, false, false, 0, null,
  'Dark chocolate chips and peanut butter provide magnesium that directly eases PMS muscle tension during the luteal phase.',
  'Chewy no-bake protein balls with peanut butter, oats, and dark chocolate chips — make a batch on Sunday and snack all week.'
),

(
  'pinterest-greek-yogurt-dessert',
  'Greek Yogurt Dessert',
  ARRAY['follicular','luteal'],
  ARRAY['snack'],
  5, 0, 'easy', 'high_protein',
  ARRAY['fat_loss','maintenance'],
  ARRAY['mood_support','lean_build'],
  ARRAY['magnesium_support'],
  ARRAY['low_energy'],
  220, 16, 30, 4, 2,
  ARRAY['150g full-fat Greek yogurt','1 tbsp honey','30g dark chocolate shavings or chips','1 tbsp crushed pistachios or walnuts','Small handful raspberries'],
  ARRAY['Spoon Greek yogurt into a small bowl or glass.','Drizzle honey over the top.','Scatter dark chocolate, raspberries, and crushed nuts.','Serve immediately.'],
  true, true, false, false, true, false, 0, null,
  'Greek yogurt casein and dark chocolate magnesium work together to reduce PMS cravings and provide a satisfying sweet fix.',
  'Thick Greek yogurt with honey, dark chocolate shavings, and raspberries — a 5-minute dessert that feels indulgent but is full of protein.'
),

(
  'pinterest-protein-brownies',
  'Protein Brownies',
  ARRAY['luteal'],
  ARRAY['snack'],
  10, 20, 'medium', 'balanced',
  ARRAY['maintenance','recomp'],
  ARRAY['mood_support'],
  ARRAY['magnesium_support'],
  ARRAY['low_energy'],
  200, 12, 22, 8, 4,
  ARRAY['1 tin black beans drained and rinsed','2 eggs','3 tbsp cacao powder','3 tbsp maple syrup','1 scoop chocolate protein powder','1 tsp vanilla extract','½ tsp baking powder','30g dark chocolate chips','Pinch of sea salt'],
  ARRAY['Preheat oven to 175°C. Line a small brownie tin (20x20cm) with baking paper.','Blend black beans in a food processor until completely smooth.','Add eggs, cacao, maple syrup, protein powder, vanilla, and baking powder. Blend until smooth.','Fold in chocolate chips. Pour into tin.','Bake 18–20 min until set but still slightly fudgy in the centre. Cool completely before cutting.'],
  true, true, false, false, true, false, 0, null,
  'Black beans and cacao deliver a triple magnesium hit that clinical evidence links to reduced PMS cramps and mood symptoms.',
  'Fudgy protein brownies made with black beans and cacao — rich chocolatey squares with 12g protein and a serious magnesium hit for PMS support.'
),

(
  'pinterest-cottage-cheese-cheesecake',
  'Cottage Cheese Cheesecake',
  ARRAY['luteal'],
  ARRAY['snack'],
  15, 30, 'medium', 'high_protein',
  ARRAY['maintenance','recomp'],
  ARRAY['mood_support','high_protein'],
  ARRAY['magnesium_support'],
  ARRAY[]::text[],
  240, 18, 24, 8, 2,
  ARRAY['400g full-fat cottage cheese','2 eggs','3 tbsp honey','1 tsp vanilla extract','Zest of 1 lemon','80g digestive biscuits crushed','30g butter melted','Berries to serve'],
  ARRAY['Preheat oven to 160°C. Mix crushed biscuits with melted butter and press into the base of a 6-inch springform tin.','Blend cottage cheese until completely smooth. Whisk in eggs, honey, vanilla, and lemon zest.','Pour over biscuit base.','Bake 25–30 min until just set with a slight wobble in the centre. Cool fully, then refrigerate 1 hour.','Serve sliced with fresh berries.'],
  true, true, false, false, true, false, 0, null,
  'Casein protein from cottage cheese provides slow-release satiety that counters intense luteal phase sweet cravings.',
  'Light and creamy cheesecake made with cottage cheese instead of cream cheese — a high-protein dessert that satisfies PMS sweet cravings without guilt.'
),

(
  'pinterest-peanut-butter-protein-cookies',
  'Peanut Butter Protein Cookies',
  ARRAY['luteal','follicular'],
  ARRAY['snack'],
  10, 12, 'easy', 'balanced',
  ARRAY['maintenance','recomp'],
  ARRAY['mood_support','steady_energy'],
  ARRAY['magnesium_support'],
  ARRAY['low_energy'],
  180, 10, 18, 8, 2,
  ARRAY['100g natural peanut butter','1 egg','2 tbsp maple syrup','1 scoop vanilla protein powder','½ tsp baking soda','Pinch of sea salt','Dark chocolate chips optional'],
  ARRAY['Preheat oven to 180°C. Line a baking tray with paper.','Mix peanut butter, egg, maple syrup, protein powder, baking soda, and salt in a bowl until combined. Fold in chocolate chips.','Roll into 8 balls, place on tray, and flatten slightly with a fork.','Bake 10–12 min until edges are set but centres look slightly underdone. They firm as they cool.','Cool 10 min before eating. Store in an airtight container up to 5 days.'],
  true, true, false, false, true, false, 0, null,
  'Peanut butter magnesium and B6 support serotonin production to ease luteal phase mood dips and sweet cravings.',
  'Three-ingredient-style peanut butter cookies with protein powder and dark chocolate — soft, chewy, and genuinely satisfying for PMS snacking.'
);
```

- [ ] **Step 2: Confirm the file exists and has 50 INSERT values**

```bash
grep -c "pinterest-" supabase/migrations/011_seed_pinterest_recipes.sql
```

Expected output: `50`

- [ ] **Step 3: Commit the migration file**

```bash
git add supabase/migrations/011_seed_pinterest_recipes.sql
git commit -m "feat: seed 50 Pinterest-style high-protein recipes"
```

---

### Task 2: Apply to Supabase

**Files:** None (DB operation only)

- [ ] **Step 1: Apply via Supabase MCP**

Use the `mcp__claude_ai_Supabase__execute_sql` tool with the full content of `011_seed_pinterest_recipes.sql`. If the MCP tool is unavailable, run the SQL manually via the Supabase dashboard SQL editor (Dashboard → SQL Editor → paste file contents → Run).

- [ ] **Step 2: Verify the recipes were inserted**

Run the following SQL via MCP or dashboard:

```sql
SELECT COUNT(*) FROM public.recipes WHERE slug LIKE 'pinterest-%';
```

Expected: `50`

- [ ] **Step 3: Spot-check a cross-phase query**

```sql
SELECT name, phases, protein_g
FROM public.recipes
WHERE slug LIKE 'pinterest-%'
  AND phases @> ARRAY['luteal']
ORDER BY protein_g DESC
LIMIT 5;
```

Expected: 5 luteal-phase recipes returned with correct names and protein values.
```
