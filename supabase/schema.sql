-- 推しチケ Supabase Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text not null,
  created_at timestamptz default now() not null
);

-- Groups table
create table public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  image_url text,
  owner_id uuid references public.profiles not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Staff table (group members with roles)
create table public.staff (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  role text not null check (role in ('owner', 'staff')),
  invited_by uuid references public.profiles,
  created_at timestamptz default now() not null,
  unique(group_id, user_id)
);

-- Idol members table
create table public.idol_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups on delete cascade not null,
  name text not null,
  image_url text,
  status text not null default 'active' check (status in ('active', 'graduated')),
  graduated_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Ticket templates table
create table public.ticket_templates (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups on delete cascade not null,
  name text not null,
  description text,
  image_url text,
  target_member_id uuid references public.idol_members on delete set null,
  expires_in_days integer,
  on_graduation text not null default 'destroy' check (on_graduation in ('destroy', 'convert', 'refund')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Tickets table (actual issued tickets)
create table public.tickets (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references public.ticket_templates on delete set null,
  group_id uuid references public.groups on delete cascade not null,
  owner_id uuid references public.profiles not null,
  issued_by uuid references public.profiles not null,
  issued_at timestamptz default now() not null,
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'refunded')),
  expires_at timestamptz,
  consumed_by uuid references public.profiles,
  consumed_at timestamptz,
  event_name text
);

-- Pending tickets table (for QR-based ticket claiming)
create table public.pending_tickets (
  id uuid primary key default uuid_generate_v4(),
  claim_token text unique not null,
  template_id uuid references public.ticket_templates on delete cascade not null,
  group_id uuid references public.groups on delete cascade not null,
  issued_by uuid references public.profiles not null,
  issued_at timestamptz default now() not null,
  expires_at timestamptz,
  claimed_by uuid references public.profiles,
  claimed_at timestamptz
);

-- Activity logs table
create table public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups on delete cascade not null,
  actor_id uuid references public.profiles not null,
  action text not null,
  ticket_id uuid,
  target_user_id uuid references public.profiles,
  metadata jsonb,
  created_at timestamptz default now() not null
);

-- Indexes for performance
create index idx_staff_group on public.staff(group_id);
create index idx_staff_user on public.staff(user_id);
create index idx_idol_members_group on public.idol_members(group_id);
create index idx_ticket_templates_group on public.ticket_templates(group_id);
create index idx_tickets_owner on public.tickets(owner_id);
create index idx_tickets_group on public.tickets(group_id);
create index idx_tickets_status on public.tickets(status);
create index idx_pending_tickets_token on public.pending_tickets(claim_token);
create index idx_activity_logs_group on public.activity_logs(group_id);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.staff enable row level security;
alter table public.idol_members enable row level security;
alter table public.ticket_templates enable row level security;
alter table public.tickets enable row level security;
alter table public.pending_tickets enable row level security;
alter table public.activity_logs enable row level security;

-- Profiles policies
create policy "Users can view all profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Groups policies
create policy "Anyone can view groups"
  on public.groups for select
  to authenticated
  using (true);

create policy "Staff can manage groups"
  on public.groups for all
  to authenticated
  using (
    exists (
      select 1 from public.staff
      where staff.group_id = groups.id
      and staff.user_id = auth.uid()
      and staff.role = 'owner'
    )
  );

create policy "Users can create groups"
  on public.groups for insert
  to authenticated
  with check (owner_id = auth.uid());

-- Staff policies
create policy "Staff can view group staff"
  on public.staff for select
  to authenticated
  using (
    exists (
      select 1 from public.staff s
      where s.group_id = staff.group_id
      and s.user_id = auth.uid()
    )
  );

create policy "Owners can manage staff"
  on public.staff for all
  to authenticated
  using (
    exists (
      select 1 from public.staff s
      where s.group_id = staff.group_id
      and s.user_id = auth.uid()
      and s.role = 'owner'
    )
  );

create policy "Users can add self as owner"
  on public.staff for insert
  to authenticated
  with check (user_id = auth.uid() and role = 'owner');

-- Idol members policies
create policy "Anyone can view idol members"
  on public.idol_members for select
  to authenticated
  using (true);

create policy "Staff can manage idol members"
  on public.idol_members for all
  to authenticated
  using (
    exists (
      select 1 from public.staff
      where staff.group_id = idol_members.group_id
      and staff.user_id = auth.uid()
    )
  );

-- Ticket templates policies
create policy "Anyone can view ticket templates"
  on public.ticket_templates for select
  to authenticated
  using (true);

create policy "Staff can manage ticket templates"
  on public.ticket_templates for all
  to authenticated
  using (
    exists (
      select 1 from public.staff
      where staff.group_id = ticket_templates.group_id
      and staff.user_id = auth.uid()
    )
  );

-- Tickets policies
create policy "Users can view own tickets"
  on public.tickets for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Staff can view group tickets"
  on public.tickets for select
  to authenticated
  using (
    exists (
      select 1 from public.staff
      where staff.group_id = tickets.group_id
      and staff.user_id = auth.uid()
    )
  );

create policy "Staff can issue tickets"
  on public.tickets for insert
  to authenticated
  with check (
    exists (
      select 1 from public.staff
      where staff.group_id = tickets.group_id
      and staff.user_id = auth.uid()
    )
  );

create policy "Staff can update tickets"
  on public.tickets for update
  to authenticated
  using (
    exists (
      select 1 from public.staff
      where staff.group_id = tickets.group_id
      and staff.user_id = auth.uid()
    )
  );

-- Pending tickets policies
create policy "Anyone can view pending tickets by token"
  on public.pending_tickets for select
  to authenticated
  using (true);

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

create policy "Users can claim pending tickets"
  on public.pending_tickets for update
  to authenticated
  using (claimed_by is null or claimed_by = auth.uid());

-- Activity logs policies
create policy "Staff can view group logs"
  on public.activity_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.staff
      where staff.group_id = activity_logs.group_id
      and staff.user_id = auth.uid()
    )
  );

create policy "Staff can create logs"
  on public.activity_logs for insert
  to authenticated
  with check (
    exists (
      select 1 from public.staff
      where staff.group_id = activity_logs.group_id
      and staff.user_id = auth.uid()
    )
    or actor_id = auth.uid()
  );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', new.raw_user_meta_data->>'name', 'ユーザー')
  );
  return new;
end;
$$;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
create trigger update_groups_updated_at
  before update on public.groups
  for each row execute procedure public.update_updated_at();

create trigger update_idol_members_updated_at
  before update on public.idol_members
  for each row execute procedure public.update_updated_at();

create trigger update_ticket_templates_updated_at
  before update on public.ticket_templates
  for each row execute procedure public.update_updated_at();
