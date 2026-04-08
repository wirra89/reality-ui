-- Migration 005: Seed FOOD_LIBRARY composite meals into the foods table.
--
-- Macros are stored as per-100g (calculated from total_kcal / serving_g).
-- serving_size_g is set so NutritionFoodSearch defaults to the correct portion.
-- category = 'meal' distinguishes composite meals from ingredient foods.
-- Duplicate external_ids from source are silently skipped (ON CONFLICT DO NOTHING).
--
-- Column order in VALUES:
-- ext_id, name, emoji, serving_g, kcal, prot, carbs, fats, fiber, phase, key_nutrient

INSERT INTO foods (
  external_id, created_by, is_global, is_locked,
  name, brand, serving_size_g,
  kcal_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g,
  emoji, category, fiber_per_100g, phases, key_nutrient
)
SELECT
  v.ext_id,
  NULL::uuid,
  true,
  true,
  v.name,
  NULL,
  v.serving_g,
  ROUND(v.kcal   * 100.0 / v.serving_g)       AS kcal_per_100g,
  ROUND(v.prot   * 100.0 / v.serving_g, 1)    AS protein_per_100g,
  ROUND(v.carbs  * 100.0 / v.serving_g, 1)    AS carbs_per_100g,
  ROUND(v.fats   * 100.0 / v.serving_g, 1)    AS fats_per_100g,
  v.emoji,
  'meal',
  ROUND(v.fiber  * 100.0 / v.serving_g, 1)    AS fiber_per_100g,
  ARRAY[v.phase],
  v.key_nutrient
