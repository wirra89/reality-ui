-- Migration 004: Fixed seed of 108 global ingredient foods (QUICK_FOODS).
--
-- Fixes the UUID type conflict from migration 003 (which failed because the
-- existing foods table uses UUID primary keys, not TEXT).
--
-- Changes made to the foods table schema:
--   - ADD COLUMN external_id TEXT UNIQUE  (human-readable slug, e.g. "apple")
--   - ADD COLUMN emoji TEXT
--   - ADD COLUMN category TEXT
--   - ADD COLUMN fiber_per_100g NUMERIC
--   - ADD COLUMN phases TEXT[]
--   - ADD COLUMN key_nutrient TEXT
--   - ALTER COLUMN created_by DROP NOT NULL  (global foods have no owner)
--
-- Idempotent: ON CONFLICT (external_id) DO NOTHING.

ALTER TABLE foods ADD COLUMN IF NOT EXISTS external_id    TEXT UNIQUE;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS emoji          TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS category       TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS fiber_per_100g NUMERIC;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS phases         TEXT[];
ALTER TABLE foods ADD COLUMN IF NOT EXISTS key_nutrient   TEXT;

ALTER TABLE foods ALTER COLUMN created_by DROP NOT NULL;

INSERT INTO foods (
  external_id, created_by, is_global, is_locked,
  name, brand, serving_size_g,
  kcal_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g,
  emoji, category, fiber_per_100g, phases, key_nutrient
) VALUES
  -- FRUIT (18)
  ('apple',       NULL, true, true, 'Apple',              NULL, NULL,  52,   0.3,  14.0,  0.2, '🍎', 'fruit',     2.4,  ARRAY['follicular','luteal'],                       'Quercetin · Fibre · Vitamin C'),
  ('banana',      NULL, true, true, 'Banana',             NULL, NULL,  89,   1.1,  23.0,  0.3, '🍌', 'fruit',     2.6,  ARRAY['menstrual','luteal'],                        'Vitamin B6 · Magnesium · Potassium'),
  ('strawberry',  NULL, true, true, 'Strawberry',         NULL, NULL,  32,   0.7,   7.7,  0.3, '🍓', 'fruit',     2.0,  ARRAY['follicular','ovulation'],                    'Vitamin C · Folate · Antioxidants'),
  ('orange',      NULL, true, true, 'Orange',             NULL, NULL,  47,   0.9,  12.0,  0.1, '🍊', 'fruit',     2.4,  ARRAY['menstrual','follicular'],                    'Vitamin C · Folate · Flavonoids'),
  ('pomegranate', NULL, true, true, 'Pomegranate',        NULL, NULL,  83,   1.7,  19.0,  1.2, '🍑', 'fruit',     4.0,  ARRAY['follicular','ovulation'],                    'Punicalagins · Folate · Antioxidants'),
  ('blueberry',   NULL, true, true, 'Blueberry',          NULL, NULL,  57,   0.7,  14.0,  0.3, '🫐', 'fruit',     2.4,  ARRAY['menstrual','ovulation','luteal'],             'Anthocyanins · Vitamin C · Fibre'),
  ('mango',       NULL, true, true, 'Mango',              NULL, NULL,  60,   0.8,  15.0,  0.4, '🥭', 'fruit',     1.6,  ARRAY['follicular','ovulation'],                    'Vitamin C · Beta-carotene · Folate'),
  ('pineapple',   NULL, true, true, 'Pineapple',          NULL, NULL,  50,   0.5,  13.0,  0.1, '🍍', 'fruit',     1.4,  ARRAY['follicular','ovulation'],                    'Bromelain · Vitamin C · Manganese'),
  ('watermelon',  NULL, true, true, 'Watermelon',         NULL, NULL,  30,   0.6,   7.6,  0.2, '🍉', 'fruit',     0.4,  ARRAY['menstrual','ovulation'],                     'Lycopene · Citrulline · Vitamin C'),
  ('grapes',      NULL, true, true, 'Grapes',             NULL, NULL,  69,   0.7,  18.0,  0.2, '🍇', 'fruit',     0.9,  ARRAY['follicular','luteal'],                       'Resveratrol · Vitamin K · Antioxidants'),
  ('peach',       NULL, true, true, 'Peach',              NULL, NULL,  39,   0.9,  10.0,  0.3, '🍑', 'fruit',     1.5,  ARRAY['follicular','ovulation'],                    'Vitamin C · Beta-carotene · Potassium'),
  ('pear',        NULL, true, true, 'Pear',               NULL, NULL,  57,   0.4,  15.0,  0.1, '🍐', 'fruit',     3.1,  ARRAY['luteal','menstrual'],                        'Fibre · Copper · Vitamin C'),
  ('kiwi',        NULL, true, true, 'Kiwi',               NULL, NULL,  61,   1.1,  15.0,  0.5, '🥝', 'fruit',     3.0,  ARRAY['follicular','ovulation'],                    'Vitamin C · Vitamin K · Folate'),
  ('cherry',      NULL, true, true, 'Cherry',             NULL, NULL,  63,   1.1,  16.0,  0.2, '🍒', 'fruit',     2.1,  ARRAY['menstrual','luteal'],                        'Melatonin · Anthocyanins · Vitamin C'),
  ('lemon',       NULL, true, true, 'Lemon',              NULL, NULL,  29,   1.1,   9.3,  0.3, '🍋', 'fruit',     2.8,  ARRAY['menstrual','follicular'],                    'Vitamin C · Flavonoids · Citric acid'),
  ('raspberry',   NULL, true, true, 'Raspberry',          NULL, NULL,  52,   1.2,  12.0,  0.7, '🍓', 'fruit',     6.5,  ARRAY['menstrual','follicular'],                    'Ellagic acid · Fibre · Vitamin C'),
  ('fig',         NULL, true, true, 'Fig',                NULL, NULL,  74,   0.8,  19.0,  0.3, '🍈', 'fruit',     2.9,  ARRAY['menstrual','luteal'],                        'Iron · Calcium · Potassium'),
  ('date',        NULL, true, true, 'Date (Medjool)',      NULL, NULL, 277,   1.8,  75.0,  0.2, '🟤', 'fruit',     6.7,  ARRAY['menstrual','luteal'],                        'Iron · Magnesium · Natural sugars'),
  -- VEGETABLES (18)
  ('spinach',      NULL, true, true, 'Spinach',            NULL, NULL,  23,   2.9,   3.6,  0.4, '🥬', 'vegetable', 2.2,  ARRAY['menstrual','follicular'],                    'Iron · Folate · Magnesium'),
  ('broccoli',     NULL, true, true, 'Broccoli',           NULL, NULL,  34,   2.8,   7.0,  0.4, '🥦', 'vegetable', 2.6,  ARRAY['follicular','ovulation','luteal'],            'DIM · Vitamin C · Folate'),
  ('tomato',       NULL, true, true, 'Tomato',             NULL, NULL,  18,   0.9,   3.9,  0.2, '🍅', 'vegetable', 1.2,  ARRAY['follicular','ovulation'],                    'Lycopene · Vitamin C · Potassium'),
  ('cucumber',     NULL, true, true, 'Cucumber',           NULL, NULL,  15,   0.7,   3.6,  0.1, '🥒', 'vegetable', 0.5,  ARRAY['menstrual','luteal'],                        'Water · Silica · Vitamin K'),
  ('carrot',       NULL, true, true, 'Carrot',             NULL, NULL,  41,   0.9,  10.0,  0.2, '🥕', 'vegetable', 2.8,  ARRAY['follicular','luteal'],                       'Beta-carotene · Vitamin A · Fibre'),
  ('bell_pepper',  NULL, true, true, 'Bell Pepper',        NULL, NULL,  31,   1.0,   6.0,  0.3, '🫑', 'vegetable', 2.1,  ARRAY['follicular','ovulation'],                    'Vitamin C · Vitamin B6 · Folate'),
  ('zucchini',     NULL, true, true, 'Zucchini',           NULL, NULL,  17,   1.2,   3.1,  0.3, '🥒', 'vegetable', 1.0,  ARRAY['menstrual','luteal'],                        'Potassium · Vitamin C · Folate'),
  ('kale',         NULL, true, true, 'Kale',               NULL, NULL,  49,   4.3,   9.0,  0.9, '🥬', 'vegetable', 3.6,  ARRAY['menstrual','follicular','luteal'],            'Iron · Calcium · Vitamin K · DIM'),
  ('onion',        NULL, true, true, 'Onion',              NULL, NULL,  40,   1.1,   9.3,  0.1, '🧅', 'vegetable', 1.7,  ARRAY['follicular','ovulation'],                    'Quercetin · Sulphur compounds · Chromium'),
  ('garlic',       NULL, true, true, 'Garlic',             NULL, NULL, 149,   6.4,  33.0,  0.5, '🧄', 'vegetable', 2.1,  ARRAY['menstrual','follicular'],                    'Allicin · Selenium · Vitamin B6'),
  ('sweet_potato', NULL, true, true, 'Sweet Potato',       NULL, NULL,  86,   1.6,  20.0,  0.1, '🍠', 'vegetable', 3.0,  ARRAY['menstrual','luteal'],                        'Beta-carotene · Magnesium · Potassium'),
  ('potato',       NULL, true, true, 'Potato',             NULL, NULL,  77,   2.0,  17.0,  0.1, '🥔', 'vegetable', 2.2,  ARRAY['menstrual','luteal'],                        'Potassium · Vitamin B6 · Resistant starch'),
  ('mushroom',     NULL, true, true, 'Mushroom',           NULL, NULL,  22,   3.1,   3.3,  0.3, '🍄', 'vegetable', 1.0,  ARRAY['follicular','ovulation'],                    'Vitamin D · Selenium · Beta-glucans'),
  ('avocado',      NULL, true, true, 'Avocado',            NULL, NULL, 160,   2.0,   9.0, 15.0, '🥑', 'fat',       6.7,  ARRAY['menstrual','follicular','luteal'],            'Healthy fats · Magnesium · Potassium'),
  ('corn',         NULL, true, true, 'Corn',               NULL, NULL,  86,   3.3,  19.0,  1.4, '🌽', 'vegetable', 2.7,  ARRAY['follicular','ovulation'],                    'Folate · Vitamin C · Thiamine'),
  ('lettuce',      NULL, true, true, 'Lettuce',            NULL, NULL,  15,   1.4,   2.9,  0.2, '🥗', 'vegetable', 1.3,  ARRAY['menstrual','luteal'],                        'Folate · Vitamin K · Lactucin'),
  ('cauliflower',  NULL, true, true, 'Cauliflower',        NULL, NULL,  25,   1.9,   5.0,  0.3, '🥦', 'vegetable', 2.0,  ARRAY['follicular','luteal'],                       'DIM · Vitamin C · Choline'),
  ('eggplant',     NULL, true, true, 'Eggplant',           NULL, NULL,  25,   1.0,   6.0,  0.2, '🍆', 'vegetable', 3.0,  ARRAY['follicular','ovulation'],                    'Nasunin · Chlorogenic acid · Fibre'),
  -- PROTEIN (19)
  ('chicken_breast', NULL, true, true, 'Chicken Breast',   NULL, NULL, 165,  31.0,   0.0,  3.6, '🍗', 'protein',   NULL, ARRAY['follicular','ovulation','luteal'],            'Lean protein · Vitamin B6 · Selenium'),
  ('chicken_thigh',  NULL, true, true, 'Chicken Thigh',    NULL, NULL, 209,  26.0,   0.0, 11.0, '🍗', 'protein',   NULL, ARRAY['menstrual','follicular','ovulation'],         'Protein · Iron · Zinc · B6'),
  ('beef',           NULL, true, true, 'Beef (lean)',       NULL, NULL, 250,  26.0,   0.0, 16.0, '🥩', 'protein',   NULL, ARRAY['menstrual','follicular'],                    'Haem iron · Zinc · Vitamin B12'),
  ('beef_mince',     NULL, true, true, 'Beef Mince (lean)', NULL, NULL, 215,  26.0,   0.0, 12.0, '🥩', 'protein',   NULL, ARRAY['menstrual','follicular'],                    'Iron · Zinc · B12'),
  ('salmon',         NULL, true, true, 'Salmon',            NULL, NULL, 208,  20.0,   0.0, 13.0, '🐟', 'protein',   NULL, ARRAY['menstrual','follicular','luteal'],            'Omega-3 · Vitamin D · Selenium'),
  ('tuna',           NULL, true, true, 'Tuna (canned)',     NULL, NULL, 116,  26.0,   0.0,  1.0, '🐟', 'protein',   NULL, ARRAY['follicular','ovulation'],                    'Lean protein · Selenium · Vitamin D'),
  ('tuna_canned',    NULL, true, true, 'Tuna (canned)',     NULL, NULL, 116,  26.0,   0.0,  1.0, '🐟', 'protein',   NULL, ARRAY['menstrual','follicular'],                    'Omega-3 · Selenium · B12'),
  ('egg',            NULL, true, true, 'Egg',               NULL,  60.0, 155,  13.0,   1.1, 11.0, '🥚', 'protein',   NULL, ARRAY['follicular','ovulation','luteal'],            'Choline · Vitamin D · Complete protein'),
  ('turkey',         NULL, true, true, 'Turkey',            NULL, NULL, 189,  29.0,   0.0,  7.4, '🦃', 'protein',   NULL, ARRAY['follicular','luteal'],                       'Tryptophan · Selenium · Lean protein'),
  ('turkey_breast',  NULL, true, true, 'Turkey Breast',     NULL, NULL, 135,  30.0,   0.0,  1.0, '🦃', 'protein',   NULL, ARRAY['follicular','ovulation'],                    'Tryptophan · Selenium · B3'),
  ('shrimp',         NULL, true, true, 'Shrimp / Prawns',   NULL, NULL,  99,  24.0,   0.2,  0.3, '🦐', 'protein',   NULL, ARRAY['follicular','ovulation'],                    'Iodine · Selenium · Zinc'),
  ('tofu',           NULL, true, true, 'Tofu',              NULL, NULL,  76,   8.1,   1.9,  4.8, '⬜', 'protein',   NULL, ARRAY['follicular','ovulation'],                    'Phytoestrogens · Calcium · Iron'),
  ('tempeh',         NULL, true, true, 'Tempeh',            NULL, NULL, 193,  19.0,   9.0, 11.0, '🟫', 'protein',    4.0, ARRAY['follicular','luteal'],                       'Probiotics · Phytoestrogens · Iron'),
  ('sardine',        NULL, true, true, 'Sardine',           NULL, NULL, 208,  25.0,   0.0, 11.0, '🐟', 'protein',   NULL, ARRAY['menstrual','luteal'],                        'Omega-3 · Calcium · Vitamin D'),
  ('sardines',       NULL, true, true, 'Sardines',          NULL, NULL, 208,  25.0,   0.0, 11.0, '🐠', 'protein',   NULL, ARRAY['menstrual','luteal'],                        'Omega-3 · Calcium · Vitamin D'),
  ('pork_loin',      NULL, true, true, 'Pork Loin',         NULL, NULL, 242,  27.0,   0.0, 14.0, '🥩', 'protein',   NULL, ARRAY['follicular','ovulation'],                    'Thiamine · Selenium · Zinc'),
  ('cod',            NULL, true, true, 'Cod',               NULL, NULL,  82,  18.0,   0.0,  0.7, '🐟', 'protein',   NULL, ARRAY['follicular','ovulation'],                    'Iodine · Lean protein · Vitamin B12'),
  ('edamame',        NULL, true, true, 'Edamame',           NULL, NULL, 121,  11.0,   9.0,  5.2, '🫘', 'protein',    5.2, ARRAY['follicular','ovulation'],                    'Folate · Isoflavones · Vitamin K'),
  ('protein_shake',  NULL, true, true, 'Protein Shake',     NULL, NULL, 400,  80.0,   5.0,  5.0, '🥤', 'protein',   NULL, ARRAY['follicular','ovulation'],                    'Whey protein · BCAAs · Leucine'),
  -- GRAINS & LEGUMES (17)
  ('oats',           NULL, true, true, 'Oats',              NULL, NULL, 389,  17.0,  66.0,  7.0, '🌾', 'grain',     10.0, ARRAY['menstrual','luteal'],                        'Beta-glucan · Iron · Magnesium'),
  ('brown_rice',     NULL, true, true, 'Brown Rice',        NULL, NULL, 216,   5.0,  45.0,  1.8, '🍚', 'grain',      3.5, ARRAY['luteal','menstrual'],                        'Magnesium · Selenium · B vitamins'),
  ('white_rice',     NULL, true, true, 'White Rice',        NULL, NULL, 204,   4.3,  45.0,  0.4, '🍚', 'grain',      0.6, ARRAY['menstrual'],                                 'Fast carbs · Easy digestion'),
  ('pasta',          NULL, true, true, 'Pasta (cooked)',    NULL, NULL, 158,   5.8,  31.0,  0.9, '🍝', 'grain',      1.8, ARRAY['luteal','ovulation'],                        'Complex carbs · B vitamins · Iron'),
  ('pasta_wholemeal',NULL, true, true, 'Wholemeal Pasta',   NULL, NULL, 352,  13.0,  67.0,  2.5, '🍝', 'grain',      8.0, ARRAY['follicular','ovulation'],                    'Complex carbs · B vitamins · Iron'),
  ('bread_whole',    NULL, true, true, 'Wholegrain Bread',  NULL, NULL, 247,  13.0,  41.0,  3.4, '🍞', 'grain',      6.0, ARRAY['luteal','follicular'],                       'Fibre · B vitamins · Iron'),
  ('bread_white',    NULL, true, true, 'White Bread',       NULL, NULL, 265,   9.0,  49.0,  3.2, '🍞', 'grain',      2.3, ARRAY['menstrual'],                                 'Fast carbs · Comfort energy'),
  ('rye_bread',      NULL, true, true, 'Rye Bread',         NULL, NULL, 259,   8.5,  48.0,  3.3, '🍞', 'grain',      6.0, ARRAY['luteal','menstrual'],                        'Fibre · Lignans · B vitamins'),
  ('sourdough',      NULL, true, true, 'Sourdough Bread',   NULL, NULL, 274,   9.0,  53.0,  1.4, '🍞', 'grain',      2.4, ARRAY['follicular','luteal','ovulation'],            'B vitamins · Fermented · Lower GI · Lignans'),
  ('quinoa',         NULL, true, true, 'Quinoa (cooked)',   NULL, NULL, 120,   4.4,  22.0,  1.9, '🌾', 'grain',      2.8, ARRAY['follicular','ovulation'],                    'Complete protein · Iron · Magnesium'),
  ('lentils',        NULL, true, true, 'Lentils (cooked)',  NULL, NULL, 116,   9.0,  20.0,  0.4, '🫘', 'grain',      7.9, ARRAY['menstrual','follicular'],                    'Iron · Folate · Fibre'),
  ('chickpeas',      NULL, true, true, 'Chickpeas',         NULL, NULL, 164,   8.9,  27.0,  2.6, '🫘', 'grain',      7.6, ARRAY['follicular','luteal'],                       'Folate · Iron · Phytoestrogens'),
  ('black_beans',    NULL, true, true, 'Black Beans',       NULL, NULL, 132,   8.9,  24.0,  0.5, '🫘', 'grain',      8.7, ARRAY['menstrual','luteal'],                        'Iron · Magnesium · Fibre'),
  ('buckwheat',      NULL, true, true, 'Buckwheat',         NULL, NULL, 343,  13.0,  72.0,  3.4, '🌾', 'grain',     10.0, ARRAY['follicular','menstrual'],                    'Rutin · Magnesium · Complete protein'),
  ('millet',         NULL, true, true, 'Millet',            NULL, NULL, 378,  11.0,  73.0,  4.2, '🟡', 'grain',      8.5, ARRAY['menstrual','luteal'],                        'Magnesium · Iron · Antioxidants'),
  ('granola',        NULL, true, true, 'Granola',           NULL, NULL, 471,  10.0,  64.0, 20.0, '🌾', 'grain',      5.0, ARRAY['follicular','luteal'],                       'Oat beta-glucan · Iron · Magnesium'),
  ('banana_bread',   NULL, true, true, 'Banana Bread',      NULL, NULL, 326,   5.0,  55.0, 10.0, '🍌', 'grain',     NULL, ARRAY['menstrual','luteal'],                        'B6 · Magnesium · Comfort carbs'),
  -- DAIRY (11)
  ('greek_yogurt',   NULL, true, true, 'Greek Yogurt',      NULL, NULL,  59,  10.0,   3.6,  0.4, '🫙', 'dairy',     NULL, ARRAY['menstrual','luteal'],                        'Calcium · Probiotics · Protein'),
  ('milk_whole',     NULL, true, true, 'Whole Milk',        NULL, NULL,  61,   3.2,   4.8,  3.3, '🥛', 'dairy',     NULL, ARRAY['menstrual','luteal'],                        'Calcium · Vitamin D · Iodine'),
  ('milk_skim',      NULL, true, true, 'Skim Milk',         NULL, NULL,  35,   3.4,   5.0,  0.1, '🥛', 'dairy',     NULL, ARRAY['menstrual','follicular'],                    'Calcium · Protein · Iodine'),
  ('cheese_cheddar', NULL, true, true, 'Cheddar Cheese',    NULL, NULL, 402,  25.0,   1.3, 33.0, '🧀', 'dairy',     NULL, ARRAY['menstrual','luteal'],                        'Calcium · Vitamin K2 · Protein'),
  ('cheese_feta',    NULL, true, true, 'Feta Cheese',       NULL, NULL, 264,  14.0,   4.1, 21.0, '🧀', 'dairy',     NULL, ARRAY['follicular','ovulation'],                    'Calcium · Probiotics · Vitamin B12'),
  ('cottage_cheese', NULL, true, true, 'Cottage Cheese',    NULL, NULL,  98,  11.0,   3.4,  4.3, '🫙', 'dairy',     NULL, ARRAY['follicular','ovulation'],                    'Casein protein · Selenium · B12'),
  ('kefir',          NULL, true, true, 'Kefir',             NULL, NULL,  61,   3.3,   4.5,  3.3, '🥛', 'dairy',     NULL, ARRAY['luteal','menstrual'],                        'Probiotics · Calcium · B vitamins'),
  ('butter',         NULL, true, true, 'Butter',            NULL, NULL, 717,   0.9,   0.1, 81.0, '🧈', 'dairy',     NULL, ARRAY['menstrual','follicular','luteal'],            'Vitamin A · Butyrate · Fat-soluble vitamins · CLA'),
  ('ricotta',        NULL, true, true, 'Ricotta',           NULL, NULL, 174,  11.0,   3.0, 13.0, '🧀', 'dairy',     NULL, ARRAY['follicular','ovulation'],                    'Calcium · Whey protein · B12'),
  ('halloumi',       NULL, true, true, 'Halloumi',          NULL, NULL, 321,  22.0,   1.0, 25.0, '🧀', 'dairy',     NULL, ARRAY['follicular','ovulation'],                    'Calcium · Protein · Sodium'),
  ('skyr',           NULL, true, true, 'Skyr (Icelandic Yogurt)', NULL, NULL, 63, 11.0, 4.0, 0.2, '🥛', 'dairy',   NULL, ARRAY['follicular','ovulation'],                    'Protein · Calcium · Probiotics'),
  -- FATS & NUTS (14)
  ('almonds',        NULL, true, true, 'Almonds',           NULL, NULL, 579,  21.0,  22.0, 50.0, '🌰', 'fat',       12.5, ARRAY['menstrual','luteal'],                        'Magnesium · Vitamin E · Healthy fats'),
  ('walnuts',        NULL, true, true, 'Walnuts',           NULL, NULL, 654,  15.0,  14.0, 65.0, '🌰', 'fat',        6.7, ARRAY['menstrual','follicular','luteal'],            'ALA Omega-3 · Melatonin · Magnesium'),
  ('cashews',        NULL, true, true, 'Cashews',           NULL, NULL, 553,  18.0,  30.0, 44.0, '🌰', 'fat',        3.3, ARRAY['menstrual','follicular'],                    'Iron · Zinc · Magnesium'),
  ('peanuts',        NULL, true, true, 'Peanuts',           NULL, NULL, 567,  26.0,  16.0, 49.0, '🥜', 'fat',        8.5, ARRAY['follicular','ovulation'],                    'Folate · Niacin · Resveratrol'),
  ('pumpkin_seeds',  NULL, true, true, 'Pumpkin Seeds',     NULL, NULL, 559,  30.0,  11.0, 49.0, '🎃', 'fat',        6.0, ARRAY['menstrual','follicular','ovulation'],         'Zinc · Iron · Magnesium · Phytosterols'),
  ('sunflower_seeds',NULL, true, true, 'Sunflower Seeds',   NULL, NULL, 584,  21.0,  20.0, 51.0, '🌻', 'fat',        8.6, ARRAY['luteal','follicular','ovulation'],            'Vitamin E · Selenium · Magnesium · Linoleic acid'),
  ('olive_oil',      NULL, true, true, 'Olive Oil',         NULL, NULL, 884,   0.0,   0.0,100.0, '🫙', 'fat',        NULL, ARRAY['menstrual','follicular','luteal'],            'Oleocanthal · Vitamin E · Polyphenols'),
  ('dark_chocolate', NULL, true, true, 'Dark Chocolate',    NULL, NULL, 598,   8.0,  46.0, 43.0, '🍫', 'fat',       10.9, ARRAY['menstrual','luteal'],                        'Magnesium · Iron · Theobromine'),
  ('peanut_butter',  NULL, true, true, 'Peanut Butter',     NULL, NULL, 588,  25.0,  20.0, 50.0, '🥜', 'fat',        6.0, ARRAY['luteal','follicular'],                       'Tryptophan · Magnesium · Niacin'),
  ('chia_seeds',     NULL, true, true, 'Chia Seeds',        NULL, NULL, 486,  17.0,  42.0, 31.0, '🌿', 'fat',       34.4, ARRAY['menstrual','luteal'],                        'Omega-3 · Calcium · Fibre'),
  ('flaxseeds',      NULL, true, true, 'Flaxseeds',         NULL, NULL, 534,  18.0,  29.0, 42.0, '🌻', 'fat',       27.3, ARRAY['follicular','ovulation'],                    'Lignans · Omega-3 · Fibre'),
  ('tahini',         NULL, true, true, 'Tahini',            NULL, NULL, 595,  17.0,  21.0, 54.0, '🫙', 'fat',        9.3, ARRAY['menstrual','follicular'],                    'Calcium · Iron · Sesamin'),
  ('coconut_oil',    NULL, true, true, 'Coconut Oil',       NULL, NULL, 862,   0.0,   0.0,100.0, '🥥', 'fat',        NULL, ARRAY['menstrual','luteal'],                        'MCTs · Lauric acid'),
  ('sesame_seeds',   NULL, true, true, 'Sesame Seeds',      NULL, NULL, 573,  18.0,  23.0, 50.0, '⚪', 'fat',       12.0, ARRAY['menstrual','follicular'],                    'Calcium · Lignans · Iron'),
  -- OTHER & CONDIMENTS (6)
  ('honey',               NULL, true, true, 'Honey',                       NULL, NULL, 304,   0.3,  82.0,  0.0, '🍯', 'other', NULL, ARRAY['menstrual','luteal'],              'Prostaglandin inhibitors · Antioxidants · Enzymes'),
  ('hummus',              NULL, true, true, 'Hummus',                      NULL, NULL, 166,   8.0,  14.0, 10.0, '🫙', 'other', NULL, ARRAY['follicular','luteal'],             'Iron · Folate · Healthy fats'),
  ('miso',                NULL, true, true, 'Miso Paste',                  NULL, NULL, 199,  12.0,  26.0,  6.0, '🍜', 'other', NULL, ARRAY['follicular','luteal'],             'Probiotics · Isoflavones · B vitamins'),
  ('nutritional_yeast',   NULL, true, true, 'Nutritional Yeast',           NULL, NULL, 325,  50.0,  38.0,  5.0, '🟡', 'other',  7.0, ARRAY['menstrual','follicular'],          'B12 · Folate · Complete protein'),
  ('soy_sauce',           NULL, true, true, 'Soy Sauce (low sodium)',      NULL, NULL,  60,  10.0,   6.0,  0.1, '🍶', 'other', NULL, ARRAY['follicular','luteal'],             'Isoflavones · Glutamate · Minerals'),
  ('apple_cider_vinegar', NULL, true, true, 'Apple Cider Vinegar',         NULL, NULL,  22,   0.0,   0.9,  0.0, '🍎', 'other', NULL, ARRAY['follicular','luteal'],             'Acetic acid · Probiotics · Enzymes'),
  -- DRINKS (5)
  ('matcha',        NULL, true, true, 'Matcha',                      NULL, NULL, 324,  30.0,  39.0,  5.0, '🍵', 'drink', NULL, ARRAY['follicular','ovulation'],               'L-theanine · EGCG · Caffeine'),
  ('bone_broth',    NULL, true, true, 'Bone Broth',                  NULL, NULL,  25,   5.0,   0.0,  0.5, '🍲', 'drink', NULL, ARRAY['menstrual','luteal'],                   'Collagen · Glycine · Minerals'),
  ('golden_milk',   NULL, true, true, 'Golden Milk (Turmeric Latte)', NULL, NULL,  60,   3.0,   7.0,  2.5, '🥛', 'drink', NULL, ARRAY['menstrual','luteal'],                   'Curcumin · Ginger · Black pepper'),
  ('coconut_water', NULL, true, true, 'Coconut Water',               NULL, NULL,  19,   0.7,   3.7,  0.2, '🥥', 'drink', NULL, ARRAY['menstrual','ovulation'],                'Electrolytes · Potassium · Cytokinins'),
  ('green_juice',   NULL, true, true, 'Green Juice',                 NULL, NULL,  40,   2.0,   8.0,  0.3, '🥤', 'drink', NULL, ARRAY['follicular','ovulation'],               'Chlorophyll · Vitamin C · Folate')

ON CONFLICT (external_id) DO NOTHING;
