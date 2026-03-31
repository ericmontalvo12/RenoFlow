-- ============================================================
-- Phase 2: Updated status system
-- ============================================================
-- New stage statuses:
--   not_started | ready | in_progress | waiting_material |
--   waiting_contractor | complete | blocked
--
-- New unit statuses:
--   not_started | in_progress | waiting_material |
--   waiting_contractor | blocked | complete | on_hold

-- ---- Stage statuses ----------------------------------------

-- 1. Drop old constraint
alter table public.unit_stages
  drop constraint if exists unit_stages_status_check;

-- 2. Migrate old values
update public.unit_stages set status = 'complete'  where status = 'done';
-- not_started / in_progress / blocked carry over unchanged

-- 3. Add new constraint
alter table public.unit_stages
  add constraint unit_stages_status_check
  check (status in (
    'not_started','ready','in_progress',
    'waiting_material','waiting_contractor',
    'complete','blocked'
  ));

-- ---- Unit statuses -----------------------------------------

alter table public.units
  drop constraint if exists units_status_check;

-- Migrate old values
update public.units set status = 'complete'     where status = 'ready_to_rent';
-- not_started / in_progress / blocked / on_hold carry over unchanged

alter table public.units
  add constraint units_status_check
  check (status in (
    'not_started','in_progress','waiting_material',
    'waiting_contractor','blocked','complete','on_hold'
  ));

-- ---- Delivery status default --------------------------------
-- Ensure delivery_status has sensible default for new stages
alter table public.unit_stages
  alter column delivery_status set default 'not_needed';

-- ---- Add index for new status values -----------------------
drop index if exists idx_unit_stages_status;
create index idx_unit_stages_status on public.unit_stages(status);

drop index if exists idx_units_status;
create index idx_units_status on public.units(status);
