-- 0010: clipper cash-outs. Clippers cash out whenever they like: one free per
-- 7 days, then a small fee per extra cash-out (kept by the platform).
create table cashouts (
  id         uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators (id) on delete cascade,
  amount     numeric(12, 2) not null,  -- total paid out to the clipper (after any fee)
  fee        numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);
create index cashouts_creator_time_idx on cashouts (creator_id, created_at desc);
alter table cashouts enable row level security;
create policy "creators read own cashouts" on cashouts for select using (creator_id = my_creator_id());
