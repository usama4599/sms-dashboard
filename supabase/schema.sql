-- ============================================================================
-- SMS Number Dashboard — Database Schema
-- Run this entire file in Supabase Dashboard > SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE (extends Supabase auth.users with app-specific profile data)
-- ----------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  credits integer not null default 0 check (credits >= 0),
  created_at timestamptz not null default now()
);

comment on table public.users is 'Profile data for each authenticated user, including role and credit balance.';

-- ----------------------------------------------------------------------------
-- 2. PHONE_NUMBERS TABLE (admin-managed pool of claimable numbers)
-- ----------------------------------------------------------------------------
create table public.phone_numbers (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  country text not null default 'US',
  cost integer not null default 1 check (cost > 0),
  status text not null default 'available' check (status in ('available', 'claimed')),
  created_at timestamptz not null default now()
);

comment on table public.phone_numbers is 'Pool of phone numbers available for users to claim. Admin adds/removes these.';

-- ----------------------------------------------------------------------------
-- 3. CLAIMED_NUMBERS TABLE (records which user claimed which number)
-- ----------------------------------------------------------------------------
create table public.claimed_numbers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  phone_number_id uuid not null references public.phone_numbers(id) on delete cascade,
  number text not null,
  cost_paid integer not null,
  claimed_at timestamptz not null default now()
);

comment on table public.claimed_numbers is 'History of numbers claimed by users, including cost paid at time of claim.';

-- ----------------------------------------------------------------------------
-- 4. CREDIT_TRANSACTIONS TABLE (audit log of every credit change)
-- ----------------------------------------------------------------------------
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount integer not null,
  type text not null check (type in ('admin_add', 'admin_remove', 'claim_deduct')),
  description text,
  created_at timestamptz not null default now()
);

comment on table public.credit_transactions is 'Audit trail of all credit additions/deductions for every user.';

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------
create index idx_phone_numbers_status on public.phone_numbers(status);
create index idx_claimed_numbers_user on public.claimed_numbers(user_id);
create index idx_credit_transactions_user on public.credit_transactions(user_id);

-- ----------------------------------------------------------------------------
-- AUTO-CREATE PROFILE ROW WHEN A NEW AUTH USER SIGNS UP
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role, credits)
  values (new.id, new.email, 'user', 0);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- ATOMIC "CLAIM NUMBER" FUNCTION
-- Handles: credit check -> deduct credits -> mark number claimed ->
-- insert claimed_numbers row -> log transaction. All in one transaction
-- so there is no race condition between two users claiming the same number
-- or a user's balance going negative.
-- ----------------------------------------------------------------------------
create or replace function public.claim_phone_number(p_phone_number_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_number record;
  v_user record;
  v_claim_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the phone number row to prevent two users claiming it simultaneously
  select * into v_number
  from public.phone_numbers
  where id = p_phone_number_id
  for update;

  if v_number is null then
    raise exception 'Phone number not found';
  end if;

  if v_number.status != 'available' then
    raise exception 'Phone number is no longer available';
  end if;

  -- Lock the user row and check balance
  select * into v_user
  from public.users
  where id = v_user_id
  for update;

  if v_user.credits < v_number.cost then
    raise exception 'Insufficient credits';
  end if;

  -- Deduct credits
  update public.users
  set credits = credits - v_number.cost
  where id = v_user_id;

  -- Mark number as claimed
  update public.phone_numbers
  set status = 'claimed'
  where id = p_phone_number_id;

  -- Record the claim
  insert into public.claimed_numbers (user_id, phone_number_id, number, cost_paid)
  values (v_user_id, p_phone_number_id, v_number.number, v_number.cost)
  returning id into v_claim_id;

  -- Log the transaction
  insert into public.credit_transactions (user_id, amount, type, description)
  values (v_user_id, -v_number.cost, 'claim_deduct', 'Claimed number ' || v_number.number);

  return json_build_object(
    'success', true,
    'claim_id', v_claim_id,
    'number', v_number.number,
    'cost_paid', v_number.cost
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- ADMIN FUNCTION: ADJUST USER CREDITS (add or remove, with audit log)
-- ----------------------------------------------------------------------------
create or replace function public.admin_adjust_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
begin
  select role into v_caller_role from public.users where id = auth.uid();

  if v_caller_role != 'admin' then
    raise exception 'Only admins can adjust credits';
  end if;

  update public.users
  set credits = credits + p_amount
  where id = p_user_id;

  if not found then
    raise exception 'User not found';
  end if;

  insert into public.credit_transactions (user_id, amount, type, description)
  values (
    p_user_id,
    p_amount,
    case when p_amount >= 0 then 'admin_add' else 'admin_remove' end,
    coalesce(p_description, 'Manual adjustment by admin')
  );

  return json_build_object('success', true);
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.users enable row level security;
alter table public.phone_numbers enable row level security;
alter table public.claimed_numbers enable row level security;
alter table public.credit_transactions enable row level security;

-- Helper function: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------- USERS POLICIES ----------------
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id or public.is_admin());

create policy "Users can update their own non-sensitive fields"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Note: credits/role changes for OTHER users only happen via the
-- security-definer admin_adjust_credits() function above, not direct UPDATE,
-- so no separate "admin update any user" policy is needed for credits.
-- Admins can still view all rows via the SELECT policy above.

-- ---------------- PHONE_NUMBERS POLICIES ----------------
create policy "Anyone authenticated can view available numbers"
  on public.phone_numbers for select
  using (auth.uid() is not null);

create policy "Only admins can insert numbers"
  on public.phone_numbers for insert
  with check (public.is_admin());

create policy "Only admins can update numbers"
  on public.phone_numbers for update
  using (public.is_admin());

create policy "Only admins can delete numbers"
  on public.phone_numbers for delete
  using (public.is_admin());

-- ---------------- CLAIMED_NUMBERS POLICIES ----------------
create policy "Users can view their own claimed numbers"
  on public.claimed_numbers for select
  using (auth.uid() = user_id or public.is_admin());

-- No direct INSERT policy for regular users — claiming only happens through
-- the claim_phone_number() security-definer function, which bypasses RLS
-- safely because the logic itself enforces ownership and balance checks.

-- ---------------- CREDIT_TRANSACTIONS POLICIES ----------------
create policy "Users can view their own transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id or public.is_admin());

-- No direct INSERT policy — all transaction logs are created exclusively via
-- the security-definer functions above (claim_phone_number, admin_adjust_credits).

-- ============================================================================
-- OPTIONAL: Seed an admin user manually after this user signs up normally.
-- Run this AFTER you've signed up with the email you want to be admin:
--
--   update public.users set role = 'admin' where email = 'your-admin@email.com';
-- ============================================================================
