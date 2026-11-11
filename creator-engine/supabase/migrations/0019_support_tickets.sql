-- Support: tickets people open when the assistant can't solve it, answered by the Atlas team.
create table if not exists support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  email       text,
  role        text not null,
  category    text not null,
  subject     text not null,
  message     text not null,
  transcript  jsonb not null default '[]',
  status      text not null default 'open' check (status in ('open', 'resolved')),
  reply       text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists support_tickets_user_idx on support_tickets (user_id);
alter table support_tickets enable row level security;
create policy "users read own tickets" on support_tickets for select using (user_id = auth.uid());
