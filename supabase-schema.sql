-- Chop & Drop — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Customers
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  email       text not null unique,
  created_at  timestamptz default now()
);

-- Addresses
create table if not exists addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  line1       text not null,
  city        text not null,
  postal_code text,
  created_at  timestamptz default now()
);

-- Menu categories
create table if not exists menu_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  int not null default 0
);

-- Menu items
create table if not exists menu_items (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid references menu_categories(id) on delete set null,
  name          text not null,
  description   text,
  price         numeric(10,2) not null,
  is_available  boolean default true,
  image_url     text,
  allergens     text[],
  dietary_tags  text[],
  created_at    timestamptz default now()
);

-- Orders
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid references customers(id) on delete set null,
  status           text not null default 'pending',
  fulfillment_mode text not null default 'delivery',
  subtotal         numeric(10,2) not null,
  delivery_fee     numeric(10,2) not null default 0,
  tax              numeric(10,2) not null default 0,
  tip              numeric(10,2) not null default 0,
  total            numeric(10,2) not null,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Order items (item_name stored inline — menu is static, no FK needed)
create table if not exists order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references orders(id) on delete cascade not null,
  item_name    text not null,
  qty          int not null,
  unit_price   numeric(10,2) not null
);

-- Payments
create table if not exists payments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid references orders(id) on delete cascade,
  provider            text not null default 'paystack',
  status              text not null default 'pending',
  paystack_reference  text unique,
  amount              numeric(10,2),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Deliveries
create table if not exists deliveries (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references orders(id) on delete cascade,
  address_id   uuid references addresses(id) on delete set null,
  provider     text not null default 'in_house',
  status       text not null default 'pending',
  tracking_url text,
  created_at   timestamptz default now()
);

-- AI Chat sessions
create table if not exists ai_chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  order_id    uuid references orders(id) on delete set null,
  created_at  timestamptz default now()
);

-- Chat messages
create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references ai_chat_sessions(id) on delete cascade,
  role        text not null,
  content     text not null,
  created_at  timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table customers         enable row level security;
alter table addresses         enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table payments          enable row level security;
alter table deliveries        enable row level security;
alter table menu_categories   enable row level security;
alter table menu_items        enable row level security;
alter table ai_chat_sessions  enable row level security;
alter table chat_messages     enable row level security;

-- Public read for menu data
create policy "menu_categories_public_read" on menu_categories for select using (true);
create policy "menu_items_public_read"      on menu_items      for select using (true);

-- Allow anon operations for app (server-side Edge runtime calls with anon key)
create policy "customers_anon_insert"     on customers    for insert with check (true);
create policy "customers_anon_update"     on customers    for update using (true);
create policy "customers_anon_select"     on customers    for select using (true);
create policy "orders_anon_insert"        on orders       for insert with check (true);
create policy "orders_anon_update"        on orders       for update using (true);
create policy "orders_anon_select"        on orders       for select using (true);
create policy "order_items_anon_insert"   on order_items  for insert with check (true);
create policy "order_items_anon_select"   on order_items  for select using (true);
create policy "payments_anon_insert"      on payments     for insert with check (true);
create policy "payments_anon_update"      on payments     for update using (true);
create policy "payments_anon_select"      on payments     for select using (true);
create policy "chat_sessions_anon_insert" on ai_chat_sessions for insert with check (true);
create policy "chat_messages_anon_insert" on chat_messages    for insert with check (true);
create policy "chat_messages_anon_select" on chat_messages    for select using (true);
