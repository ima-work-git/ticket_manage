-- Migration: Update pending_tickets table for offline-first support
-- Run this in Supabase SQL Editor after the initial schema

-- Drop old pending_tickets table if it exists with old structure
drop table if exists public.pending_tickets cascade;

-- Create new pending_tickets table
create table public.pending_tickets (
  id uuid primary key,
  template_id uuid references public.ticket_templates on delete set null,
  group_id uuid references public.groups on delete cascade not null,
  template_name text not null,
  template_image text,
  expires_in_days integer,
  issued_by uuid references public.profiles not null,
  issued_at timestamptz default now() not null,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'expired')),
  claimed_by uuid references public.profiles,
  claimed_by_nickname text,
  claimed_at timestamptz
);

-- Index for performance
create index idx_pending_tickets_group on public.pending_tickets(group_id);
create index idx_pending_tickets_status on public.pending_tickets(status);
create index idx_pending_tickets_issued_by on public.pending_tickets(issued_by);

-- Enable RLS
alter table public.pending_tickets enable row level security;

-- Policies for pending_tickets
-- Staff can view pending tickets for their groups
create policy "Staff can view group pending tickets"
  on public.pending_tickets for select
  to authenticated
  using (
    exists (
      select 1 from public.staff
      where staff.group_id = pending_tickets.group_id
      and staff.user_id = auth.uid()
    )
  );

-- Staff can create pending tickets
create policy "Staff can create pending tickets"
  on public.pending_tickets for insert
  to authenticated
  with check (
    exists (
      select 1 from public.staff
      where staff.group_id = pending_tickets.group_id
      and staff.user_id = auth.uid()
    )
  );

-- Staff can update pending tickets (to mark as claimed)
create policy "Staff can update pending tickets"
  on public.pending_tickets for update
  to authenticated
  using (
    exists (
      select 1 from public.staff
      where staff.group_id = pending_tickets.group_id
      and staff.user_id = auth.uid()
    )
  );

-- Also allow users to insert tickets (for offline sync when fan receives)
create policy "Users can insert own tickets"
  on public.tickets for insert
  to authenticated
  with check (owner_id = auth.uid());
