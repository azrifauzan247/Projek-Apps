// Dijana daripada supabase/setup.sql
export const SETUP_SQL = `-- AJK COMMAND CENTER 2026: skema pangkalan data (Supabase). Jalankan SEKALI di SQL Editor.
create table if not exists units (
  id bigint generated always as identity primary key,
  name text not null unique, description text not null default '', sort int not null default 0
);
create table if not exists members (
  id bigint generated always as identity primary key,
  name text not null, unit_id bigint references units(id) on delete set null,
  position text not null default 'Ahli', phone text not null default '', extra_resp text not null default '',
  active int not null default 1, sort int not null default 0, created_at text not null default ''
);
create table if not exists tasks (
  id bigint generated always as identity primary key,
  title text not null, description text not null default '',
  unit_id bigint references units(id) on delete set null, member_id bigint references members(id) on delete set null,
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Critical')),
  start_date text, deadline text,
  status text not null default 'pending' check (status in ('pending','ongoing','done')),
  progress int not null default 0 check (progress between 0 and 100),
  notes text not null default '', is_draft int not null default 0, completed_at text,
  created_at text not null default '', updated_at text not null default ''
);
create table if not exists task_log (
  id bigint generated always as identity primary key,
  task_id bigint not null references tasks(id) on delete cascade,
  at text not null, status text not null, progress int not null, by_user text not null default ''
);
create table if not exists attachments (
  id bigint generated always as identity primary key,
  task_id bigint not null references tasks(id) on delete cascade,
  name text not null, stored text not null, size int not null default 0,
  mime text not null default 'application/octet-stream', created_at text not null default ''
);
create table if not exists followups (
  id bigint generated always as identity primary key,
  member_id bigint not null references members(id) on delete cascade,
  task_id bigint references tasks(id) on delete set null,
  contacted_at text not null, method text not null default 'WhatsApp', summary text not null default '',
  responded int not null default 0, response text not null default '', action_required text not null default '',
  next_followup text, created_by text not null default '', created_at text not null default ''
);
create table if not exists checklist (
  id bigint generated always as identity primary key,
  category text not null, title text not null, done int not null default 0,
  done_at text, done_by text not null default '', sort int not null default 0
);
create table if not exists reports (
  id bigint generated always as identity primary key,
  type text not null, title text not null, payload jsonb not null,
  created_by text not null default '', created_at text not null default ''
);
create table if not exists settings (key text primary key, value text not null);

create index if not exists idx_tasks_unit on tasks(unit_id);
create index if not exists idx_tasks_member on tasks(member_id);
create index if not exists idx_fu_member on followups(member_id);

-- Akses terbuka untuk sesiapa yang ada pautan (tiada log masuk). Simpan pautan secara peribadi.
do $$
declare t text;
begin
  foreach t in array array['units','members','tasks','task_log','attachments','followups','checklist','reports','settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists open_access on %I', t);
    execute format('create policy open_access on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- Storan lampiran
insert into storage.buckets (id, name, public) values ('lampiran', 'lampiran', true) on conflict (id) do nothing;
drop policy if exists lampiran_open on storage.objects;
create policy lampiran_open on storage.objects for all using (bucket_id = 'lampiran') with check (bucket_id = 'lampiran');
`;
