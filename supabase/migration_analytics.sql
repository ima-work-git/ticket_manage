-- Analytics migration for 推しチケ
-- Run this in Supabase SQL Editor

-- Page views table for tracking site visits
create table if not exists public.page_views (
  id uuid primary key default uuid_generate_v4(),
  path text not null,
  user_id uuid references public.profiles,
  session_id text,
  referrer text,
  user_agent text,
  created_at timestamptz default now() not null
);

-- Index for efficient querying
create index if not exists idx_page_views_created_at on public.page_views(created_at);
create index if not exists idx_page_views_path on public.page_views(path);
create index if not exists idx_page_views_user_id on public.page_views(user_id);

-- Enable RLS
alter table public.page_views enable row level security;

-- Anyone can insert page views (for tracking)
create policy "Anyone can insert page views"
  on public.page_views for insert
  to authenticated, anon
  with check (true);

-- Only admins can view page views (for analytics)
-- Note: In production, you might want to use a service role or RPC function
create policy "Authenticated users can view page views"
  on public.page_views for select
  to authenticated
  using (true);

-- Function to get analytics summary
create or replace function public.get_analytics_summary(
  start_date timestamptz default now() - interval '30 days',
  end_date timestamptz default now()
)
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  select json_build_object(
    'total_page_views', (
      select count(*) from public.page_views
      where created_at between start_date and end_date
    ),
    'unique_visitors', (
      select count(distinct session_id) from public.page_views
      where created_at between start_date and end_date
      and session_id is not null
    ),
    'registered_users', (
      select count(*) from public.profiles
    ),
    'new_users', (
      select count(*) from public.profiles
      where created_at between start_date and end_date
    ),
    'page_views_by_day', (
      select json_agg(row_to_json(t))
      from (
        select
          date_trunc('day', created_at)::date as date,
          count(*) as views
        from public.page_views
        where created_at between start_date and end_date
        group by date_trunc('day', created_at)::date
        order by date
      ) t
    ),
    'top_pages', (
      select json_agg(row_to_json(t))
      from (
        select
          path,
          count(*) as views
        from public.page_views
        where created_at between start_date and end_date
        group by path
        order by count(*) desc
        limit 10
      ) t
    )
  ) into result;

  return result;
end;
$$;
