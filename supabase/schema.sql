-- Run once in the Supabase SQL Editor. The application uses the server-only
-- DATABASE_URL connection; browser clients never query these tables directly.
create extension if not exists pgcrypto;
create sequence if not exists public.order_number_seq start 1;

create table if not exists public.admins (
  user_id text primary key,
  email text not null,
  created_at text not null
);
create table if not exists public.settings (
  key text primary key,
  value text not null
);
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  active integer not null default 1 check (active in (0,1)),
  sort integer not null default 0
);
create table if not exists public.products (
  id text primary key,
  name text not null,
  slug text not null unique,
  brand text not null,
  category_id text references public.categories(id),
  description text not null default '',
  price_cents integer not null check (price_cents > 0),
  sale_price_cents integer check (sale_price_cents > 0 and sale_price_cents < price_cents),
  active integer not null default 0 check (active in (0,1)),
  featured integer not null default 0 check (featured in (0,1)),
  created_at text not null,
  updated_at text not null
);
create table if not exists public.variants (
  id text primary key,
  product_id text not null references public.products(id),
  sku text not null unique,
  color text not null,
  size text not null,
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 2 check (min_stock >= 0),
  unique (product_id, color, size)
);
create table if not exists public.product_images (
  id text primary key,
  product_id text not null references public.products(id),
  key text not null,
  alt text not null default '',
  sort integer not null default 0
);
create table if not exists public.orders (
  id text primary key,
  number integer not null unique default nextval('public.order_number_seq'),
  customer_name text not null,
  phone text not null,
  fulfillment text not null,
  notes text not null default '',
  total_cents integer not null check (total_cents >= 0),
  status text not null default 'pending',
  source text not null default 'online',
  payment_method text,
  created_at text not null,
  confirmed_at text
);
create table if not exists public.order_items (
  id text primary key,
  order_id text not null references public.orders(id),
  variant_id text not null references public.variants(id),
  product_name text not null,
  color text not null,
  size text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents > 0)
);
create table if not exists public.stock_movements (
  id text primary key,
  variant_id text not null references public.variants(id),
  delta integer not null check (delta <> 0),
  reason text not null,
  reference text not null default '',
  actor_id text not null,
  created_at text not null
);
create table if not exists public.banners (
  id text primary key,
  title text not null,
  subtitle text not null default '',
  image_key text,
  link text not null default '/calcados',
  active integer not null default 1 check (active in (0,1)),
  sort integer not null default 0
);

create index if not exists products_category_idx on public.products(category_id);
create index if not exists variants_product_idx on public.variants(product_id);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists stock_movements_created_idx on public.stock_movements(created_at desc);

alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.banners enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 8000000, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
