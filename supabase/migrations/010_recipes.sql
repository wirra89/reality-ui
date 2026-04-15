-- supabase/migrations/010_recipes.sql
-- HerPhase recipe intelligence system
-- Tables: recipes (master), user_saved_recipes, user_hidden_recipes, user_recipe_feedback
-- Run in Supabase SQL editor.

-- ── MASTER RECIPE LIBRARY ─────────────────────────────────────────────────────

create table if not exists public.recipes (
  id                    bigint generated always as identity primary key,
  slug                  text    not null unique,
  name                  text    not null,
  phases                text[]  not null default '{}',
  meal_types            text[]  not null default '{}',
  prep_time_min         integer not null check (prep_time_min >= 0),
  cook_time_min         integer not null default 0,
  difficulty            text    not null check (difficulty in ('easy','medium','hard')),
  macro_profile         text    not null check (macro_profile in ('high_protein','balanced','carb_focus','fat_focus')),
  goals                 text[]  not null default '{}',
  phase_tags            text[]  not null default '{}',
  symptom_tags          text[]  not null default '{}',
  energy_tags           text[]  not null default '{}',
  calories              integer not null,
  protein_g             integer not null,
  carbs_g               integer not null,
  fat_g                 integer not null,
  fiber_g               integer not null default 0,
  ingredients           text[]  not null default '{}',
  instructions          text[]  not null default '{}',
  has_real_instructions boolean not null default false,
  is_vegetarian         boolean not null default false,
  is_pescatarian        boolean not null default false,
  is_high_protein       boolean not null default false,
  is_comfort_meal       boolean not null default false,
  is_low_bloat          boolean not null default false,
  is_quick              boolean generated always as (prep_time_min <= 15) stored,
  sort_priority         integer not null default 0,
  image_url             text,
  benefits              text    not null default '',
  created_at            timestamptz not null default now()
);

create index if not exists idx_recipes_phases_gin       on public.recipes using gin(phases);
create index if not exists idx_recipes_meal_types_gin   on public.recipes using gin(meal_types);
create index if not exists idx_recipes_goals_gin        on public.recipes using gin(goals);
create index if not exists idx_recipes_phase_tags_gin   on public.recipes using gin(phase_tags);
create index if not exists idx_recipes_symptom_tags_gin on public.recipes using gin(symptom_tags);
create index if not exists idx_recipes_energy_tags_gin   on public.recipes using gin(energy_tags);
create index if not exists idx_recipes_prep             on public.recipes(prep_time_min);
create index if not exists idx_recipes_protein          on public.recipes(protein_g);

-- ── USER SAVED RECIPES ────────────────────────────────────────────────────────

create table if not exists public.user_saved_recipes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  recipe_id  bigint      not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

-- ── USER HIDDEN RECIPES ───────────────────────────────────────────────────────

create table if not exists public.user_hidden_recipes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  recipe_id  bigint      not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

-- ── USER RECIPE FEEDBACK ──────────────────────────────────────────────────────

create table if not exists public.user_recipe_feedback (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  recipe_id  bigint      not null references public.recipes(id) on delete cascade,
  rating     smallint    check (rating between 1 and 5),
  cooked_at  timestamptz,
  notes      text,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_recipe_feedback_user_id
  on public.user_recipe_feedback (user_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.recipes              enable row level security;
alter table public.user_saved_recipes   enable row level security;
alter table public.user_hidden_recipes  enable row level security;
alter table public.user_recipe_feedback enable row level security;

-- Recipes: any authenticated user can read
drop policy if exists "recipes_read_authenticated" on public.recipes;
create policy "recipes_read_authenticated"
  on public.recipes for select
  using (auth.uid() is not null);

-- User saved recipes
drop policy if exists "saved_select_own"  on public.user_saved_recipes;
drop policy if exists "saved_insert_own"  on public.user_saved_recipes;
drop policy if exists "saved_delete_own"  on public.user_saved_recipes;
create policy "saved_select_own"  on public.user_saved_recipes for select using (auth.uid() = user_id);
create policy "saved_insert_own"  on public.user_saved_recipes for insert with check (auth.uid() = user_id);
create policy "saved_delete_own"  on public.user_saved_recipes for delete using (auth.uid() = user_id);

-- User hidden recipes
drop policy if exists "hidden_select_own" on public.user_hidden_recipes;
drop policy if exists "hidden_insert_own" on public.user_hidden_recipes;
drop policy if exists "hidden_delete_own" on public.user_hidden_recipes;
create policy "hidden_select_own" on public.user_hidden_recipes for select using (auth.uid() = user_id);
create policy "hidden_insert_own" on public.user_hidden_recipes for insert with check (auth.uid() = user_id);
create policy "hidden_delete_own" on public.user_hidden_recipes for delete using (auth.uid() = user_id);

-- User recipe feedback
drop policy if exists "feedback_select_own" on public.user_recipe_feedback;
drop policy if exists "feedback_insert_own" on public.user_recipe_feedback;
drop policy if exists "feedback_update_own" on public.user_recipe_feedback;
drop policy if exists "feedback_delete_own" on public.user_recipe_feedback;
create policy "feedback_select_own" on public.user_recipe_feedback for select using (auth.uid() = user_id);
create policy "feedback_insert_own" on public.user_recipe_feedback for insert with check (auth.uid() = user_id);
create policy "feedback_update_own" on public.user_recipe_feedback for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "feedback_delete_own" on public.user_recipe_feedback
  for delete using (auth.uid() = user_id);
