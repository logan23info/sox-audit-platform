-- ============================================================
-- 005 — Security hardening
-- Items: portal lockdown, role-aware RLS, unique constraints
-- Safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- ITEM 1 — Portal lockdown
-- Portal data is now served by the portal-data Edge Function
-- using the service role. The browser must NOT be able to read
-- sox_portal_access or enumerate tokens.
-- ------------------------------------------------------------

-- Usage telemetry so a leaked link is detectable
alter table sox_portal_access add column if not exists last_used_at timestamptz;
alter table sox_portal_access add column if not exists access_count int default 0;

-- Only programme members may manage tokens. No anon access at all.
drop policy if exists "programme access" on sox_portal_access;
create policy "portal token manage" on sox_portal_access
  for all
  using (is_my_programme(programme_id))
  with check (is_my_programme(programme_id));

-- ------------------------------------------------------------
-- ITEM 2 — Role-aware RLS
-- Previously is_my_programme() granted write to ANY member,
-- so a Reviewer could write via the API even though the UI
-- hid the buttons. Split read (all members) from write
-- (Lead + Auditor only).
-- ------------------------------------------------------------

create or replace function my_role(pid uuid)
returns text language sql stable security definer
set search_path = public as $$
  select case
    when exists (select 1 from programmes where id = pid and user_id = auth.uid())
      then 'Lead'
    else (select role from programme_members
          where programme_id = pid and user_id = auth.uid() limit 1)
  end;
$$;

