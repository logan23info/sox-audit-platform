-- ============================================================
-- 005 — Security hardening (defensive)
-- Portal lockdown, role-aware RLS, unique constraints, entity FKs.
-- Safe to re-run. Every block checks the table exists first, so it
-- works whether or not the audit-trail migration has been applied.
-- ============================================================

-- ── Role helper functions (policies below depend on these) ────
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

-- ── Content tables: read = any member, write = Lead/Auditor ───
do $$
declare tbl text; legacy text;
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
  ]) loop
    if to_regclass('public.' || tbl) is null then
      raise notice 'Skipping % — not present', tbl; continue;
    end if;
    execute format('alter table %I enable row level security', tbl);
    foreach legacy in array array[
      'programme access','sod mitigation access','cuec access',
      'testing item access','je sample access',
      'member read','member write','member update','member delete'
    ] loop
      execute format('drop policy if exists %I on %I', legacy, tbl);
    end loop;
    execute format('create policy "member read"   on %I for select using (is_my_programme(programme_id))', tbl);
    execute format('create policy "member write"  on %I for insert with check (can_write(programme_id))', tbl);
    execute format('create policy "member update" on %I for update using (can_write(programme_id)) with check (can_write(programme_id))', tbl);
    execute format('create policy "member delete" on %I for delete using (can_write(programme_id))', tbl);
  end loop;
end $$;

-- ── QC review is Lead-only (EQR independence, QC 1000) ────────
do $$
begin
  if to_regclass('public.sox_qc_reviews') is null then
    raise notice 'Skipping sox_qc_reviews — not present'; return;
  end if;
  execute 'alter table sox_qc_reviews enable row level security';
  execute 'drop policy if exists "programme access" on sox_qc_reviews';
  execute 'drop policy if exists "member read"   on sox_qc_reviews';
  execute 'drop policy if exists "member write"  on sox_qc_reviews';
  execute 'drop policy if exists "member update" on sox_qc_reviews';
  execute 'drop policy if exists "member delete" on sox_qc_reviews';
  execute 'drop policy if exists "qc read"   on sox_qc_reviews';
  execute 'drop policy if exists "qc write"  on sox_qc_reviews';
  execute 'drop policy if exists "qc update" on sox_qc_reviews';
  execute 'drop policy if exists "qc delete" on sox_qc_reviews';
  execute 'create policy "qc read"   on sox_qc_reviews for select using (is_my_programme(programme_id))';
  execute 'create policy "qc write"  on sox_qc_reviews for insert with check (can_lead(programme_id))';
  execute 'create policy "qc update" on sox_qc_reviews for update using (can_lead(programme_id)) with check (can_lead(programme_id))';
  execute 'create policy "qc delete" on sox_qc_reviews for delete using (can_lead(programme_id))';
end $$;

-- ── Audit log: read-only to users; only the trigger writes ────
do $$
begin
  if to_regclass('public.sox_audit_log') is null then
    raise notice 'Skipping sox_audit_log — run the audit-trail migration to enable this feature'; return;
  end if;
  execute 'alter table sox_audit_log enable row level security';
  execute 'drop policy if exists "audit log access" on sox_audit_log';
  execute 'drop policy if exists "audit log read"   on sox_audit_log';
  execute 'create policy "audit log read" on sox_audit_log for select using (is_my_programme(programme_id))';
end $$;

-- ── Portal lockdown: no anon path, token creation = Lead ──────
do $$
begin
  if to_regclass('public.sox_portal_access') is null then
    raise notice 'Skipping sox_portal_access — not present'; return;
  end if;
  execute 'alter table sox_portal_access add column if not exists last_used_at timestamptz';
  execute 'alter table sox_portal_access add column if not exists access_count int default 0';
  execute 'alter table sox_portal_access enable row level security';
  execute 'drop policy if exists "programme access"    on sox_portal_access';
  execute 'drop policy if exists "portal token manage" on sox_portal_access';
  execute 'drop policy if exists "portal read"   on sox_portal_access';
  execute 'drop policy if exists "portal write"  on sox_portal_access';
  execute 'drop policy if exists "portal update" on sox_portal_access';
  execute 'drop policy if exists "portal delete" on sox_portal_access';
  execute 'create policy "portal read"   on sox_portal_access for select using (is_my_programme(programme_id))';
  execute 'create policy "portal write"  on sox_portal_access for insert with check (can_lead(programme_id))';
  execute 'create policy "portal update" on sox_portal_access for update using (can_lead(programme_id)) with check (can_lead(programme_id))';
  execute 'create policy "portal delete" on sox_portal_access for delete using (can_lead(programme_id))';
end $$;

-- ── Member management restricted to Lead ─────────────────────
drop policy if exists "member access" on programme_members;
drop policy if exists "member read"   on programme_members;
drop policy if exists "member insert" on programme_members;
drop policy if exists "member delete" on programme_members;
drop policy if exists "pm read"   on programme_members;
drop policy if exists "pm write"  on programme_members;
drop policy if exists "pm update" on programme_members;
drop policy if exists "pm delete" on programme_members;

create policy "pm read" on programme_members
  for select using (
    user_id = auth.uid()
    or programme_id in (select programme_id from programme_members where user_id = auth.uid())
  );
