-- ============================================================
-- Audit Trail — tracks all insert/update/delete on key tables
-- ============================================================

create table if not exists sox_audit_log (
  id           uuid primary key default uuid_generate_v4(),
  programme_id uuid references programmes on delete cascade,
  user_id      uuid references auth.users on delete set null,
  table_name   text not null,
  record_id    uuid,
  action       text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data     jsonb,
  new_data     jsonb,
  created_at   timestamptz default now()
);

alter table sox_audit_log enable row level security;
create policy "audit log access" on sox_audit_log
  for select using (is_my_programme(programme_id));

-- Trigger function
create or replace function log_audit_event()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  prog_id uuid;
  uid uuid;
begin
  -- Get programme_id from the row
  if TG_OP = 'DELETE' then
    prog_id := OLD.programme_id;
  else
    prog_id := NEW.programme_id;
  end if;

  -- Get current user
  uid := auth.uid();

  insert into sox_audit_log (programme_id, user_id, table_name, record_id, action, old_data, new_data)
  values (
    prog_id, uid, TG_TABLE_NAME,
    case when TG_OP='DELETE' then OLD.id else NEW.id end,
    TG_OP,
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT','UPDATE') then to_jsonb(NEW) else null end
  );
  return null;
end;
$$;

-- Attach to key tables
do $$ declare tbl text; begin
  for tbl in select unnest(array[
    'sox_rcm','sox_findings','sox_deficiency_log',
    'sox_remediation','sox_workpaper_shells','sox_mgmt_assertions'
  ]) loop
    execute format('drop trigger if exists audit_%s on %I', replace(tbl,'.','_'), tbl);
    execute format(
      'create trigger audit_%s after insert or update or delete on %I
       for each row execute procedure log_audit_event()',
      replace(tbl,'.','_'), tbl
    );
  end loop;
end $$;