create or replace function can_write(pid uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce(my_role(pid) in ('Lead','Auditor'), false);
$$;

create or replace function can_lead(pid uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce(my_role(pid) = 'Lead', false);
$$;

-- Rebuild content-table policies: read = any member, write = Lead/Auditor
do $$
declare tbl text;
begin
  for tbl in select unnest(array[
    'sox_scope','sox_rcm','sox_workpaper_shells','sox_sample_plan',
    'sox_ipe_validations','sox_testing_items','sox_je_population',
    'sox_je_segments','sox_je_samples','sox_findings','sox_deficiency_log',
    'sox_sod_matrix','sox_sod_mitigations','sox_remediation',
    'sox_vendor_reviews','sox_cuec_items','sox_external_reliance',
    'sox_multi_entity','sox_sector_variants','sox_signatures',
    'sox_mgmt_assertions','sox_standards_ack','sox_audit_reports',
    'sox_milestones','sox_programme_templates','sox_inspection_findings'
  ])
  loop
    -- clear every legacy policy name used during the build
    execute format('drop policy if exists "programme access" on %I', tbl);
    execute format('drop policy if exists "sod mitigation access" on %I', tbl);
    execute format('drop policy if exists "cuec access" on %I', tbl);
    execute format('drop policy if exists "testing item access" on %I', tbl);
    execute format('drop policy if exists "je sample access" on %I', tbl);
    execute format('drop policy if exists "member read" on %I', tbl);
    execute format('drop policy if exists "member write" on %I', tbl);
    execute format('drop policy if exists "member update" on %I', tbl);
    execute format('drop policy if exists "member delete" on %I', tbl);

    execute format('create policy "member read"   on %I for select using (is_my_programme(programme_id))', tbl);
    execute format('create policy "member write"  on %I for insert with check (can_write(programme_id))', tbl);
    execute format('create policy "member update" on %I for update using (can_write(programme_id)) with check (can_write(programme_id))', tbl);
    execute format('create policy "member delete" on %I for delete using (can_write(programme_id))', tbl);
  end loop;
end $$;

-- QC review is a Lead-only artefact (EQR independence)
drop policy if exists "member write"  on sox_qc_reviews;
drop policy if exists "member update" on sox_qc_reviews;
drop policy if exists "member delete" on sox_qc_reviews;
drop policy if exists "member read"   on sox_qc_reviews;
drop policy if exists "programme access" on sox_qc_reviews;
create policy "qc read"   on sox_qc_reviews for select using (is_my_programme(programme_id));
create policy "qc write"  on sox_qc_reviews for insert with check (can_lead(programme_id));
create policy "qc update" on sox_qc_reviews for update using (can_lead(programme_id)) with check (can_lead(programme_id));
create policy "qc delete" on sox_qc_reviews for delete using (can_lead(programme_id));

-- Audit log stays read-only to users; only triggers write it (security definer)
drop policy if exists "audit log access" on sox_audit_log;
create policy "audit log read" on sox_audit_log
  for select using (is_my_programme(programme_id));

-- Portal token creation restricted to Lead
drop policy if exists "portal token manage" on sox_portal_access;
create policy "portal read"   on sox_portal_access for select using (is_my_programme(programme_id));
create policy "portal write"  on sox_portal_access for insert with check (can_lead(programme_id));
create policy "portal update" on sox_portal_access for update using (can_lead(programme_id)) with check (can_lead(programme_id));
create policy "portal delete" on sox_portal_access for delete using (can_lead(programme_id));

-- Member management restricted to Lead
drop policy if exists "member access" on programme_members;
drop policy if exists "member read"   on programme_members;
create policy "pm read"   on programme_members
  for select using (
    user_id = auth.uid()
    or programme_id in (select programme_id from programme_members where user_id = auth.uid())
  );
create policy "pm write"  on programme_members for insert with check (can_lead(programme_id));
create policy "pm update" on programme_members for update using (can_lead(programme_id)) with check (can_lead(programme_id));
create policy "pm delete" on programme_members for delete using (can_lead(programme_id));

-- ------------------------------------------------------------
-- ITEM 5 — Missing unique constraints
-- Every table written via upsert needs one, otherwise upsert
-- silently INSERTs duplicates instead of updating.
-- Dedup runs first; keeps the most recent row.
-- ------------------------------------------------------------

-- sox_ipe_validations — one validation record per report per programme
delete from sox_ipe_validations a using sox_ipe_validations b
  where a.ctid < b.ctid
    and a.programme_id = b.programme_id
    and a.report_name  = b.report_name;
alter table sox_ipe_validations drop constraint if exists sox_ipe_prog_report_unique;
alter table sox_ipe_validations add constraint sox_ipe_prog_report_unique
  unique (programme_id, report_name);

-- sox_external_reliance — one row per programme (already unique, enforce)
delete from sox_external_reliance a using sox_external_reliance b
  where a.ctid < b.ctid and a.programme_id = b.programme_id;
alter table sox_external_reliance drop constraint if exists sox_reliance_prog_unique;
alter table sox_external_reliance add constraint sox_reliance_prog_unique
  unique (programme_id);

-- sox_je_population — one population per programme
delete from sox_je_population a using sox_je_population b
  where a.ctid < b.ctid and a.programme_id = b.programme_id;
alter table sox_je_population drop constraint if exists sox_je_pop_prog_unique;
alter table sox_je_population add constraint sox_je_pop_prog_unique
  unique (programme_id);

-- sox_multi_entity — one entity name per programme
delete from sox_multi_entity a using sox_multi_entity b
  where a.ctid < b.ctid
    and a.programme_id = b.programme_id
    and a.entity_name  = b.entity_name;
alter table sox_multi_entity drop constraint if exists sox_entity_prog_name_unique;
alter table sox_multi_entity add constraint sox_entity_prog_name_unique
  unique (programme_id, entity_name);

-- sox_milestones — one milestone title per programme
delete from sox_milestones a using sox_milestones b
  where a.ctid < b.ctid
    and a.programme_id = b.programme_id
    and a.title        = b.title;
alter table sox_milestones drop constraint if exists sox_milestone_prog_title_unique;
alter table sox_milestones add constraint sox_milestone_prog_title_unique
  unique (programme_id, title);

-- sox_inspection_findings — one finding per area per year per programme
delete from sox_inspection_findings a using sox_inspection_findings b
  where a.ctid < b.ctid
    and a.programme_id = b.programme_id
    and a.pcaob_year   = b.pcaob_year
    and a.finding_area = b.finding_area;
alter table sox_inspection_findings drop constraint if exists sox_insp_prog_year_area_unique;
alter table sox_inspection_findings add constraint sox_insp_prog_year_area_unique
  unique (programme_id, pcaob_year, finding_area);

-- sox_sector_variants — one control per sector per programme
delete from sox_sector_variants a using sox_sector_variants b
  where a.ctid < b.ctid
    and a.programme_id = b.programme_id
    and a.sector       = b.sector
    and coalesce(a.control_id,'') = coalesce(b.control_id,'');
alter table sox_sector_variants drop constraint if exists sox_sector_prog_ctrl_unique;
alter table sox_sector_variants add constraint sox_sector_prog_ctrl_unique
  unique (programme_id, sector, control_id);

-- ------------------------------------------------------------
-- ITEM 7 — Multi-entity wiring support
-- entity_id columns exist but had no FK. Add them so the UI can
-- safely reference entities and cascade correctly on delete.
-- ------------------------------------------------------------

alter table sox_scope      drop constraint if exists sox_scope_entity_fk;
alter table sox_scope      add constraint sox_scope_entity_fk
  foreign key (entity_id) references sox_multi_entity(id) on delete set null;

alter table sox_rcm        drop constraint if exists sox_rcm_entity_fk;
alter table sox_rcm        add constraint sox_rcm_entity_fk
  foreign key (entity_id) references sox_multi_entity(id) on delete set null;

alter table sox_sod_matrix drop constraint if exists sox_sod_entity_fk;
alter table sox_sod_matrix add constraint sox_sod_entity_fk
  foreign key (entity_id) references sox_multi_entity(id) on delete set null;

-- ------------------------------------------------------------
-- Verification
-- ------------------------------------------------------------
select 'Role functions' as check, count(*) as found
  from pg_proc where proname in ('my_role','can_write','can_lead')
union all
select 'Policies on sox_findings', count(*)
  from pg_policies where tablename = 'sox_findings'
union all
select 'Portal telemetry columns', count(*)
  from information_schema.columns
  where table_name = 'sox_portal_access'
    and column_name in ('last_used_at','access_count');
