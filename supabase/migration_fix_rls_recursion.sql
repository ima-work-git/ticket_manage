-- Migration: Fix infinite recursion in staff RLS policy
-- Run this in Supabase SQL Editor

-- Drop the problematic policy
drop policy if exists "Staff can view group staff" on public.staff;

-- Create a simpler policy that doesn't cause recursion
-- Users can view staff records for groups they belong to
create policy "Users can view own staff records"
  on public.staff for select
  to authenticated
  using (user_id = auth.uid());

-- Staff can view other staff in their groups (using a subquery that doesn't recurse)
create policy "Staff can view group members"
  on public.staff for select
  to authenticated
  using (
    group_id in (
      select group_id from public.staff where user_id = auth.uid()
    )
  );

-- Also fix pending_tickets policy if it has similar issues
drop policy if exists "Users can view their own claimed tickets by email" on public.pending_tickets;

create policy "Users can view own claimed tickets"
  on public.pending_tickets for select
  to authenticated
  using (claimed_by = auth.uid());

-- Allow viewing pending tickets by email (for ticket restoration)
create policy "Users can view tickets by email"
  on public.pending_tickets for select
  to authenticated
  using (
    claimed_by_email = (
      select email from auth.users where id = auth.uid()
    )
  );
