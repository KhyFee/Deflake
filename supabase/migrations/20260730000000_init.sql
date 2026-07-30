-- Deflake schema v0.1 — RLS multi-tenant run history
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer')),
  primary key (org_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  retention_days int not null default 30,
  ai_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.project_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  token_hash text not null unique,
  label text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.test_cases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  fingerprint text,
  first_seen_at timestamptz not null default now(),
  unique (project_id, title)
);

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  external_run_id text not null,
  schema_version int not null default 1,
  outcome text not null,
  summary jsonb not null,
  triage jsonb,
  created_at timestamptz not null default now(),
  unique (project_id, external_run_id)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  attempt_id int not null,
  status text not null,
  duration_ms int,
  meta jsonb not null default '{}'::jsonb,
  unique (run_id, attempt_id)
);

create table public.error_clusters (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  fingerprint text not null,
  class text,
  count int not null default 1,
  sample_message text,
  suggestion text
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  source text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  hypothesis text not null,
  evidence jsonb not null default '[]'::jsonb,
  suggested_patch text,
  confidence numeric,
  class text,
  source text
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  user_id uuid references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  assignee uuid references public.profiles(id),
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.quarantines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  test_title text not null,
  reason text,
  expires_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.known_issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  url text,
  created_at timestamptz not null default now()
);

create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  url text not null,
  secret_hash text,
  events text[] not null default array['run.completed','flake.detected'],
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.usage_meters (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  metric text not null,
  value bigint not null default 0,
  period_start date not null,
  unique (org_id, metric, period_start)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  actor uuid references public.profiles(id),
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.project_org(p_project uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from public.projects where id = p_project;
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.projects enable row level security;
alter table public.project_tokens enable row level security;
alter table public.test_cases enable row level security;
alter table public.runs enable row level security;
alter table public.attempts enable row level security;
alter table public.error_clusters enable row level security;
alter table public.analyses enable row level security;
alter table public.suggestions enable row level security;
alter table public.comments enable row level security;
alter table public.assignments enable row level security;
alter table public.quarantines enable row level security;
alter table public.known_issues enable row level security;
alter table public.webhooks enable row level security;
alter table public.notifications enable row level security;
alter table public.share_links enable row level security;
alter table public.usage_meters enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_self on public.profiles for select using (id = auth.uid());
create policy profiles_update_self on public.profiles for update using (id = auth.uid());

create policy orgs_member_select on public.organizations for select using (public.is_org_member(id));
create policy memberships_member_select on public.memberships for select using (public.is_org_member(org_id));

create policy projects_member_all on public.projects for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy tokens_member on public.project_tokens for all using (public.is_org_member(public.project_org(project_id))) with check (public.is_org_member(public.project_org(project_id)));
create policy tests_member on public.test_cases for all using (public.is_org_member(public.project_org(project_id))) with check (public.is_org_member(public.project_org(project_id)));
create policy runs_member on public.runs for all using (public.is_org_member(public.project_org(project_id))) with check (public.is_org_member(public.project_org(project_id)));

create policy attempts_via_run on public.attempts for all using (
  exists (select 1 from public.runs r where r.id = run_id and public.is_org_member(public.project_org(r.project_id)))
) with check (
  exists (select 1 from public.runs r where r.id = run_id and public.is_org_member(public.project_org(r.project_id)))
);

create policy clusters_via_run on public.error_clusters for all using (
  exists (select 1 from public.runs r where r.id = run_id and public.is_org_member(public.project_org(r.project_id)))
) with check (
  exists (select 1 from public.runs r where r.id = run_id and public.is_org_member(public.project_org(r.project_id)))
);

create policy analyses_via_run on public.analyses for all using (
  exists (select 1 from public.runs r where r.id = run_id and public.is_org_member(public.project_org(r.project_id)))
) with check (
  exists (select 1 from public.runs r where r.id = run_id and public.is_org_member(public.project_org(r.project_id)))
);

create policy suggestions_via_run on public.suggestions for all using (
  exists (select 1 from public.runs r where r.id = run_id and public.is_org_member(public.project_org(r.project_id)))
) with check (
  exists (select 1 from public.runs r where r.id = run_id and public.is_org_member(public.project_org(r.project_id)))
);

create policy comments_via_run on public.comments for all using (
  exists (select 1 from public.runs r where r.id = run_id and public.is_org_member(public.project_org(r.project_id)))
) with check (
  exists (select 1 from public.runs r where r.id = run_id and public.is_org_member(public.project_org(r.project_id)))
);

create policy assignments_via_run on public.assignments for all using (
  exists (select 1 from public.runs r where r.id = run_id and public.is_org_member(public.project_org(r.project_id)))
) with check (
  exists (select 1 from public.runs r where r.id = run_id and public.is_org_member(public.project_org(r.project_id)))
);

create policy quarantines_member on public.quarantines for all using (public.is_org_member(public.project_org(project_id))) with check (public.is_org_member(public.project_org(project_id)));
create policy known_issues_member on public.known_issues for all using (public.is_org_member(public.project_org(project_id))) with check (public.is_org_member(public.project_org(project_id)));
create policy webhooks_member on public.webhooks for all using (public.is_org_member(public.project_org(project_id))) with check (public.is_org_member(public.project_org(project_id)));
create policy notifications_self on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy share_via_run on public.share_links for all using (
  exists (select 1 from public.runs r where r.id = run_id and public.is_org_member(public.project_org(r.project_id)))
) with check (
  exists (select 1 from public.runs r where r.id = run_id and public.is_org_member(public.project_org(r.project_id)))
);
create policy usage_member on public.usage_meters for select using (public.is_org_member(org_id));
create policy audit_member on public.audit_events for select using (org_id is null or public.is_org_member(org_id));

insert into storage.buckets (id, name, public)
values ('artifacts', 'artifacts', false)
on conflict (id) do nothing;
