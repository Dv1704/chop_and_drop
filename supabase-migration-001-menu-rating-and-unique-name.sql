-- Chop & Drop, Migration 001: menu rating + seed support
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- Must run BEFORE `npm run db:seed` (see scripts/seed-menu.ts).

-- Star rating, used by the storefront's "Top Picks" section and card badges.
-- Nullable: existing rows (if any) without a rating are simply not "top picks".
alter table menu_items
  add column if not exists rating numeric(2,1);

-- Required so the seed script (scripts/seed-menu.ts) can upsert by name.
alter table menu_categories
  add constraint menu_categories_name_key unique (name);
alter table menu_items
  add constraint menu_items_name_key unique (name);