FROM (VALUES
  -- MENSTRUAL
  ('men-01', 'Salmon + Avocado Rice Bowl',       '🥑', 330, 520, 38, 42, 18,  5, 'menstrual', 'Omega-3'),
  ('men-02', 'Dark Chocolate + Almonds',          '🍫',  50, 215,  4, 18, 14,  3, 'menstrual', 'Magnesium'),
  ('men-03', 'Lentil & Spinach Soup',             '🍲', 300, 280, 16, 38,  4, 12, 'menstrual', 'Iron'),
  ('men-04', 'Warm Ginger Tea + Medjool Dates',   '🫖', 310, 165,  1, 44,  0,  4, 'menstrual', 'Iron'),
  ('men-05', 'Beef + Sweet Potato Mash',          '🥩', 320, 480, 32, 45, 14,  6, 'menstrual', 'Iron'),
  ('men-06', 'Scrambled Eggs + Whole Grain Toast','🍳', 250, 380, 22, 38, 14,  4, 'menstrual', 'B12'),
  ('men-07', 'Chamomile + Turmeric Latte',        '☕', 250,  85,  2, 14,  2,  0, 'menstrual', 'Anti-inflammatory'),
  ('men-08', 'Pumpkin Seed Yogurt Bowl',          '🌱', 230, 310, 18, 22, 14,  3, 'menstrual', 'Zinc + Magnesium'),
  ('men-09', 'Sardines on Rye Crackers',          '🐟', 140, 290, 22, 24, 10,  3, 'menstrual', 'Omega-3 + Iron'),
  ('men-10', 'Banana + Almond Butter',            '🍌', 152, 285,  7, 36, 14,  4, 'menstrual', 'Potassium + Magnesium'),
  ('men-11', 'Bone Broth + Veggies',              '🍵', 350, 180, 12, 18,  4,  5, 'menstrual', 'Collagen + Minerals'),
  ('men-12', 'Chia Pudding with Berries',         '🍓', 290, 340, 10, 38, 16, 14, 'menstrual', 'Omega-3 ALA'),
  ('men-14', 'Beef & Spinach Stir-Fry',           '🥩', 264, 380, 35,  8, 22,  3, 'menstrual', 'Haem + non-haem iron'),
  ('men-15', 'Dark Chocolate Overnight Oats',     '🍫', 350, 450, 12, 68, 14,  8, 'menstrual', 'Magnesium'),
  ('men-16', 'Ginger Turmeric Lentil Soup',       '🍲', 350, 290, 16, 44,  5, 12, 'menstrual', 'Curcumin + gingerol'),
  ('men-17', 'Chamomile Banana Smoothie',         '🍌', 336, 220,  5, 38,  8,  4, 'menstrual', 'Magnesium + B6'),
  ('men-18', 'Sardines on Rye Bread',             '🐟', 190, 340, 28, 28, 12,  4, 'menstrual', 'EPA/DHA omega-3'),
  ('men-19', 'Warm Bone Broth',                   '🫙', 300,  45,  9,  2,  1,  0, 'menstrual', 'Collagen + minerals'),
  -- duplicates (skipped by ON CONFLICT):
  ('men-11', 'Beef & Vegetable Stew',             '🍲', 350, 390, 32, 28, 14,  6, 'menstrual', 'Haem Iron'),
  ('men-12', 'Scrambled Eggs + Spinach on Rye',   '🍳', 275, 320, 24, 22, 16,  4, 'menstrual', 'Iron · B12'),
  ('men-13', 'Miso Soup + Tofu + Seaweed',        '🍜', 500, 185, 14, 12,  8,  3, 'menstrual', 'Iodine · Plant Iron'),
  ('men-14', 'Banana + Almond Butter Oats',       '🥣', 272, 460, 14, 62, 18,  8, 'menstrual', 'Magnesium · B6'),
  ('men-15', 'Pumpkin Soup + Crusty Bread',       '🎃', 390, 280,  6, 45,  8,  5, 'menstrual', 'Beta-carotene · Magnesium'),

  -- FOLLICULAR
  ('fol-01', 'Oat Bowl + Berries + Boiled Eggs',  '🥣', 300, 480, 22, 68, 10,  8, 'follicular', 'Complex Carbs'),
  ('fol-02', 'Chicken Breast + Quinoa Salad',     '🥗', 300, 490, 46, 42,  8,  6, 'follicular', 'Complete Protein'),
  ('fol-03', 'Greek Yogurt + Granola + Honey',    '🫙', 247, 420, 20, 58, 10,  3, 'follicular', 'Probiotics'),
  ('fol-04', 'Rice Cakes + Peanut Butter + Banana','🍞',122, 320,  9, 44, 11,  3, 'follicular', 'Quick Carbs'),
  ('fol-05', 'Tuna + Brown Rice + Broccoli',      '🍱', 350, 450, 40, 52,  5,  7, 'follicular', 'Lean Protein'),
  ('fol-06', 'Protein Smoothie Bowl',             '🫐', 300, 380, 28, 52,  4,  7, 'follicular', 'Protein + Antioxidants'),
  ('fol-07', 'Turkey + Whole Grain Wrap',         '🌮', 250, 420, 32, 44, 10,  5, 'follicular', 'B Vitamins'),
  ('fol-08', 'Cottage Cheese + Pineapple',        '🍍', 300, 240, 24, 28,  2,  2, 'follicular', 'Casein Protein'),
  ('fol-09', 'Edamame + Brown Rice Bowl',         '🌿', 300, 430, 22, 62,  8, 10, 'follicular', 'Phytoestrogens'),
  ('fol-10', 'Overnight Oats + Seeds',            '🌙', 300, 460, 18, 64, 14,  9, 'follicular', 'Slow-Release Carbs'),
  ('fol-11', 'Salmon Poke Bowl',                  '🍣', 320, 540, 38, 54, 16,  5, 'follicular', 'Omega-3 + Protein'),
  ('fol-12', 'Apple + String Cheese',             '🍎', 210, 170,  7, 26,  5,  4, 'follicular', 'Calcium'),
  ('fol-13', 'Kimchi Fried Rice with Egg',        '🍳', 420, 490, 22, 68, 14,  4, 'follicular', 'Probiotics + choline'),
  ('fol-14', 'Broccoli & Chicken Power Bowl',     '🥦', 380, 420, 42, 38,  9,  7, 'follicular', 'DIM + lean protein'),
  ('fol-15', 'Flaxseed Protein Pancakes',         '🥞', 160, 380, 36, 22, 14,  6, 'follicular', 'Lignans + protein'),
  ('fol-16', 'Miso Glazed Salmon',                '🍣', 280, 420, 38, 12, 22,  3, 'follicular', 'Omega-3 + probiotics'),
  ('fol-17', 'Pumpkin Seed Trail Mix',            '🌻',  75, 280, 10, 22, 18,  4, 'follicular', 'Zinc'),
  ('fol-18', 'Green Goddess Smoothie',            '🥬', 470, 195,  8, 36,  3,  5, 'follicular', 'Spirulina + iron'),
  ('fol-19', 'Lentil & Roasted Veg Wrap',         '🌯', 270, 390, 18, 58,  7, 12, 'follicular', 'Folate'),
  -- duplicates (skipped):
  ('fol-11', 'Smoked Salmon + Avocado Toast',     '🥑', 230, 490, 28, 38, 22,  7, 'follicular', 'Omega-3 · Folate'),
  ('fol-12', 'Chicken & Broccoli Stir Fry + Rice','🍱', 500, 510, 42, 55,  8,  6, 'follicular', 'DIM · Complete protein'),
  ('fol-13', 'Berry Protein Smoothie Bowl',       '🍓', 330, 320, 32, 35,  4,  7, 'follicular', 'Antioxidants · Protein'),
  ('fol-14', 'Lentil & Feta Salad',               '🥗', 300, 380, 22, 44, 12, 14, 'follicular', 'Folate · Plant Iron'),
  ('fol-15', 'Prawn & Vegetable Pasta',           '🍝', 320, 485, 36, 58,  8,  8, 'follicular', 'Iodine · Selenium'),
  ('fol-16', 'Mushroom & Spinach Omelette',       '🍳', 280, 295, 26,  6, 18,  3, 'follicular', 'Vitamin D · Iron'),

  -- OVULATION
  ('ovu-01', 'Ribeye Steak + Sweet Potato + Greens','🥩',450, 640, 48, 50, 22,  8, 'ovulation', 'Heme Iron + Zinc'),
  ('ovu-02', 'Banana + Whey Protein Shake',       '🍌', 430, 380, 32, 50,  4,  3, 'ovulation', 'Fast Protein'),
  ('ovu-03', 'Egg White Omelette + Whole Grain Toast','🍳',355,420,36, 38,  8,  4, 'ovulation', 'High Protein'),
  ('ovu-04', 'Chicken Rice Bowl with Avocado',    '🍚', 410, 620, 50, 58, 16,  5, 'ovulation', 'Performance Fuel'),
  ('ovu-05', 'Tuna Pasta with Olive Oil',         '🍝', 330, 580, 42, 72, 10,  4, 'ovulation', 'Carb + Protein'),
  ('ovu-06', 'Greek Yogurt + Protein Granola',    '💪', 250, 440, 30, 50, 10,  4, 'ovulation', 'Morning Protein'),
  ('ovu-07', 'Smoked Salmon Bagel',               '🥯', 230, 480, 28, 56, 14,  3, 'ovulation', 'Omega-3 + Carbs'),
  ('ovu-08', 'Rice Cakes + Turkey + Tomato',      '🍅', 180, 260, 22, 32,  3,  2, 'ovulation', 'Lean Protein'),
  ('ovu-09', 'Beef Stir Fry with Noodles',        '🥢', 350, 560, 38, 60, 14,  6, 'ovulation', 'Zinc'),
  ('ovu-10', 'Protein Pancakes + Maple Syrup',    '🥞', 170, 480, 34, 54, 10,  4, 'ovulation', 'Protein + Carbs'),
  ('ovu-11', 'Medjool Dates + Walnuts',           '🌰', 130, 310,  5, 48, 14,  5, 'ovulation', 'Fast Energy + Omega-3'),
  ('ovu-12', 'Shrimp Fried Rice',                 '🍤', 400, 520, 36, 62, 10,  4, 'ovulation', 'Iodine + Protein'),
  ('ovu-13', 'Post-Workout Recovery Shake',       '🥤', 460, 420, 36, 52,  5,  2, 'ovulation', 'Whey protein + leucine'),
  ('ovu-14', 'Tuna Poke Bowl',                    '🐟', 380, 490, 42, 48, 12,  5, 'ovulation', 'Zinc + omega-3'),
  ('ovu-15', 'High-Protein French Toast',         '🍞', 240, 420, 28, 38, 16,  3, 'ovulation', 'Complete protein'),
  -- duplicates (skipped):
  ('ovu-10', 'Steak & Sweet Potato',              '🥩', 450, 580, 48, 42, 18,  6, 'ovulation', 'Zinc + complex carbs'),
  ('ovu-11', 'Pre-Workout Banana & PB Toast',     '🍌', 222, 480, 14, 68, 16,  6, 'ovulation', 'Fast + slow carbs'),
  ('ovu-12', 'Chicken Burrito Bowl',              '🌯', 450, 620, 52, 58, 18, 10, 'ovulation', 'Complete protein + carbs'),
  ('ov-09',  'Tuna Niçoise Salad',               '🥗', 350, 420, 38, 18, 20,  5, 'ovulation', 'Omega-3 · Selenium'),
  ('ov-10',  'Beef Steak + Sweet Potato Mash',   '🥩', 380, 560, 44, 42, 16,  6, 'ovulation', 'Zinc · Iron'),
  ('ov-11',  'Açaí Bowl + Seeds',                '🫐', 240, 380,  8, 48, 18,  9, 'ovulation', 'Antioxidants · Zinc'),
  ('ov-12',  'Grilled Chicken Caesar Wrap',      '🌯', 280, 450, 40, 38, 12,  4, 'ovulation', 'Protein · Folate'),
  ('ov-13',  'Shrimp Tacos + Mango Salsa',       '🌮', 280, 420, 30, 50,  9,  5, 'ovulation', 'Zinc · Vitamin C'),

  -- LUTEAL
  ('lut-01', 'Avocado Toast + Poached Eggs',      '🥑', 390, 520, 20, 44, 28, 10, 'luteal', 'Healthy Fats'),
  ('lut-02', 'Mixed Nut Mix + Dark Chocolate',    '🫘',  50, 280,  6, 18, 20,  3, 'luteal', 'Magnesium'),
  ('lut-03', 'Sweet Potato + Chickpea Curry',     '🍠', 400, 460, 14, 72, 14, 14, 'luteal', 'Complex Carbs'),
  ('lut-04', 'Chamomile + Honey + Warm Milk',     '🍯', 250, 160,  8, 22,  4,  0, 'luteal', 'Tryptophan'),
  ('lut-05', 'Salmon + Roasted Vegetables',       '🐟', 380, 480, 38, 24, 24,  8, 'luteal', 'Omega-3'),
  ('lut-06', 'Walnut + Banana Smoothie',          '🥤', 350, 320,  8, 42, 14,  5, 'luteal', 'Serotonin Support'),
  ('lut-07', 'Pumpkin Oat Porridge',              '🎃', 400, 440, 16, 56, 18,  8, 'luteal', 'Zinc + Fiber'),
  ('lut-08', 'Lentil + Vegetable Bowl',           '🥦', 380, 420, 20, 58, 10, 16, 'luteal', 'Iron + Fiber'),
  ('lut-09', 'Turkey + Spinach Wrap',             '🌯', 250, 390, 30, 40, 10,  6, 'luteal', 'Tryptophan'),
  ('lut-10', 'Baked Oatmeal Squares',             '🍪',  80, 260,  7, 40,  8,  4, 'luteal', 'Stable Carbs'),
  ('lut-11', 'Egg + Veggie Frittata',             '🥚', 330, 360, 26, 12, 22,  4, 'luteal', 'B Vitamins + Choline'),
  ('lut-12', 'Tahini + Apple Slices',             '🍏', 212, 240,  6, 30, 12,  5, 'luteal', 'Calcium + Magnesium'),
  ('lut-13', 'Overnight Buckwheat Porridge',      '🌾', 330, 380, 14, 62,  6,  6, 'luteal', 'Rutin + Fiber'),
  ('lut-14', 'Hummus + Veggie Sticks',            '🫑', 230, 210,  8, 24, 10,  8, 'luteal', 'Vitamin B6'),
  ('lut-15', 'Turkey & Avocado Lettuce Wraps',    '🥑', 280, 360, 34, 10, 20,  6, 'luteal', 'Tryptophan + healthy fats'),
  ('lut-16', 'Magnesium Brownie Bites',           '🍫',  80, 180,  6, 22,  9,  5, 'luteal', 'Magnesium'),
  ('lut-17', 'Salmon Pasta with Cream Sauce',     '🍝', 400, 580, 36, 55, 22,  4, 'luteal', 'Omega-3 + complex carbs'),
  ('lut-18', 'Banana Almond Overnight Oats',      '🌙', 470, 490, 14, 65, 18,  9, 'luteal', 'Magnesium + B6'),
  ('lut-19', 'Pumpkin Curry',                     '🎃', 450, 420, 12, 62, 14,  8, 'luteal', 'Beta-carotene + zinc'),
  ('lut-20', 'Walnut & Date Energy Balls',        '🌰',  90, 240,  5, 32, 12,  4, 'luteal', 'ALA omega-3'),
  ('lut-21', 'Chamomile Honey Latte',             '🍵', 300, 110,  3, 20,  2,  0, 'luteal', 'Apigenin (calming)'),
  -- duplicates (skipped):
  ('lut-14', 'Baked Sweet Potato with Cottage Cheese','🍠',350,320,24,42,  4,  5, 'luteal', 'Casein + resistant starch'),
  ('lut-11', 'Turkey & Sweet Potato Bowl',        '🥣', 400, 450, 36, 48,  8,  7, 'luteal', 'Tryptophan · B6'),
  ('lut-12', 'Salmon Teriyaki + Brown Rice',      '🍱', 380, 520, 36, 55, 16,  5, 'luteal', 'Omega-3 · B vitamins'),
  ('lut-13', 'Chickpea & Spinach Curry',          '🍛', 450, 480, 18, 72, 10, 14, 'luteal', 'Iron · Curcumin'),
  ('lut-14', 'French Toast + Berries',            '🍞', 290, 420, 18, 58, 12,  5, 'luteal', 'Choline · B6'),
  ('lut-15', 'Stuffed Bell Peppers (Beef & Rice)','🫑', 430, 440, 30, 45, 14,  7, 'luteal', 'Zinc · Vitamin C'),
  ('lut-16', 'Peanut Butter Banana Smoothie',     '🥤', 402, 380, 12, 52, 16,  5, 'luteal', 'Magnesium · B6'),
  ('lut-17', 'Cottage Cheese + Walnuts + Honey',  '🥛', 227, 310, 28, 14, 16,  1, 'luteal', 'Casein · Omega-3')

) AS v(ext_id, name, emoji, serving_g, kcal, prot, carbs, fats, fiber, phase, key_nutrient)
ON CONFLICT (external_id) DO NOTHING;
