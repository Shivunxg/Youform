-- ============================================================
-- KTPCL SIMMS — Database Schema
-- Run this ONCE in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('spectrum_admin', 'assistant_engineer')),
  name text not null,
  email text,
  mobile text,
  employee_id text,
  substation_id uuid,
  region_id uuid,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. REGIONS
-- ============================================================
create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. SUBSTATIONS
-- ============================================================
create table if not exists public.substations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  region_id uuid not null references public.regions(id) on delete restrict,
  address text,
  assistant_engineer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_substation_fk foreign key (substation_id) references public.substations(id) on delete set null;
alter table public.profiles
  add constraint profiles_region_fk foreign key (region_id) references public.regions(id) on delete set null;

-- ============================================================
-- 4. EQUIPMENT
-- ============================================================
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  manufacturer text,
  model text,
  serial_number text,
  substation_id uuid not null references public.substations(id) on delete cascade,
  installation_date date,
  warranty_until date,
  status text not null default 'healthy' check (status in ('healthy', 'service_required', 'replacement_required')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. COMPONENTS (master list of replaceable parts per equipment)
-- ============================================================
create table if not exists public.components (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  min_qty integer not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. INVENTORY (stock levels per component, per substation)
-- ============================================================
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.components(id) on delete cascade,
  substation_id uuid not null references public.substations(id) on delete cascade,
  available_qty integer not null default 0,
  min_qty integer not null default 0,
  unit text not null default 'Nos',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 7. JOB CARDS
-- ============================================================
create table if not exists public.job_cards (
  id uuid primary key default gen_random_uuid(),
  job_card_number text not null unique,
  substation_id uuid not null references public.substations(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete set null,
  component text,
  issue_description text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  remarks text,
  raised_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 8. SERVICE REQUESTS
-- ============================================================
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  substation_id uuid not null references public.substations(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete set null,
  type text not null default 'preventive' check (type in ('preventive', 'corrective', 'replacement')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'in_progress', 'completed', 'rejected')),
  requested_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 9. NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null default 'system' check (type in ('job_card', 'service_request', 'inventory', 'system')),
  target_role text check (target_role in ('spectrum_admin', 'assistant_engineer')),
  substation_id uuid references public.substations(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 10. AUTO-GENERATE JOB CARD / SERVICE REQUEST NUMBERS
-- ============================================================
create sequence if not exists job_card_seq start 1;
create sequence if not exists service_request_seq start 1;

create or replace function public.generate_job_card_number()
returns trigger as $$
begin
  if new.job_card_number is null or new.job_card_number = '' then
    new.job_card_number := 'JC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('job_card_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_job_card_number on public.job_cards;
create trigger trg_job_card_number before insert on public.job_cards
  for each row execute function public.generate_job_card_number();

create or replace function public.generate_service_request_number()
returns trigger as $$
begin
  if new.request_number is null or new.request_number = '' then
    new.request_number := 'SR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('service_request_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_service_request_number on public.service_requests;
create trigger trg_service_request_number before insert on public.service_requests
  for each row execute function public.generate_service_request_number();

-- ============================================================
-- 11. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, name, email, substation_id, region_id, employee_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'assistant_engineer'),
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    nullif(new.raw_user_meta_data->>'substation_id', '')::uuid,
    nullif(new.raw_user_meta_data->>'region_id', '')::uuid,
    new.raw_user_meta_data->>'employee_id'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 12. HELPER FUNCTIONS FOR RLS (avoid recursive policy checks)
-- ============================================================
create or replace function public.current_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function public.current_substation()
returns uuid as $$
  select substation_id from public.profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function public.is_admin()
returns boolean as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'spectrum_admin', false);
$$ language sql stable security definer;

-- ============================================================
-- 13. ENABLE RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.regions enable row level security;
alter table public.substations enable row level security;
alter table public.equipment enable row level security;
alter table public.components enable row level security;
alter table public.inventory enable row level security;
alter table public.job_cards enable row level security;
alter table public.service_requests enable row level security;
alter table public.notifications enable row level security;

-- ---- PROFILES ----
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_admin_write" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- REGIONS ---- (everyone signed-in can read; only admin writes)
create policy "regions_select_all" on public.regions
  for select using (auth.uid() is not null);
create policy "regions_admin_write" on public.regions
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- SUBSTATIONS ---- (admin sees all; AE sees only their own)
create policy "substations_select" on public.substations
  for select using (public.is_admin() or id = public.current_substation());
create policy "substations_admin_write" on public.substations
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- EQUIPMENT ----
create policy "equipment_select" on public.equipment
  for select using (public.is_admin() or substation_id = public.current_substation());
create policy "equipment_admin_write" on public.equipment
  for all using (public.is_admin()) with check (public.is_admin());
create policy "equipment_ae_update_own" on public.equipment
  for update using (substation_id = public.current_substation())
  with check (substation_id = public.current_substation());

-- ---- COMPONENTS ----
create policy "components_select" on public.components
  for select using (
    public.is_admin()
    or exists (select 1 from public.equipment e where e.id = components.equipment_id and e.substation_id = public.current_substation())
  );
create policy "components_admin_write" on public.components
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- INVENTORY ---- (admin: all; AE: own substation, can insert/update)
create policy "inventory_select" on public.inventory
  for select using (public.is_admin() or substation_id = public.current_substation());
create policy "inventory_admin_write" on public.inventory
  for all using (public.is_admin()) with check (public.is_admin());
create policy "inventory_ae_insert_own" on public.inventory
  for insert with check (substation_id = public.current_substation());
create policy "inventory_ae_update_own" on public.inventory
  for update using (substation_id = public.current_substation())
  with check (substation_id = public.current_substation());

-- ---- JOB CARDS ---- (admin: all; AE: own substation, can raise + view)
create policy "job_cards_select" on public.job_cards
  for select using (public.is_admin() or substation_id = public.current_substation());
create policy "job_cards_admin_write" on public.job_cards
  for all using (public.is_admin()) with check (public.is_admin());
create policy "job_cards_ae_insert_own" on public.job_cards
  for insert with check (substation_id = public.current_substation());
create policy "job_cards_ae_update_own" on public.job_cards
  for update using (substation_id = public.current_substation())
  with check (substation_id = public.current_substation());

-- ---- SERVICE REQUESTS ----
create policy "service_requests_select" on public.service_requests
  for select using (public.is_admin() or substation_id = public.current_substation());
create policy "service_requests_admin_write" on public.service_requests
  for all using (public.is_admin()) with check (public.is_admin());
create policy "service_requests_ae_insert_own" on public.service_requests
  for insert with check (substation_id = public.current_substation());
create policy "service_requests_ae_update_own" on public.service_requests
  for update using (substation_id = public.current_substation())
  with check (substation_id = public.current_substation());

-- ---- NOTIFICATIONS ----
create policy "notifications_select" on public.notifications
  for select using (
    public.is_admin()
    or (target_role = 'assistant_engineer' and substation_id = public.current_substation())
  );
create policy "notifications_insert_any_authenticated" on public.notifications
  for insert with check (auth.uid() is not null);
create policy "notifications_update_own_visibility" on public.notifications
  for update using (
    public.is_admin()
    or (target_role = 'assistant_engineer' and substation_id = public.current_substation())
  );

-- ============================================================
-- 14. SEED DATA — Regions & Substations from the PRD
-- ============================================================
insert into public.regions (name) values
  ('Bangalore North'),
  ('Bangalore South'),
  ('Mysore'),
  ('Hubli'),
  ('Mangalore')
on conflict do nothing;

insert into public.substations (code, name, region_id, address, status)
select 'SS-BLR-014', 'Yelahanka 110kV SS', id, 'Yelahanka, Bengaluru', 'active' from public.regions where name = 'Bangalore North'
union all
select 'SS-BLR-021', 'Hebbal 66kV SS', id, 'Hebbal, Bengaluru', 'active' from public.regions where name = 'Bangalore North'
union all
select 'SS-BLR-009', 'Jayanagar 110kV SS', id, 'Jayanagar, Bengaluru', 'active' from public.regions where name = 'Bangalore South'
union all
select 'SS-BLR-017', 'Electronic City SS', id, 'Electronic City, Bengaluru', 'active' from public.regions where name = 'Bangalore South'
union all
select 'SS-MYS-003', 'Mysore Palace Road SS', id, 'Palace Road, Mysore', 'active' from public.regions where name = 'Mysore'
union all
select 'SS-HUB-006', 'Hubli Industrial SS', id, 'Industrial Area, Hubli', 'active' from public.regions where name = 'Hubli'
union all
select 'SS-MNG-002', 'Mangalore Port SS', id, 'Port Road, Mangalore', 'active' from public.regions where name = 'Mangalore'
on conflict (code) do nothing;
