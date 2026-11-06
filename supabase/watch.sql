-- AJK COMMAND CENTER 2026: jadual "Pantauan Pengarah". Jalankan SEKALI di SQL Editor (selamat diulang).
create table if not exists watch_items (
  id bigint generated always as identity primary key,
  title text not null,
  notes text not null default '',
  task_id bigint references tasks(id) on delete set null,
  owner text not null default 'Berdua' check (owner in ('Pengarah', 'Timbalan Pengarah', 'Berdua')),
  due_date text,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Critical')),
  done int not null default 0,
  done_at text,
  done_by text not null default '',
  created_by text not null default '',
  created_at text not null default '',
  updated_at text not null default ''
);
alter table watch_items enable row level security;
drop policy if exists open_access on watch_items;
create policy open_access on watch_items for all using (true) with check (true);