create policy "pm write"  on programme_members for insert with check (can_lead(programme_id));
create policy "pm update" on programme_members for update using (can_lead(programme_id)) with check (can_lead(programme_id));
create policy "pm delete" on programme_members for delete using (can_lead(programme_id));

-- ── Missing unique constraints (upsert correctness) ───────────
do $$
begin
  if to_regclass('public.sox_ipe_validations') is not null then
    delete from sox_ipe_validations a using sox_ipe_validations b
      where a.ctid < b.ctid and a.programme_id = b.programme_id and a.report_name = b.report_name;
    alter table sox_ipe_validations drop constraint if exists sox_ipe_prog_report_unique;
    alter table sox_ipe_validations add constraint sox_ipe_prog_report_unique unique (programme_id, report_name);
  end if;

  if to_regclass('public.sox_external_reliance') is not null then
    delete from sox_external_reliance a using sox_external_reliance b
      where a.ctid < b.ctid and a.programme_id = b.programme_id;
    alter table sox_external_reliance drop constraint if exists sox_reliance_prog_unique;
    alter table sox_external_reliance add constraint sox_reliance_prog_unique unique (programme_id);
  end if;

  if to_regclass('public.sox_je_population') is not null then
    delete from sox_je_population a using sox_je_population b
      where a.ctid < b.ctid and a.programme_id = b.programme_id;
    alter table sox_je_population drop constraint if exists sox_je_pop_prog_unique;
    alter table sox_je_population add constraint sox_je_pop_prog_unique unique (programme_id);
  end if;

  if to_regclass('public.sox_multi_entity') is not null then
    delete from sox_multi_entity a using sox_multi_entity b
      where a.ctid < b.ctid and a.programme_id = b.programme_id and a.entity_name = b.entity_name;
    alter table sox_multi_entity drop constraint if exists sox_entity_prog_name_unique;
    alter table sox_multi_entity add constraint sox_entity_prog_name_unique unique (programme_id, entity_name);
  end if;

  if to_regclass('public.sox_milestones') is not null then
    delete from sox_milestones a using sox_milestones b
      where a.ctid < b.ctid and a.programme_id = b.programme_id and a.title = b.title;
    alter table sox_milestones drop constraint if exists sox_milestone_prog_title_unique;
    alter table sox_milestones add constraint sox_milestone_prog_title_unique unique (programme_id, title);
  end if;

  if to_regclass('public.sox_inspection_findings') is not null then
    delete from sox_inspection_findings a using sox_inspection_findings b
      where a.ctid < b.ctid and a.programme_id = b.programme_id
        and a.pcaob_year = b.pcaob_year and a.finding_area = b.finding_area;
    alter table sox_inspection_findings drop constraint if exists sox_insp_prog_year_area_unique;
    alter table sox_inspection_findings add constraint sox_insp_prog_year_area_unique unique (programme_id, pcaob_year, finding_area);
  end if;

  if to_regclass('public.sox_sector_variants') is not null then
    delete from sox_sector_variants a using sox_sector_variants b
      where a.ctid < b.ctid and a.programme_id = b.programme_id
        and a.sector = b.sector and coalesce(a.control_id,'') = coalesce(b.control_id,'');
    alter table sox_sector_variants drop constraint if exists sox_sector_prog_ctrl_unique;
    alter table sox_sector_variants add constraint sox_sector_prog_ctrl_unique unique (programme_id, sector, control_id);
  end if;
end $$;

-- ── Multi-entity FK wiring ───────────────────────────────────
do $$
begin
  if to_regclass('public.sox_multi_entity') is null then
    raise notice 'Skipping entity FKs — sox_multi_entity not present'; return;
  end if;
  if to_regclass('public.sox_scope') is not null then
    alter table sox_scope drop constraint if exists sox_scope_entity_fk;
    alter table sox_scope add constraint sox_scope_entity_fk
      foreign key (entity_id) references sox_multi_entity(id) on delete set null;
  end if;
  if to_regclass('public.sox_rcm') is not null then
    alter table sox_rcm drop constraint if exists sox_rcm_entity_fk;
    alter table sox_rcm add constraint sox_rcm_entity_fk
      foreign key (entity_id) references sox_multi_entity(id) on delete set null;
  end if;
  if to_regclass('public.sox_sod_matrix') is not null then
    alter table sox_sod_matrix drop constraint if exists sox_sod_entity_fk;
    alter table sox_sod_matrix add constraint sox_sod_entity_fk
      foreign key (entity_id) references sox_multi_entity(id) on delete set null;
  end if;
end $$;

-- ── Verification ─────────────────────────────────────────────
select 'Role functions (expect 3)' as check, count(*)::text as result
  from pg_proc where proname in ('my_role','can_write','can_lead')
union all
select 'Policies on sox_findings (expect 4)', count(*)::text
  from pg_policies where tablename = 'sox_findings'
union all
select 'Portal telemetry cols (expect 2)', count(*)::text
  from information_schema.columns
  where table_name = 'sox_portal_access' and column_name in ('last_used_at','access_count')
union all
select 'Audit log table', case when to_regclass('public.sox_audit_log') is null then 'absent — run 004 to enable' else 'present' end;
