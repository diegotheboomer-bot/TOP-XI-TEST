-- The Salty Corner: products, orders, newsletter subscribers

create table public.products (
  id          text primary key,
  name        text not null,
  price_cents integer not null check (price_cents > 0),
  active      boolean not null default true
);

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  status            text not null default 'pending'
                    check (status in ('pending', 'paid', 'failed')),
  items             jsonb not null,
  note              text,
  amount_cents      integer not null,
  stripe_session_id text unique,
  customer_name     text,
  customer_email    text,
  customer_phone    text,
  shipping_address  jsonb,
  created_at        timestamptz not null default now(),
  paid_at           timestamptz
);

create table public.subscribers (
  email      text primary key check (length(email) <= 254 and email like '%_@_%._%'),
  created_at timestamptz not null default now()
);

alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.subscribers enable row level security;

-- The website may read active products and add a subscriber. Nothing else.
-- Orders have no public policy: only the server functions (service role) touch them.
create policy "public can read active products"
  on public.products for select to anon, authenticated using (active);

create policy "public can subscribe"
  on public.subscribers for insert to anon, authenticated with check (true);

-- Confirmed products only (price in cents)
insert into public.products (id, name, price_cents) values
  ('sunshine', 'The Sunshine Box', 5000);
