-- ============================================================
-- Property Turn Manager - Initial Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  role        text not null default 'staff' check (role in ('admin', 'manager', 'staff')),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: users can read all" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles: users can update own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- BUILDINGS
-- ============================================================
create table public.buildings (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  created_at  timestamptz not null default now()
);

alter table public.buildings enable row level security;

create policy "buildings: authenticated read" on public.buildings
  for select using (auth.role() = 'authenticated');
create policy "buildings: authenticated insert" on public.buildings
  for insert with check (auth.role() = 'authenticated');
create policy "buildings: authenticated update" on public.buildings
  for update using (auth.role() = 'authenticated');
create policy "buildings: authenticated delete" on public.buildings
  for delete using (auth.role() = 'authenticated');

-- ============================================================
-- CONTRACTORS
-- ============================================================
create table public.contractors (
  id            uuid primary key default uuid_generate_v4(),
  company_name  text not null,
  contact_name  text,
  trade_type    text not null,
  phone         text,
  email         text,
  notes         text,
  created_at    timestamptz not null default now()
);

alter table public.contractors enable row level security;

create policy "contractors: authenticated read" on public.contractors
  for select using (auth.role() = 'authenticated');
create policy "contractors: authenticated insert" on public.contractors
  for insert with check (auth.role() = 'authenticated');
create policy "contractors: authenticated update" on public.contractors
  for update using (auth.role() = 'authenticated');
create policy "contractors: authenticated delete" on public.contractors
  for delete using (auth.role() = 'authenticated');

-- ============================================================
-- STAGE TEMPLATES
-- ============================================================
create table public.stage_templates (
  id                       uuid primary key default uuid_generate_v4(),
  name                     text not null,
  trade_type               text not null,
  sort_order               integer not null,
  is_active                boolean not null default true,
  default_delivery_required boolean not null default false,
  created_at               timestamptz not null default now(),
  unique (sort_order)
);

alter table public.stage_templates enable row level security;

create policy "stage_templates: authenticated read" on public.stage_templates
  for select using (auth.role() = 'authenticated');
create policy "stage_templates: authenticated insert" on public.stage_templates
  for insert with check (auth.role() = 'authenticated');
create policy "stage_templates: authenticated update" on public.stage_templates
  for update using (auth.role() = 'authenticated');
create policy "stage_templates: authenticated delete" on public.stage_templates
  for delete using (auth.role() = 'authenticated');

-- ============================================================
-- UNITS
-- ============================================================
create table public.units (
  id                     uuid primary key default uuid_generate_v4(),
  building_id            uuid not null references public.buildings(id) on delete cascade,
  unit_number            text not null,
  floor_plan             text,
  status                 text not null default 'not_started'
                           check (status in ('not_started','in_progress','on_hold','blocked','ready_to_rent','complete')),
  hold_reason            text,
  target_completion_date date,
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (building_id, unit_number)
);

create index idx_units_building_id on public.units(building_id);
create index idx_units_status on public.units(status);

alter table public.units enable row level security;

create policy "units: authenticated read" on public.units
  for select using (auth.role() = 'authenticated');
create policy "units: authenticated insert" on public.units
  for insert with check (auth.role() = 'authenticated');
create policy "units: authenticated update" on public.units
  for update using (auth.role() = 'authenticated');
create policy "units: authenticated delete" on public.units
  for delete using (auth.role() = 'authenticated');

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger units_updated_at
  before update on public.units
  for each row execute function public.set_updated_at();

-- ============================================================
-- UNIT STAGES
-- ============================================================
create table public.unit_stages (
  id                  uuid primary key default uuid_generate_v4(),
  unit_id             uuid not null references public.units(id) on delete cascade,
  stage_template_id   uuid not null references public.stage_templates(id) on delete restrict,
  status              text not null default 'not_started'
                        check (status in ('not_started','in_progress','blocked','done')),
  contractor_id       uuid references public.contractors(id) on delete set null,
  due_date            date,
  completed_at        timestamptz,
  blocker_reason      text,
  notes               text,
  delivery_required   boolean not null default false,
  delivery_status     text check (delivery_status in ('not_needed','pending','scheduled','delivered')),
  materials_list      text,
  delivery_notes      text,
  delivery_due_date   date,
  updated_at          timestamptz not null default now(),
  unique (unit_id, stage_template_id)
);

create index idx_unit_stages_unit_id on public.unit_stages(unit_id);
create index idx_unit_stages_contractor_id on public.unit_stages(contractor_id);
create index idx_unit_stages_status on public.unit_stages(status);
create index idx_unit_stages_delivery_required on public.unit_stages(delivery_required);

alter table public.unit_stages enable row level security;

create policy "unit_stages: authenticated read" on public.unit_stages
  for select using (auth.role() = 'authenticated');
create policy "unit_stages: authenticated insert" on public.unit_stages
  for insert with check (auth.role() = 'authenticated');
create policy "unit_stages: authenticated update" on public.unit_stages
  for update using (auth.role() = 'authenticated');
create policy "unit_stages: authenticated delete" on public.unit_stages
  for delete using (auth.role() = 'authenticated');

create trigger unit_stages_updated_at
  before update on public.unit_stages
  for each row execute function public.set_updated_at();

-- ============================================================
-- UNIT UPDATES
-- ============================================================
create table public.unit_updates (
  id              uuid primary key default uuid_generate_v4(),
  unit_id         uuid not null references public.units(id) on delete cascade,
  unit_stage_id   uuid references public.unit_stages(id) on delete set null,
  author_id       uuid not null references public.profiles(id) on delete restrict,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index idx_unit_updates_unit_id on public.unit_updates(unit_id);
create index idx_unit_updates_author_id on public.unit_updates(author_id);

alter table public.unit_updates enable row level security;

create policy "unit_updates: authenticated read" on public.unit_updates
  for select using (auth.role() = 'authenticated');
create policy "unit_updates: authenticated insert" on public.unit_updates
  for insert with check (auth.uid() = author_id);
create policy "unit_updates: authors can update" on public.unit_updates
  for update using (auth.uid() = author_id);
create policy "unit_updates: authors can delete" on public.unit_updates
  for delete using (auth.uid() = author_id);

-- ============================================================
-- UNIT UPDATE ATTACHMENTS
-- ============================================================
create table public.unit_update_attachments (
  id              uuid primary key default uuid_generate_v4(),
  unit_update_id  uuid not null references public.unit_updates(id) on delete cascade,
  file_url        text not null,
  file_type       text,
  created_at      timestamptz not null default now()
);

create index idx_attachments_update_id on public.unit_update_attachments(unit_update_id);

alter table public.unit_update_attachments enable row level security;

create policy "attachments: authenticated read" on public.unit_update_attachments
  for select using (auth.role() = 'authenticated');
create policy "attachments: authenticated insert" on public.unit_update_attachments
  for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- AUTO-CREATE UNIT STAGES ON UNIT INSERT
-- ============================================================
create or replace function public.create_unit_stages_from_templates()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.unit_stages (unit_id, stage_template_id, delivery_required)
  select
    new.id,
    st.id,
    st.default_delivery_required
  from public.stage_templates st
  where st.is_active = true;
  return new;
end;
$$;

create trigger on_unit_created
  after insert on public.units
  for each row execute function public.create_unit_stages_from_templates();

