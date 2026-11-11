-- Founding clippers: the first 100 clippers get a permanent founder number (1–100).
alter table creators add column if not exists founder_number integer unique check (founder_number between 1 and 100);

-- Existing clippers first, oldest first. Test accounts (@atlas.test) never take a spot.
with ranked as (
  select c.id, row_number() over (order by c.created_at, c.id) as n
  from creators c
  join auth.users u on u.id = c.user_id
  where u.email not ilike '%@atlas.test' and c.founder_number is null
)
update creators c set founder_number = r.n
from ranked r
where c.id = r.id and r.n <= 100 and not exists (select 1 from creators where founder_number is not null);

-- New clippers get the next number until all 100 are taken.
create or replace function assign_founder_number() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  next_n integer;
begin
  if new.founder_number is not null then return new; end if;
  if exists (select 1 from auth.users where id = new.user_id and email ilike '%@atlas.test') then return new; end if;
  perform pg_advisory_xact_lock(7710100);
  select coalesce(max(founder_number), 0) + 1 into next_n from creators;
  if next_n <= 100 then new.founder_number := next_n; end if;
  return new;
end;
$$;

drop trigger if exists creators_founder_number on creators;
create trigger creators_founder_number before insert on creators
for each row execute function assign_founder_number();
