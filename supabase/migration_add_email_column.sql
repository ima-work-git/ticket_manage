-- Migration: Add claimed_by_email column for reliable ticket restoration
-- Run this ONLY if pending_tickets table already exists

-- Add the email column if it doesn't exist
alter table public.pending_tickets
  add column if not exists claimed_by_email text;

-- Add index for email search
create index if not exists idx_pending_tickets_email
  on public.pending_tickets(claimed_by_email);

-- Add policy for users to query their own claimed tickets by email
-- First drop if exists to avoid conflicts
drop policy if exists "Users can view their own claimed tickets by email"
  on public.pending_tickets;

-- Create the policy
create policy "Users can view their own claimed tickets by email"
  on public.pending_tickets for select
  to authenticated
  using (claimed_by_email = (select email from auth.users where id = auth.uid()));
