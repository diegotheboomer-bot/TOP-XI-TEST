-- 0006: sign-in handoff. The page that asked for an email link waits on a row
-- here; pressing Continue on the emailed link stores the one-time token so that
-- waiting page can finish signing in, whichever browser or device opened the email.
-- Server only (service role): RLS on, no policies.
create table login_handoffs (
  id uuid primary key,
  token_hash text,
  otp_type text,
  approved_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table login_handoffs enable row level security;
