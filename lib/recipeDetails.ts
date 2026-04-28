// lib/recipeDetails.ts
// Static recipe detail data for phase-seeded composite meals.
// Keys match external_id values from foods table (migration 005).

export interface RecipeDetail {
  phaseReason: string;     // Why this meal suits the current phase
  ingredients: string[];   // Ingredient list with approximate amounts
  steps: string[];         // 2–4 short prep steps
}

export const RECIPE_DETAILS: Record<string, RecipeDetail> = {

  // ── MENSTRUAL ────────────────────────────────────────────────────────────────
  "men-01": {
    phaseReason: "Omega-3s from salmon reduce prostaglandins that cause cramping.",
    ingredients: ["150g salmon fillet", "180g cooked white rice", "½ avocado, sliced", "1 tsp soy sauce", "Sesame seeds + lime wedge"],
    steps: [
      "Season salmon and pan-sear 3 min each side until flaky.",
      "Spoon rice into a bowl and arrange avocado slices on top.",
      "Place salmon over rice, drizzle soy sauce, finish with sesame seeds.",
    ],
  },
  "men-02": {
    phaseReason: "Magnesium in dark chocolate and almonds eases muscle cramps and mood dips.",
    ingredients: ["30g dark chocolate (70%+)", "20g raw almonds"],
    steps: [
      "Break chocolate into pieces.",
      "Pair with almonds — no prep needed.",
    ],
  },
  "men-03": {
    phaseReason: "Iron-rich lentils and spinach help replenish blood loss during menstruation.",
    ingredients: ["150g red lentils", "2 large handfuls spinach", "1 onion diced", "2 garlic cloves", "1 tsp cumin", "700ml vegetable stock"],
    steps: [
      "Sauté onion and garlic in olive oil 3 min.",
      "Add lentils, stock, and cumin. Simmer 20 min until lentils are soft.",
      "Stir in spinach until wilted, season, and serve warm.",
    ],
  },
  "men-04": {
    phaseReason: "Ginger tea soothes cramps; dates provide quick iron and natural sugar.",
    ingredients: ["3 slices fresh ginger", "1 cup boiling water", "2–3 Medjool dates", "1 tsp honey (optional)"],
    steps: [
      "Steep ginger in boiling water 5 min.",
      "Serve with dates on the side.",
    ],
  },
  "men-05": {
    phaseReason: "Haem iron from beef is the most bioavailable form — ideal during menstruation.",
    ingredients: ["150g beef mince or steak strips", "250g sweet potato cubed", "1 tbsp butter", "Salt, pepper, rosemary"],
    steps: [
      "Boil or microwave sweet potato until tender, then mash with butter.",
      "Season beef and pan-fry 5–7 min until cooked through.",
      "Plate mash with beef and season well.",
    ],
  },
  "men-06": {
    phaseReason: "Eggs provide B12 and choline; whole grain toast gives slow-release energy on a low-energy day.",
    ingredients: ["3 eggs", "2 slices whole grain bread", "1 tbsp butter", "Salt & black pepper"],
    steps: [
      "Toast bread to your liking.",
      "Scramble eggs in butter over low heat, stirring constantly until just set.",
      "Season and pile onto toast.",
    ],
  },
  "men-07": {
    phaseReason: "Chamomile calms uterine spasms; curcumin in turmeric reduces inflammation.",
    ingredients: ["1 chamomile tea bag", "½ tsp ground turmeric", "1 cup warm oat milk", "1 tsp honey", "Pinch of black pepper"],
    steps: [
      "Steep chamomile tea bag in warm oat milk 3 min.",
      "Remove bag, whisk in turmeric, honey, and a pinch of pepper.",
    ],
  },
  "men-08": {
    phaseReason: "Pumpkin seeds are one of the richest food sources of zinc and magnesium.",
    ingredients: ["150g full-fat Greek yogurt", "2 tbsp pumpkin seeds", "1 tbsp honey", "Small handful of berries"],
    steps: [
      "Spoon yogurt into a bowl.",
      "Top with pumpkin seeds, berries, and a drizzle of honey.",
    ],
  },
  "men-09": {
    phaseReason: "Sardines pack EPA/DHA omega-3s and non-haem iron — a quick no-cook meal.",
    ingredients: ["1 tin sardines in olive oil", "4 rye crackers", "½ lemon", "Fresh parsley or chives"],
    steps: [
      "Drain sardines and flake onto crackers.",
      "Squeeze lemon and scatter herbs.",
    ],
  },
  "men-10": {
    phaseReason: "Banana provides B6 (supports serotonin); almond butter adds magnesium and healthy fats.",
    ingredients: ["1 ripe banana", "2 tbsp almond butter"],
    steps: [
      "Slice banana or eat whole.",
      "Dip or spread almond butter — no prep needed.",
    ],
  },
  "men-11": {
    phaseReason: "Bone broth provides collagen, glycine, and minerals to support tissue repair.",
    ingredients: ["300ml bone broth", "1 small carrot sliced", "1 celery stalk sliced", "Salt & fresh parsley"],
    steps: [
      "Heat broth in a small pot.",
      "Add vegetables and simmer 8 min until tender.",
      "Ladle into a bowl and top with parsley.",
    ],
  },
  "men-12": {
    phaseReason: "Chia seeds are rich in ALA omega-3s; the gel consistency is gentle on a sensitive stomach.",
    ingredients: ["3 tbsp chia seeds", "250ml oat milk", "1 tsp vanilla extract", "1 tbsp maple syrup", "Handful of fresh berries"],
    steps: [
      "Mix chia seeds, oat milk, vanilla, and syrup. Stir well.",
      "Refrigerate overnight (or 4h minimum).",
      "Top with berries before serving.",
    ],
  },
  "men-13": {
    phaseReason: "Iodine from seaweed supports thyroid function; tofu provides plant-based iron and complete protein — both depleted during menstruation.",
    ingredients: ["400ml dashi or vegetable stock", "1 tbsp white miso paste", "100g firm tofu, cubed", "2 tbsp dried wakame seaweed", "2 spring onions, sliced", "½ tsp sesame oil"],
    steps: [
      "Soak wakame in cold water 5 min, then drain and squeeze dry.",
      "Heat stock in a pot until just before boiling — do not boil miso.",
      "Whisk miso paste into a ladleful of hot stock until smooth, then stir back in.",
      "Add tofu and wakame, warm 2 min, then ladle into bowls and top with spring onions and sesame oil.",
    ],
  },
  "men-14": {
    phaseReason: "Combining haem iron (beef) with non-haem iron (spinach) maximises total absorption.",
    ingredients: ["150g beef strips", "2 large handfuls spinach", "1 garlic clove", "1 tbsp soy sauce", "1 tsp sesame oil"],
    steps: [
      "Heat sesame oil in a wok over high heat. Add garlic 30 sec.",
      "Add beef strips and stir-fry 3–4 min until browned.",
      "Add spinach and soy sauce, toss 1 min until wilted. Serve over rice.",
    ],
  },
  "men-15": {
    phaseReason: "Dark chocolate adds magnesium to overnight oats — a comforting period-friendly breakfast.",
    ingredients: ["80g rolled oats", "250ml oat milk", "20g dark chocolate chips", "1 tbsp chia seeds", "1 tsp honey"],
    steps: [
      "Combine oats, chia seeds, oat milk, and chocolate chips in a jar.",
      "Refrigerate overnight.",
      "Drizzle honey before eating cold or warm briefly in microwave.",
    ],
  },
  "men-16": {
    phaseReason: "Ginger and turmeric are both clinically proven anti-inflammatories for period cramps.",
    ingredients: ["150g red lentils", "400ml coconut milk", "1 tsp ground turmeric", "1 tsp fresh ginger grated", "1 onion diced", "600ml vegetable stock"],
    steps: [
      "Sauté onion in oil 3 min. Add turmeric and ginger, stir 1 min.",
      "Add lentils and liquid. Simmer 20 min.",
      "Blend partially for a creamy texture and season.",
    ],
  },
  "men-17": {
    phaseReason: "Chamomile calms the nervous system; banana provides magnesium and B6 for PMS mood support.",
    ingredients: ["1 ripe banana", "1 chamomile tea bag (brewed, cooled)", "150ml oat milk", "1 tsp honey"],
    steps: [
      "Brew chamomile tea, let cool 10 min.",
      "Blend with banana, oat milk, and honey until smooth.",
    ],
  },
  "men-18": {
    phaseReason: "Sardines on rye deliver EPA/DHA and iron with zero cooking time.",
    ingredients: ["1 tin sardines in olive oil", "2 slices rye bread", "½ lemon", "Handful of rocket", "Black pepper"],
    steps: [
      "Toast rye bread lightly.",
      "Top with sardines, rocket, and a squeeze of lemon.",
    ],
  },
  "men-19": {
    phaseReason: "Plain warm bone broth is deeply nourishing and easy on a low-energy period day.",
    ingredients: ["300ml bone broth", "Pinch of sea salt", "Optional: 1 tsp miso paste"],
    steps: [
      "Heat broth gently — do not boil.",
      "Stir in miso if using and pour into a mug.",
    ],
  },

  // ── FOLLICULAR ───────────────────────────────────────────────────────────────
  "fol-01": {
    phaseReason: "Rising oestrogen increases muscle synthesis — complex carbs and protein fuel this perfectly.",
    ingredients: ["80g rolled oats", "200ml oat milk", "1 cup mixed berries", "2 boiled eggs", "1 tsp honey"],
    steps: [
      "Cook oats with oat milk over medium heat 5 min.",
      "Boil eggs 7 min, peel and halve.",
      "Top oat bowl with berries and honey; serve eggs on the side.",
    ],
  },
  "fol-02": {
    phaseReason: "Chicken provides complete protein for muscle repair; quinoa adds all 9 essential amino acids.",
    ingredients: ["150g chicken breast", "100g cooked quinoa", "Mixed salad leaves", "1 tbsp olive oil", "Lemon juice, salt & pepper"],
    steps: [
      "Season chicken and grill or pan-fry 12–15 min until cooked through.",
      "Slice and place over quinoa and salad leaves.",
      "Dress with olive oil and lemon.",
    ],
  },
  "fol-03": {
    phaseReason: "Greek yogurt probiotics support oestrogen metabolism; granola and honey provide quick fuel.",
    ingredients: ["180g full-fat Greek yogurt", "40g granola", "1 tbsp honey", "Sliced banana or berries"],
    steps: [
      "Spoon yogurt into a bowl.",
      "Layer with granola and fruit, drizzle with honey.",
    ],
  },
  "fol-04": {
    phaseReason: "Fast and slow carbs from rice cakes, peanut butter, and banana fuel rising energy levels.",
    ingredients: ["4 rice cakes", "2 tbsp peanut butter", "1 banana, sliced"],
    steps: [
      "Spread peanut butter on rice cakes.",
      "Top with banana slices.",
    ],
  },
  "fol-05": {
    phaseReason: "Tuna and brown rice deliver lean protein and complex carbs optimal for muscle building.",
    ingredients: ["1 tin tuna in water", "150g cooked brown rice", "100g broccoli florets", "1 tsp olive oil", "Soy sauce to taste"],
    steps: [
      "Steam broccoli 5 min until tender.",
      "Drain tuna and combine with warm rice and broccoli.",
      "Drizzle with olive oil and soy sauce.",
    ],
  },
  "fol-06": {
    phaseReason: "Blueberries and protein powder deliver antioxidants and fast protein in the high-energy follicular window.",
    ingredients: ["1 scoop vanilla protein powder", "150ml oat milk", "½ cup frozen blueberries", "2 tbsp granola", "1 tbsp almond butter"],
    steps: [
      "Blend protein powder with oat milk and half the blueberries until thick.",
      "Pour into a bowl and top with granola, remaining berries, and almond butter.",
    ],
  },
  "fol-07": {
    phaseReason: "Turkey is rich in B vitamins and lean protein that supports the follicular phase's high energy.",
    ingredients: ["2 whole grain wraps", "100g sliced turkey breast", "Lettuce, tomato, cucumber", "1 tbsp hummus"],
    steps: [
      "Spread hummus on wrap.",
      "Layer turkey and vegetables, roll tightly and slice in half.",
    ],
  },
  "fol-08": {
    phaseReason: "Cottage cheese casein provides sustained muscle protein synthesis throughout the day.",
    ingredients: ["200g cottage cheese", "150g fresh pineapple chunks"],
    steps: [
      "Spoon cottage cheese into a bowl.",
      "Top with pineapple. Ready in 1 minute.",
    ],
  },
  "fol-09": {
    phaseReason: "Edamame contains phytoestrogens that gently support rising oestrogen levels.",
    ingredients: ["150g shelled edamame (cooked)", "150g cooked brown rice", "2 tbsp soy sauce", "1 tsp sesame oil", "Sesame seeds, spring onion"],
    steps: [
      "Warm rice in a bowl.",
      "Toss edamame in soy sauce and sesame oil.",
      "Combine and garnish with sesame seeds and spring onion.",
    ],
  },
  "fol-10": {
    phaseReason: "Slow-release oats keep energy stable as oestrogen climbs and activity increases.",
    ingredients: ["80g rolled oats", "250ml oat milk", "1 tbsp chia seeds", "1 tbsp pumpkin seeds", "1 tsp honey"],
    steps: [
      "Mix oats, chia seeds, and milk in a jar overnight.",
      "In the morning, top with pumpkin seeds and honey.",
    ],
  },
  "fol-11": {
    phaseReason: "Salmon and rice provide omega-3s and carbs — ideal for the muscle-building follicular phase.",
    ingredients: ["120g sushi-grade salmon", "150g sushi rice", "½ avocado", "1 tbsp soy sauce", "Sesame seeds, pickled ginger"],
    steps: [
      "Cook and season sushi rice, let cool slightly.",
      "Cube salmon and avocado.",
      "Assemble bowl, drizzle with soy sauce and sesame seeds.",
    ],
  },
  "fol-12": {
    phaseReason: "A quick calcium hit that supports bone density as oestrogen rises.",
    ingredients: ["1 medium apple", "1–2 sticks string cheese"],
    steps: [
      "Slice apple into wedges.",
      "Pair with string cheese — zero prep needed.",
    ],
  },
  "fol-13": {
    phaseReason: "Kimchi probiotics help metabolise oestrogen; egg adds choline and complete protein.",
    ingredients: ["150g cooked rice", "80g kimchi", "1 egg", "1 tsp sesame oil", "1 tbsp soy sauce"],
    steps: [
      "Fry egg in sesame oil sunny-side up.",
      "Toss rice in a hot pan with kimchi and soy sauce 2 min.",
      "Plate rice and top with egg.",
    ],
  },
  "fol-14": {
    phaseReason: "DIM in broccoli supports healthy oestrogen metabolism during the follicular phase.",
    ingredients: ["150g chicken breast", "150g broccoli florets", "150g cooked rice", "1 tbsp soy sauce", "1 tsp sesame oil"],
    steps: [
      "Grill or pan-fry chicken 12 min. Slice into strips.",
      "Steam broccoli 5 min.",
      "Assemble bowl over rice and drizzle with soy and sesame oil.",
    ],
  },
  "fol-15": {
    phaseReason: "Flaxseed lignans gently bind excess oestrogen, keeping levels balanced during this phase.",
    ingredients: ["2 tbsp ground flaxseed", "1 scoop protein powder", "1 egg", "50ml oat milk", "1 tsp vanilla", "1 tsp baking powder"],
    steps: [
      "Mix all ingredients into a smooth batter.",
      "Pour small circles onto a non-stick pan over medium heat.",
      "Cook 2 min each side until golden.",
    ],
  },
  "fol-16": {
    phaseReason: "Miso glaze adds probiotics while salmon delivers omega-3s — a gut-hormone support duo.",
    ingredients: ["200g salmon fillet", "2 tbsp white miso paste", "1 tbsp honey", "1 tsp soy sauce", "1 tsp rice vinegar"],
    steps: [
      "Mix miso, honey, soy, and vinegar into a glaze.",
      "Coat salmon and marinate 15 min.",
      "Grill 8–10 min until caramelized and cooked through.",
    ],
  },
  "fol-17": {
    phaseReason: "Pumpkin seeds are one of the best dietary sources of zinc for follicle development.",
    ingredients: ["40g pumpkin seeds", "20g sunflower seeds", "15g dried cranberries"],
    steps: [
      "Mix in a small bag or bowl.",
      "Grab and go — no prep needed.",
    ],
  },
  "fol-18": {
    phaseReason: "Spirulina is packed with iron and plant protein to fuel the follicular energy surge.",
    ingredients: ["1 tsp spirulina powder", "1 cup spinach", "1 banana", "200ml coconut water", "Juice of ½ lemon"],
    steps: [
      "Add all ingredients to a blender.",
      "Blend until smooth, add ice if desired.",
    ],
  },
  "fol-19": {
    phaseReason: "Lentils provide folate — critical for cell growth and DNA repair in the follicular phase.",
    ingredients: ["150g cooked green lentils", "1 large tortilla wrap", "Mixed roasted veg (courgette, pepper, onion)", "2 tbsp hummus"],
    steps: [
      "Roast veg at 200°C for 20 min with olive oil, salt, and pepper.",
      "Spread hummus on wrap, layer with lentils and roasted veg.",
      "Fold and serve warm.",
    ],
  },

  // ── OVULATION ────────────────────────────────────────────────────────────────
  "ovu-01": {
    phaseReason: "Peak oestrogen and testosterone call for maximum zinc and iron to sustain performance.",
    ingredients: ["200g ribeye steak", "200g sweet potato cubed", "Handful of mixed greens", "1 tbsp olive oil", "Salt, pepper, rosemary"],
    steps: [
      "Roast sweet potato at 200°C with olive oil and rosemary for 25 min.",
      "Rest steak to room temp, season and sear 3 min/side for medium-rare.",
      "Plate with greens and sweet potato.",
    ],
  },
  "ovu-02": {
    phaseReason: "Fast protein post-workout with banana potassium for rapid recovery during peak phase.",
    ingredients: ["1 scoop whey protein", "1 ripe banana", "300ml cold oat milk", "Ice cubes"],
    steps: [
      "Add all ingredients to a shaker or blender.",
      "Shake or blend until smooth. Drink immediately post-workout.",
    ],
  },
  "ovu-03": {
    phaseReason: "High-protein egg whites support lean muscle building at your physiological peak.",
    ingredients: ["4 egg whites + 1 whole egg", "2 slices whole grain toast", "1 tbsp olive oil", "Salt, pepper, chives"],
    steps: [
      "Whisk eggs together, season well.",
      "Cook in olive oil over medium-low heat, folding gently.",
      "Serve over toast with chives.",
    ],
  },
  "ovu-04": {
    phaseReason: "Chicken, rice, and avocado hit the high protein + carb + healthy fat split for ovulation performance.",
    ingredients: ["150g chicken breast", "200g cooked white rice", "½ avocado", "1 tbsp soy sauce", "Cucumber slices"],
    steps: [
      "Grill or pan-fry chicken 12 min. Slice.",
      "Arrange rice in a bowl, top with chicken and avocado.",
      "Drizzle sauce and add cucumber.",
    ],
  },
  "ovu-05": {
    phaseReason: "Tuna pasta delivers a massive carb + protein load — optimal for heavy training during ovulation.",
    ingredients: ["150g pasta", "1 tin tuna in olive oil", "2 tbsp olive oil", "2 garlic cloves", "Salt, pepper, chilli flakes", "Fresh parsley"],
    steps: [
      "Cook pasta al dente, reserve ½ cup pasta water.",
      "Sauté garlic in oil 1 min. Add tuna and pasta water.",
      "Toss pasta in sauce, season, and finish with parsley.",
    ],
  },
  "ovu-06": {
    phaseReason: "Protein granola with Greek yogurt frontloads protein before peak-phase training.",
    ingredients: ["150g full-fat Greek yogurt", "40g high-protein granola", "1 tbsp honey", "Berries"],
    steps: [
      "Layer yogurt, granola, and berries in a bowl.",
      "Drizzle honey and eat immediately.",
    ],
  },
  "ovu-07": {
    phaseReason: "Smoked salmon bagel delivers omega-3s and carbs for pre- or post-workout fuelling.",
    ingredients: ["1 bagel", "80g smoked salmon", "2 tbsp cream cheese", "Capers, red onion, lemon"],
    steps: [
      "Slice and lightly toast bagel.",
      "Spread cream cheese, layer salmon, capers, and red onion. Squeeze lemon.",
    ],
  },
  "ovu-08": {
    phaseReason: "A quick lean protein snack with complex carbs for fuelling between ovulation-phase sessions.",
    ingredients: ["4 rice cakes", "80g sliced turkey", "4 cherry tomatoes halved", "Mustard or hummus"],
    steps: [
      "Spread mustard/hummus on rice cakes.",
      "Top with turkey and tomatoes. Ready in 2 min.",
    ],
  },
  "ovu-09": {
    phaseReason: "Beef is the top dietary source of zinc — critical for the LH surge that triggers ovulation.",
    ingredients: ["150g beef strips", "150g noodles", "1 red pepper sliced", "2 tbsp oyster sauce", "1 tbsp soy sauce", "1 tsp sesame oil"],
    steps: [
      "Cook noodles per packet instructions.",
      "Stir-fry beef in sesame oil 3 min. Add pepper and sauces, cook 2 min more.",
      "Toss with noodles and serve.",
    ],
  },
  "ovu-10": {
    phaseReason: "Protein pancakes provide 34g protein in a satisfying high-energy ovulation breakfast.",
    ingredients: ["1 scoop protein powder", "1 egg", "50ml oat milk", "1 ripe banana mashed", "Maple syrup to serve"],
    steps: [
      "Mash banana and mix with egg, protein powder, and oat milk.",
      "Cook in a non-stick pan over medium heat 2 min/side.",
      "Stack and drizzle with maple syrup.",
    ],
  },
  "ovu-11": {
    phaseReason: "Dates provide fast-release glucose for peak performance; walnuts add ALA omega-3s.",
    ingredients: ["4 Medjool dates pitted", "30g walnuts"],
    steps: [
      "Stuff dates with walnut pieces or eat side by side.",
      "Perfect pre-workout — ready in seconds.",
    ],
  },
  "ovu-12": {
    phaseReason: "Shrimp is rich in iodine and protein; fried rice gives the carb base needed for intense training.",
    ingredients: ["150g shrimp peeled", "200g cooked rice (day-old is best)", "2 eggs", "2 tbsp soy sauce", "1 tsp sesame oil", "Spring onions"],
    steps: [
      "Scramble eggs in a wok, set aside.",
      "Stir-fry shrimp 2 min, add rice and soy sauce. Toss over high heat 3 min.",
      "Fold in eggs and top with spring onions and sesame oil.",
    ],
  },
  "ovu-13": {
    phaseReason: "Leucine-rich whey protein triggers maximal muscle protein synthesis post-workout.",
    ingredients: ["1.5 scoops whey protein", "300ml cold milk or oat milk", "1 banana", "1 tbsp peanut butter"],
    steps: [
      "Add all to blender or shaker.",
      "Blend until smooth. Drink within 30 min of training.",
    ],
  },
  "ovu-14": {
    phaseReason: "Tuna provides zinc needed for the LH surge; poke bowl format maximises nutrient diversity.",
    ingredients: ["120g sushi-grade tuna diced", "150g sushi rice", "½ avocado", "Edamame, cucumber, pickled ginger", "Soy sauce + sesame oil dressing"],
    steps: [
      "Season and cool sushi rice.",
      "Arrange tuna, avocado, edamame, and cucumber over rice.",
      "Drizzle dressing and serve immediately.",
    ],
  },
  "ovu-15": {
    phaseReason: "High-protein French toast delivers complete amino acids in a quick pre-training breakfast.",
    ingredients: ["2 thick slices sourdough", "2 eggs + 2 egg whites", "50ml oat milk", "1 tsp cinnamon", "1 tsp vanilla", "Berries + maple syrup"],
    steps: [
      "Whisk eggs, milk, cinnamon, and vanilla together.",
      "Soak bread 30 sec each side, then pan-fry 2 min per side until golden.",
      "Serve with berries and a drizzle of syrup.",
    ],
  },
  "ov-09": {
    phaseReason: "Omega-3s and selenium from tuna support peak ovulation energy and thyroid function.",
    ingredients: ["150g seared or tinned tuna", "3 boiled eggs halved", "Green beans, cherry tomatoes, olives", "Lettuce leaves", "Dijon vinaigrette"],
    steps: [
      "Arrange salad leaves and blanched beans in a bowl.",
      "Top with tuna, eggs, tomatoes, and olives.",
      "Dress with Dijon vinaigrette.",
    ],
  },
  "ov-10": {
    phaseReason: "Zinc from beef supports the LH surge; sweet potato provides glycogen for intense training.",
    ingredients: ["200g beef steak", "250g sweet potato cubed", "1 tbsp butter", "Salt, pepper, garlic"],
    steps: [
      "Boil sweet potato 12 min, mash with butter and garlic.",
      "Sear steak 3 min/side in a hot pan. Rest 2 min before serving.",
    ],
  },
  "ov-11": {
    phaseReason: "Açaí antioxidants protect cells during high-intensity ovulation-phase training.",
    ingredients: ["100g frozen açaí purée", "1 banana", "100ml coconut water", "2 tbsp granola", "Sunflower seeds, hemp seeds"],
    steps: [
      "Blend açaí, banana, and coconut water until thick.",
      "Pour into a bowl and top with granola and seeds.",
    ],
  },
  "ov-12": {
    phaseReason: "Grilled chicken provides lean complete protein; folate in salad supports cell division.",
    ingredients: ["150g chicken breast", "1 large tortilla wrap", "Romaine lettuce, shaved parmesan", "2 tbsp Caesar dressing"],
    steps: [
      "Grill chicken 12 min, slice thin.",
      "Toss lettuce with parmesan and dressing. Fill wrap and fold.",
    ],
  },
  "ov-13": {
    phaseReason: "Shrimp zinc + mango vitamin C creates a powerful immune and hormonal support combination.",
    ingredients: ["150g shrimp grilled", "4 small corn tortillas", "½ mango diced", "½ red onion sliced thin", "Lime, coriander, jalapeño"],
    steps: [
      "Grill shrimp 2 min/side with salt and lime.",
      "Make salsa with mango, onion, coriander, and jalapeño.",
      "Load tortillas with shrimp and salsa.",
    ],
  },

  // ── LUTEAL ───────────────────────────────────────────────────────────────────
  "lut-01": {
    phaseReason: "Avocado's healthy fats and B vitamins support progesterone production in the luteal phase.",
    ingredients: ["2 slices sourdough bread", "1 ripe avocado", "2 eggs", "Salt, chilli flakes, lemon juice"],
    steps: [
      "Toast bread. Mash avocado with lemon, salt, and chilli.",
      "Poach eggs 3 min in simmering water.",
      "Spread avocado on toast and top with eggs.",
    ],
  },
  "lut-02": {
    phaseReason: "Dark chocolate and nuts deliver magnesium and healthy fats to ease luteal phase tension.",
    ingredients: ["20g dark chocolate chips", "30g mixed nuts (almonds, cashews, walnuts)"],
    steps: [
      "Combine in a small bowl or snack bag.",
      "Eat mindfully — no prep required.",
    ],
  },
  "lut-03": {
    phaseReason: "Complex carbs from sweet potato and chickpeas stabilise blood sugar and reduce PMS cravings.",
    ingredients: ["1 large sweet potato cubed", "1 tin chickpeas drained", "400ml coconut milk", "1 tbsp curry powder", "1 onion diced", "2 garlic cloves"],
    steps: [
      "Sauté onion and garlic 3 min, add curry powder 30 sec.",
      "Add sweet potato, chickpeas, and coconut milk. Simmer 20 min.",
      "Season and serve over rice or with flatbread.",
    ],
  },
  "lut-04": {
    phaseReason: "Warm milk's tryptophan promotes serotonin and melatonin — helpful for luteal phase sleep.",
    ingredients: ["250ml warm oat milk", "1 chamomile tea bag", "1 tsp honey"],
    steps: [
      "Heat milk gently. Steep chamomile tea bag 3 min.",
      "Remove bag, stir in honey, and drink before bed.",
    ],
  },
  "lut-05": {
    phaseReason: "Salmon's omega-3s reduce PMS symptoms; roasted veg provides fibre for stable energy.",
    ingredients: ["180g salmon fillet", "Mixed vegetables (courgette, pepper, cherry tomatoes)", "1 tbsp olive oil", "Lemon, garlic, herbs"],
    steps: [
      "Toss veg in olive oil and roast at 200°C for 20 min.",
      "Season salmon and bake alongside for last 12–15 min.",
      "Serve with a squeeze of lemon.",
    ],
  },
  "lut-06": {
    phaseReason: "Walnuts and banana both boost serotonin precursors — calming for luteal phase mood swings.",
    ingredients: ["1 banana", "30g walnuts", "200ml oat milk", "1 tsp honey", "Pinch of cinnamon"],
    steps: [
      "Add all ingredients to a blender.",
      "Blend until smooth.",
    ],
  },
  "lut-07": {
    phaseReason: "Pumpkin provides zinc and beta-carotene; oats deliver fibre for steady blood sugar.",
    ingredients: ["80g rolled oats", "250ml oat milk", "100g pumpkin purée", "1 tsp cinnamon", "1 tbsp maple syrup", "Pumpkin seeds"],
    steps: [
      "Cook oats with oat milk over medium heat 5 min.",
      "Stir in pumpkin purée, cinnamon, and syrup.",
      "Top with pumpkin seeds and serve warm.",
    ],
  },
  "lut-08": {
    phaseReason: "Iron and fibre from lentils support mood and energy regulation during the luteal phase.",
    ingredients: ["150g cooked green lentils", "1 cup roasted vegetables (beetroot, carrot, sweet potato)", "Handful of spinach", "Tahini dressing", "Lemon juice"],
    steps: [
      "Roast veg at 200°C for 25 min with olive oil and salt.",
      "Combine warm veg, lentils, and spinach in a bowl.",
      "Drizzle tahini dressing and lemon.",
    ],
  },
  "lut-09": {
    phaseReason: "Turkey contains tryptophan — the direct precursor to serotonin, which dips during the luteal phase.",
    ingredients: ["1 large tortilla wrap", "100g sliced turkey", "1 cup baby spinach", "1 tbsp cream cheese", "Sliced avocado"],
    steps: [
      "Spread cream cheese on wrap.",
      "Layer turkey, spinach, and avocado. Roll and slice in half.",
    ],
  },
  "lut-10": {
    phaseReason: "Oatmeal squares offer slow-release carbs — ideal for managing luteal phase energy dips.",
    ingredients: ["80g oats", "2 tbsp honey", "2 tbsp almond butter", "1 tbsp chia seeds", "Pinch of cinnamon"],
    steps: [
      "Mix all ingredients, press into a greased tray.",
      "Bake at 180°C for 12–15 min until golden.",
      "Cool completely before cutting into squares.",
    ],
  },
  "lut-11": {
    phaseReason: "Eggs provide choline and B vitamins to support progesterone-dominant brain fog.",
    ingredients: ["4 eggs", "½ red pepper diced", "½ courgette diced", "1 cup spinach", "1 tbsp olive oil", "Salt, pepper, herbs"],
    steps: [
      "Sauté vegetables in olive oil in an oven-safe pan 5 min.",
      "Pour in whisked eggs, season, and cook 3 min on stovetop.",
      "Finish under the grill 3–4 min until set.",
    ],
  },
  "lut-12": {
    phaseReason: "Tahini is rich in calcium and magnesium — two minerals that directly reduce PMS symptoms.",
    ingredients: ["2 tbsp tahini", "1 apple sliced"],
    steps: [
      "Slice apple into thin wedges.",
      "Dip in tahini — done in 2 min.",
    ],
  },
  "lut-13": {
    phaseReason: "Buckwheat's rutin compound strengthens blood vessels and reduces luteal phase bloating.",
    ingredients: ["80g buckwheat groats", "250ml oat milk", "1 tsp vanilla", "1 tbsp maple syrup", "Fresh fruit"],
    steps: [
      "Mix buckwheat, oat milk, and vanilla in a jar overnight.",
      "In the morning, top with maple syrup and fresh fruit.",
    ],
  },
  "lut-14": {
    phaseReason: "Hummus provides vitamin B6, which directly supports serotonin synthesis during PMS.",
    ingredients: ["80g hummus", "Assorted veggie sticks: carrot, celery, cucumber, pepper"],
    steps: [
      "Slice vegetables into sticks.",
      "Serve with hummus for dipping — no cooking needed.",
    ],
  },
  "lut-15": {
    phaseReason: "Tryptophan in turkey and monounsaturated fats in avocado support both mood and satiety.",
    ingredients: ["100g sliced turkey breast", "½ avocado mashed", "4–6 large lettuce leaves", "Cherry tomatoes halved", "Squeeze of lemon"],
    steps: [
      "Spread mashed avocado onto lettuce leaves.",
      "Top with turkey and tomatoes, squeeze lemon, and fold to wrap.",
    ],
  },
  "lut-16": {
    phaseReason: "Dark chocolate almond base provides the magnesium dose clinically shown to reduce PMS.",
    ingredients: ["80g dark chocolate", "40g almond flour", "2 tbsp maple syrup", "1 egg", "1 tbsp cacao powder"],
    steps: [
      "Melt chocolate, mix in almond flour, maple syrup, egg, and cacao.",
      "Pour into a lined small tin. Bake at 170°C for 12 min.",
      "Cool and cut into bites.",
    ],
  },
  "lut-17": {
    phaseReason: "Omega-3s from salmon help reduce prostaglandin production; pasta satisfies luteal phase hunger.",
    ingredients: ["150g pasta", "150g salmon fillet", "100ml light cream", "1 garlic clove", "1 tbsp capers", "Dill or parsley"],
    steps: [
      "Cook pasta al dente. Pan-fry salmon 4 min/side, flake.",
      "Sauté garlic in same pan, add cream and capers.",
      "Toss pasta with sauce, fold in salmon and herbs.",
    ],
  },
  "lut-18": {
    phaseReason: "Banana and almonds both contain magnesium and B6, directly easing PMS muscle tension.",
    ingredients: ["80g oats", "1 banana mashed", "250ml oat milk", "2 tbsp almond butter", "1 tbsp chia seeds", "1 tsp cinnamon"],
    steps: [
      "Mash banana into oats. Mix in all other ingredients.",
      "Refrigerate overnight.",
      "Eat cold or warm in the morning.",
    ],
  },
  "lut-19": {
    phaseReason: "Pumpkin and curry spices provide zinc and anti-inflammatory compounds for luteal support.",
    ingredients: ["500g pumpkin cubed", "1 tin coconut milk", "2 tsp curry paste", "1 onion diced", "1 tin chickpeas", "Fresh coriander"],
    steps: [
      "Fry onion and curry paste 2 min. Add pumpkin and coconut milk.",
      "Simmer 20 min until pumpkin is soft. Stir in chickpeas.",
      "Season and finish with coriander. Serve over rice.",
    ],
  },
  "lut-20": {
    phaseReason: "Walnuts and dates provide ALA omega-3s and natural sugars for quick calming energy.",
    ingredients: ["6 Medjool dates pitted", "40g walnuts", "1 tbsp almond butter", "Pinch of sea salt"],
    steps: [
      "Blend dates, walnuts, and almond butter in a food processor.",
      "Roll into balls. Refrigerate 20 min to firm up.",
    ],
  },
  "lut-21": {
    phaseReason: "Chamomile's apigenin binds GABA receptors, acting as a gentle natural anxiolytic for PMS.",
    ingredients: ["1 chamomile tea bag", "300ml oat milk", "1 tsp honey"],
    steps: [
      "Heat oat milk gently, steep tea bag 4 min.",
      "Remove bag, stir in honey, and serve warm.",
    ],
  },
};
