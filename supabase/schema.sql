-- ============================================================
-- KTPCL SIMMS — PRD-Aligned Database Schema v2
-- Run this ONCE in Supabase Dashboard → SQL Editor → New Query
-- Project: smpqfxpxwbnajcqtqexy
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. APP SETTINGS  (ageing threshold + hierarchy level labels)
-- ============================================================
create table if not exists public.app_settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('level_1_label',          'Zone'),
  ('level_2_label',          'Circle'),
  ('level_3_label',          'Division'),
  ('level_4_label',          'Station'),
  ('ageing_threshold_days',  '30')
on conflict (key) do nothing;

-- ============================================================
-- 2. HIERARCHY NODES  (self-referencing, replaces regions+substations)
--    level 1=Zone  2=Circle  3=Division  4=Station
-- ============================================================
create table if not exists public.hierarchy_nodes (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  code      text unique,
  level     integer not null check (level between 1 and 4),
  parent_id uuid references public.hierarchy_nodes(id) on delete restrict,
  address   text,
  status    text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create index idx_hierarchy_parent on public.hierarchy_nodes(parent_id);
create index idx_hierarchy_level  on public.hierarchy_nodes(level);

-- ============================================================
-- 3. VOLTAGE CLASSES  (per Station node)
-- ============================================================
create table if not exists public.voltage_classes (
  id         uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.hierarchy_nodes(id) on delete cascade,
  name       text not null,   -- e.g. "110kV", "66kV", "11kV"
  status     text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create index idx_voltage_station on public.voltage_classes(station_id);

-- ============================================================
-- 4. EQUIPMENT TYPES  (per Voltage Class)
-- ============================================================
create table if not exists public.equipment_types (
  id               uuid primary key default gen_random_uuid(),
  voltage_class_id uuid not null references public.voltage_classes(id) on delete cascade,
  name             text not null,   -- e.g. "Power Transformer", "Circuit Breaker"
  status           text not null default 'active' check (status in ('active','inactive')),
  created_at       timestamptz not null default now()
);

create index idx_equip_voltage on public.equipment_types(voltage_class_id);

-- ============================================================
-- 5. PROFILES  (extends Supabase auth.users)
--    Roles: spectrum_admin | account_executive | service_engineer
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('spectrum_admin','account_executive','service_engineer')),
  name        text not null,
  email       text,
  mobile      text,
  employee_id text,
  station_id  uuid references public.hierarchy_nodes(id) on delete set null,
  status      text not null default 'active' check (status in ('active','inactive')),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 6. JOB CARDS
--    Status workflow:
--    quotation_shared → order_received | offer_dropped | order_lost
--    order_received   → supply_service_given
--    supply_service_given → bills_submitted
--    bills_submitted  → payment_received
-- ============================================================
create table if not exists public.job_cards (
  id                    uuid primary key default gen_random_uuid(),
  job_card_number       text not null unique,
  station_id            uuid not null references public.hierarchy_nodes(id) on delete restrict,
  voltage_class_id      uuid references public.voltage_classes(id) on delete set null,
  equipment_type_id     uuid references public.equipment_types(id) on delete set null,
  component_description text,
  issue_description     text not null,
  current_status        text not null default 'quotation_shared'
    check (current_status in (
      'quotation_shared',
      'order_received',
      'offer_dropped',
      'order_lost',
      'supply_service_given',
      'bills_submitted',
      'payment_received'
    )),
  priority          text not null default 'medium' check (priority in ('low','medium','high','critical')),
  quotation_amount  numeric(14,2),
  order_amount      numeric(14,2),
  remarks           text,
  raised_by         uuid references public.profiles(id) on delete set null,
  assigned_ae       uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_jc_station on public.job_cards(station_id);
create index idx_jc_status  on public.job_cards(current_status);
create index idx_jc_created on public.job_cards(created_at);

-- ============================================================
-- 7. JOB CARD ENGINEERS  (multi-select service engineer assignment)
-- ============================================================
create table if not exists public.job_card_engineers (
  job_card_id uuid not null references public.job_cards(id) on delete cascade,
  engineer_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (job_card_id, engineer_id)
);

-- ============================================================
-- 8. STATUS HISTORY  (append-only audit trail)
-- ============================================================
create table if not exists public.status_history (
  id          uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards(id) on delete cascade,
  from_status text,
  to_status   text not null,
  changed_by  uuid references public.profiles(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index idx_sh_job_card on public.status_history(job_card_id);

-- Immutability: block any UPDATE or DELETE on status_history
create or replace function public.fn_status_history_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'status_history rows are immutable';
end;
$$;

drop trigger if exists trg_status_history_immutable on public.status_history;
create trigger trg_status_history_immutable
  before update or delete on public.status_history
  for each row execute function public.fn_status_history_immutable();

-- ============================================================
-- 9. MOM LOGS  (minutes-of-meeting with optional Storage attachment)
-- ============================================================
create table if not exists public.mom_logs (
  id              uuid primary key default gen_random_uuid(),
  job_card_id     uuid not null references public.job_cards(id) on delete cascade,
  content         text not null,
  attachment_path text,   -- Supabase Storage object path
  logged_by       uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index idx_mom_job_card on public.mom_logs(job_card_id);

-- ============================================================
-- 10. NOTIFICATIONS QUEUE  (async, decoupled from main transaction)
-- ============================================================
create table if not exists public.notifications_queue (
  id             uuid primary key default gen_random_uuid(),
  job_card_id    uuid references public.job_cards(id) on delete cascade,
  title          text not null,
  body           text,
  target_role    text check (target_role in ('spectrum_admin','account_executive','service_engineer')),
  target_user_id uuid references public.profiles(id) on delete cascade,
  read           boolean not null default false,
  created_at     timestamptz not null default now()
);

create index idx_notif_user on public.notifications_queue(target_user_id);
create index idx_notif_read on public.notifications_queue(read);

-- ============================================================
-- 11. AUTO-GENERATE JOB CARD NUMBERS
-- ============================================================
create sequence if not exists job_card_seq start 1;

create or replace function public.fn_generate_job_card_number()
returns trigger language plpgsql as $$
begin
  if new.job_card_number is null or new.job_card_number = '' then
    new.job_card_number :=
      'JC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('job_card_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_job_card_number on public.job_cards;
create trigger trg_job_card_number
  before insert on public.job_cards
  for each row execute function public.fn_generate_job_card_number();

-- ============================================================
-- 12. ATOMIC STATUS CHANGE
--     Inserts status_history + updates current_status in one txn
-- ============================================================
create or replace function public.change_job_card_status(
  p_job_card_id uuid,
  p_to_status   text,
  p_changed_by  uuid,
  p_note        text default null
)
returns void language plpgsql security definer as $$
declare
  v_from text;
begin
  select current_status into v_from
    from public.job_cards
   where id = p_job_card_id
   for update;

  if v_from is null then
    raise exception 'Job card not found: %', p_job_card_id;
  end if;

  insert into public.status_history (job_card_id, from_status, to_status, changed_by, note)
  values (p_job_card_id, v_from, p_to_status, p_changed_by, p_note);

  update public.job_cards
     set current_status = p_to_status,
         updated_at     = now()
   where id = p_job_card_id;
end;
$$;

-- ============================================================
-- 13. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.fn_handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, name, email, station_id, employee_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'account_executive'),
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    nullif(new.raw_user_meta_data->>'station_id', '')::uuid,
    new.raw_user_meta_data->>'employee_id'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_user();

-- ============================================================
-- 14. UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_jc_updated_at on public.job_cards;
create trigger trg_jc_updated_at
  before update on public.job_cards
  for each row execute function public.fn_set_updated_at();

-- ============================================================
-- 15. RLS HELPER FUNCTIONS
-- ============================================================
create or replace function public.current_user_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_station()
returns uuid language sql stable security definer as $$
  select station_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'spectrum_admin',
    false
  );
$$;

-- ============================================================
-- 16. ENABLE RLS
-- ============================================================
alter table public.app_settings        enable row level security;
alter table public.hierarchy_nodes     enable row level security;
alter table public.voltage_classes     enable row level security;
alter table public.equipment_types     enable row level security;
alter table public.profiles            enable row level security;
alter table public.job_cards           enable row level security;
alter table public.job_card_engineers  enable row level security;
alter table public.status_history      enable row level security;
alter table public.mom_logs            enable row level security;
alter table public.notifications_queue enable row level security;

-- app_settings: all signed-in users read; admin writes
create policy "app_settings_read"  on public.app_settings for select using (auth.uid() is not null);
create policy "app_settings_write" on public.app_settings for all    using (public.is_admin()) with check (public.is_admin());

-- hierarchy_nodes: all signed-in read; admin writes
create policy "hierarchy_read"  on public.hierarchy_nodes for select using (auth.uid() is not null);
create policy "hierarchy_write" on public.hierarchy_nodes for all    using (public.is_admin()) with check (public.is_admin());

-- voltage_classes: all signed-in read; admin writes
create policy "vc_read"  on public.voltage_classes for select using (auth.uid() is not null);
create policy "vc_write" on public.voltage_classes for all    using (public.is_admin()) with check (public.is_admin());

-- equipment_types: all signed-in read; admin writes
create policy "et_read"  on public.equipment_types for select using (auth.uid() is not null);
create policy "et_write" on public.equipment_types for all    using (public.is_admin()) with check (public.is_admin());

-- profiles
create policy "profiles_read"         on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles_admin_write"  on public.profiles for all    using (public.is_admin()) with check (public.is_admin());
create policy "profiles_self_update"  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- job_cards
create policy "jc_read"         on public.job_cards for select using (public.is_admin() or station_id = public.current_station());
create policy "jc_admin_write"  on public.job_cards for all    using (public.is_admin()) with check (public.is_admin());
create policy "jc_ae_insert"    on public.job_cards for insert with check (station_id = public.current_station());

-- job_card_engineers
create policy "jce_read"        on public.job_card_engineers for select using (public.is_admin() or engineer_id = auth.uid());
create policy "jce_admin_write" on public.job_card_engineers for all    using (public.is_admin()) with check (public.is_admin());

-- status_history
create policy "sh_read" on public.status_history for select using (
  public.is_admin() or
  exists (select 1 from public.job_cards jc where jc.id = status_history.job_card_id and jc.station_id = public.current_station())
);
create policy "sh_insert" on public.status_history for insert with check (auth.uid() is not null);

-- mom_logs
create policy "mom_read" on public.mom_logs for select using (
  public.is_admin() or
  exists (select 1 from public.job_cards jc where jc.id = mom_logs.job_card_id and jc.station_id = public.current_station())
);
create policy "mom_insert" on public.mom_logs for insert with check (
  public.is_admin() or
  exists (select 1 from public.job_cards jc where jc.id = mom_logs.job_card_id and jc.station_id = public.current_station())
);

-- notifications_queue
create policy "notif_read" on public.notifications_queue for select using (
  public.is_admin() or
  target_user_id = auth.uid() or
  (target_role = public.current_user_role() and target_user_id is null)
);
create policy "notif_insert"    on public.notifications_queue for insert with check (auth.uid() is not null);
create policy "notif_mark_read" on public.notifications_queue for update using (
  target_user_id = auth.uid() or public.is_admin()
) with check (
  target_user_id = auth.uid() or public.is_admin()
);
