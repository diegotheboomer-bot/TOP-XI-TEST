-- Invite-only (private) campaigns: hidden from Discover, only invited clippers can see and join them.
alter table campaigns add column if not exists invite_only boolean not null default false;

-- Campaigns the signed-in clipper has been invited to (definer, so the policy below can read invites).
create or replace function my_invited_campaign_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select campaign_id from campaign_invites where creator_id = (select id from creators where user_id = auth.uid());
$$;

drop policy if exists "creators browse active campaigns" on campaigns;
create policy "creators browse active campaigns" on campaigns for select
  using (
    status = 'active' and my_creator_id() is not null
    and (not invite_only or id in (select my_invited_campaign_ids()))
  );
