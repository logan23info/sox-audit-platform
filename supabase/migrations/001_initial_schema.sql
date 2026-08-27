-- ============================================================
-- SOX Audit Platform — Initial Schema
-- Run in Supabase SQL Editor in one shot
-- ============================================================

-- ── EXTENSIONS ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  firm        text,
  title       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── PROGRAMMES (multi-tenant boundary) ───────────────────────
create table if not exists programmes (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users on delete set null,
  name          text not null,
  entity        text,
  fiscal_year   text,
  sector        text,
  status        text default 'Planning',
  description   text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── PROGRAMME MEMBERS ────────────────────────────────────────
create table if not exists programme_members (
  id            uuid primary key default uuid_generate_v4(),
  programme_id  uuid references programmes on delete cascade,
  user_id       uuid references auth.users on delete cascade,
  invited_by    uuid references auth.users on delete set null,
  role          text not null check (role in ('Lead','Auditor','Reviewer')),
  created_at    timestamptz default now(),
  unique(programme_id, user_id)
);

-- ── SOX SCOPE (in-scope systems) ─────────────────────────────
create table if not exists sox_scope (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  user_id         uuid references auth.users on delete set null,
  system_name     text not null,
  system_type     text,
  entity_id       uuid,
  fs_impact       int default 0,
  volume_score    int default 0,
  complexity      int default 0,
  prior_findings  int default 0,
  change_activity int default 0,
  total_score     int generated always as (fs_impact + volume_score + complexity + prior_findings + change_activity) stored,
  decision        text,
  rationale       text,
  domains         text[],
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── SOX RCM ──────────────────────────────────────────────────
create table if not exists sox_rcm (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  user_id         uuid references auth.users on delete set null,
  control_id      text not null,
  domain          text not null,
  control_title   text not null,
  objective       text,
  risk            text,
  risk_rating     text,
  control_type    text,
  frequency       text,
  assertion       text[],
  owner_role      text,
  evidence_req    text,
  sector_tags     text[],
  entity_id       uuid,
  status          text default 'Not Tested',
  is_key_control  boolean default true,
  pcaob_ref       text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── WORKPAPER SHELLS ─────────────────────────────────────────
create table if not exists sox_workpaper_shells (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  rcm_id          uuid references sox_rcm on delete set null,
  user_id         uuid references auth.users on delete set null,
  domain          text not null,
  control_id      text,
  control_title   text,
  population_src  text,
  population_cnt  int,
  ipe_validated   boolean default false,
  preparer        text,
  reviewer        text,
  prepared_date   date,
  review_date     date,
  conclusion      text,
  status          text default 'Not Started',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── SAMPLE PLAN ──────────────────────────────────────────────
create table if not exists sox_sample_plan (
  id              uuid primary key default uuid_generate_v4(),
  workpaper_id    uuid references sox_workpaper_shells on delete cascade,
  programme_id    uuid references programmes on delete cascade,
  frequency       text,
  risk_rating     text,
  is_new_control  boolean default false,
  prior_exception boolean default false,
  is_itdm         boolean default false,
  base_sample     int,
  uplift_pct      int default 0,
  final_sample    int,
  methodology     text,
  justification   text,
  created_at      timestamptz default now()
);

-- ── IPE VALIDATIONS ──────────────────────────────────────────
create table if not exists sox_ipe_validations (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  workpaper_id    uuid references sox_workpaper_shells on delete set null,
  user_id         uuid references auth.users on delete set null,
  report_name     text not null,
  system_source   text,
  extract_params  text,
  total_records   int,
  validation_method text,
  reconciled_to   text,
  difference      text,
  validated       boolean default false,
  validated_by    text,
  validated_date  date,
  notes           text,
  created_at      timestamptz default now()
);

-- ── TESTING ITEMS ────────────────────────────────────────────
create table if not exists sox_testing_items (
  id              uuid primary key default uuid_generate_v4(),
  workpaper_id    uuid references sox_workpaper_shells on delete cascade,
  programme_id    uuid references programmes on delete cascade,
  sample_num      int,
  description     text,
  sample_date     date,
  evidence_desc   text,
  attribute_1     text,
  attribute_1_result text,
  attribute_2     text,
  attribute_2_result text,
  attribute_3     text,
  attribute_3_result text,
  exception       boolean default false,
  exception_desc  text,
  created_at      timestamptz default now()
);

-- ── JE POPULATION ────────────────────────────────────────────
create table if not exists sox_je_population (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade unique,
  user_id         uuid references auth.users on delete set null,
  gl_system       text,
  period          text,
  extract_params  text,
  total_je_count  int,
  total_je_amount numeric,
  automated_incl  boolean default true,
  reconciled_to   text,
  difference      numeric,
  ipe_validated   boolean default false,
  notes           text,
  created_at      timestamptz default now()
);

-- ── JE SEGMENTS ──────────────────────────────────────────────
create table if not exists sox_je_segments (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  segment_type    text not null,
  description     text,
  risk_level      text,
  population_count int,
  sample_size     int,
  selection_method text,
  created_at      timestamptz default now()
);

-- ── JE SAMPLES ───────────────────────────────────────────────
create table if not exists sox_je_samples (
  id              uuid primary key default uuid_generate_v4(),
  segment_id      uuid references sox_je_segments on delete cascade,
  programme_id    uuid references programmes on delete cascade,
  je_ref          text,
  je_date         date,
  preparer        text,
  approver        text,
  amount          numeric,
  account         text,
  description     text,
  support_obtained boolean default false,
  sod_ok          boolean default true,
  exception       boolean default false,
  exception_desc  text,
  fraud_indicator boolean default false,
  created_at      timestamptz default now()
);

-- ── FINDINGS ─────────────────────────────────────────────────
create table if not exists sox_findings (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  workpaper_id    uuid references sox_workpaper_shells on delete set null,
  user_id         uuid references auth.users on delete set null,
  control_id      text,
  domain          text,
  title           text not null,
  classification  text,
  severity        text,
  condition       text,
  criteria        text,
  cause           text,
  consequence     text,
  evidence_excerpt text,
  root_cause      text,
  ai_output       jsonb,
  is_draft        boolean default true,
  signed_off_by   text,
  signed_off_at   timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── DEFICIENCY LOG ───────────────────────────────────────────
create table if not exists sox_deficiency_log (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  finding_id      uuid references sox_findings on delete set null,
  user_id         uuid references auth.users on delete set null,
  ref             text not null,
  classification  text not null,
  likelihood      text,
  magnitude       text,
  design_or_op    text,
  audit_comm_req  boolean default false,
  public_disc_req boolean default false,
  comm_date       date,
  status          text default 'Open',
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── SOD MATRIX ───────────────────────────────────────────────
create table if not exists sox_sod_matrix (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  role_a          text not null,
  role_b          text not null,
  conflict_type   text,
  risk_level      text,
  entity_id       uuid,
  users_affected  text[],
  status          text default 'Open',
  created_at      timestamptz default now()
);

create table if not exists sox_sod_mitigations (
  id              uuid primary key default uuid_generate_v4(),
  conflict_id     uuid references sox_sod_matrix on delete cascade,
  programme_id    uuid references programmes on delete cascade,
  control_desc    text,
  owner           text,
  frequency       text,
  evidence_req    text,
  tested          boolean default false,
  effective       boolean,
  created_at      timestamptz default now()
);

-- ── REMEDIATION ──────────────────────────────────────────────
create table if not exists sox_remediation (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  deficiency_id   uuid references sox_deficiency_log on delete set null,
  user_id         uuid references auth.users on delete set null,
  action          text not null,
  root_cause_addr text,
  owner_role      text,
  target_date     date,
  completed_date  date,
  status          text default 'Not Started',
  retest_required boolean default true,
  retest_date     date,
  retest_result   text,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── VENDOR / SOC1 REVIEWS ────────────────────────────────────
create table if not exists sox_vendor_reviews (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  user_id         uuid references auth.users on delete set null,
  vendor_name     text not null,
  service_desc    text,
  report_type     text,
  report_period_start date,
  report_period_end   date,
  covers_fy       boolean,
  opinion         text,
  exceptions_noted boolean default false,
  exception_desc  text,
  bridge_letter   boolean default false,
  reliance_decision text,
  reliance_notes  text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── CUEC ITEMS ───────────────────────────────────────────────
create table if not exists sox_cuec_items (
  id              uuid primary key default uuid_generate_v4(),
  vendor_review_id uuid references sox_vendor_reviews on delete cascade,
  programme_id    uuid references programmes on delete cascade,
  cuec_ref        text,
  description     text not null,
  our_control     text,
  tested          boolean default false,
  evidence_desc   text,
  result          text,
  exception       boolean default false,
  created_at      timestamptz default now()
);

-- ── EXTERNAL AUDITOR RELIANCE ────────────────────────────────
create table if not exists sox_external_reliance (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade unique,
  la_pct          int default 0,
  cm_pct          int default 0,
  co_pct          int default 0,
  pd_pct          int default 0,
  je_pct          int default 0,
  reperform_pct   int default 0,
  notes           text,
  updated_at      timestamptz default now()
);

-- ── MULTI-ENTITY ─────────────────────────────────────────────
create table if not exists sox_multi_entity (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  entity_name     text not null,
  entity_type     text,
  country         text,
  materiality     numeric,
  in_scope        boolean default true,
  notes           text,
  created_at      timestamptz default now()
);

-- ── SECTOR VARIANTS ──────────────────────────────────────────
create table if not exists sox_sector_variants (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  sector          text not null,
  domain          text,
  control_id      text,
  additional_req  text,
  standard_basis  text,
  active          boolean default true,
  created_at      timestamptz default now()
);

-- ── SIGNATURES ───────────────────────────────────────────────
create table if not exists sox_signatures (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  user_id         uuid references auth.users on delete set null,
  document_type   text not null,
  document_id     uuid,
  signatory_name  text not null,
  signatory_title text,
  signature_data  text,
  signed_at       timestamptz default now(),
  ip_address      text
);

-- ── MANAGEMENT ASSERTIONS (302/404) ──────────────────────────
create table if not exists sox_mgmt_assertions (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  user_id         uuid references auth.users on delete set null,
  assertion_type  text not null,
  fiscal_year     text,
  has_mw          boolean default false,
  mw_desc         text,
  icfr_effective  boolean,
  ceo_name        text,
  cfo_name        text,
  assertion_date  date,
  disclosure_text text,
  status          text default 'Draft',
  created_at      timestamptz default now()
);

-- ── STANDARDS ACKNOWLEDGMENT ─────────────────────────────────
create table if not exists sox_standards_ack (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  standard_id     text not null,
  acknowledged    boolean default false,
  ack_date        date,
  notes           text,
  unique(programme_id, standard_id)
);

-- ── AUDIT REPORTS ────────────────────────────────────────────
create table if not exists sox_audit_reports (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid references programmes on delete cascade,
  user_id         uuid references auth.users on delete set null,
  title           text not null,
  report_type     text,
  period          text,
  executive_summary text,
  scope_section   text,
  findings_section text,
  conclusion      text,
  status          text default 'Draft',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles            enable row level security;
alter table programmes          enable row level security;
alter table programme_members   enable row level security;
alter table sox_scope           enable row level security;
alter table sox_rcm             enable row level security;
alter table sox_workpaper_shells enable row level security;
alter table sox_sample_plan     enable row level security;
alter table sox_ipe_validations enable row level security;
alter table sox_testing_items   enable row level security;
alter table sox_je_population   enable row level security;
alter table sox_je_segments     enable row level security;
alter table sox_je_samples      enable row level security;
alter table sox_findings        enable row level security;
alter table sox_deficiency_log  enable row level security;
alter table sox_sod_matrix      enable row level security;
alter table sox_sod_mitigations enable row level security;
alter table sox_remediation     enable row level security;
alter table sox_vendor_reviews  enable row level security;
alter table sox_cuec_items      enable row level security;
alter table sox_external_reliance enable row level security;
alter table sox_multi_entity    enable row level security;
alter table sox_sector_variants enable row level security;
alter table sox_signatures      enable row level security;
alter table sox_mgmt_assertions enable row level security;
alter table sox_standards_ack   enable row level security;
alter table sox_audit_reports   enable row level security;

-- ── RLS HELPERS (non-recursive) ──────────────────────────────
-- User's own programmes
create or replace view my_programme_ids
  with (security_invoker = true) as
  select id from programmes where user_id = auth.uid()
  union
  select programme_id from programme_members where user_id = auth.uid();

-- ── PROFILES ─────────────────────────────────────────────────
create policy "own profile" on profiles
  for all using (id = auth.uid());

-- ── PROGRAMMES ───────────────────────────────────────────────
create policy "own or member" on programmes
  for all using (
    user_id = auth.uid()
    or id in (select programme_id from programme_members where user_id = auth.uid())
  );

-- ── PROGRAMME MEMBERS ────────────────────────────────────────
create policy "member access" on programme_members
  for all using (user_id = auth.uid() or invited_by = auth.uid());

-- ── CONTENT TABLES (all follow same pattern) ─────────────────
-- Helper macro: programme_id in my_programme_ids
create or replace function is_my_programme(pid uuid)
returns boolean language sql security definer as $$
  select exists(
    select 1 from programmes where id = pid and user_id = auth.uid()
    union
    select 1 from programme_members where programme_id = pid and user_id = auth.uid()
  );
$$;

do $$ declare tbl text; begin
  for tbl in select unnest(array[
    'sox_scope','sox_rcm','sox_workpaper_shells','sox_sample_plan',
    'sox_ipe_validations','sox_testing_items','sox_je_population',
    'sox_je_segments','sox_je_samples','sox_findings','sox_deficiency_log',
    'sox_sod_matrix','sox_sod_mitigations','sox_remediation',
    'sox_vendor_reviews','sox_cuec_items','sox_external_reliance',
    'sox_multi_entity','sox_sector_variants','sox_signatures',
    'sox_mgmt_assertions','sox_standards_ack','sox_audit_reports'
  ]) loop
    execute format('create policy "programme access" on %I for all using (is_my_programme(programme_id))', tbl);
  end loop;
end $$;

-- ── SoD MITIGATIONS (via conflict_id join) ───────────────────
drop policy if exists "programme access" on sox_sod_mitigations;
create policy "sod mitigation access" on sox_sod_mitigations
  for all using (
    is_my_programme(programme_id)
  );

-- ── CUEC ITEMS (via vendor_review_id join) ───────────────────
drop policy if exists "programme access" on sox_cuec_items;
create policy "cuec access" on sox_cuec_items
  for all using (is_my_programme(programme_id));

-- ── TESTING ITEMS (via workpaper_id join) ────────────────────
drop policy if exists "programme access" on sox_testing_items;
create policy "testing item access" on sox_testing_items
  for all using (is_my_programme(programme_id));

-- ── JE SAMPLES (via segment_id join) ─────────────────────────
drop policy if exists "programme access" on sox_je_samples;
create policy "je sample access" on sox_je_samples
  for all using (is_my_programme(programme_id));

-- ── UPDATED_AT TRIGGERS ───────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ declare tbl text; begin
  for tbl in select unnest(array[
    'profiles','programmes','sox_scope','sox_rcm','sox_workpaper_shells',
    'sox_findings','sox_deficiency_log','sox_remediation',
    'sox_vendor_reviews','sox_audit_reports','sox_mgmt_assertions'
  ]) loop
    execute format(
      'drop trigger if exists set_%s_updated_at on %I;
       create trigger set_%s_updated_at before update on %I
       for each row execute procedure set_updated_at();',
      replace(tbl,'.','_'), tbl, replace(tbl,'.','_'), tbl
    );
  end loop;
end $$;
