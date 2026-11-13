-- RSVP Hari Anugerah Ashabul Yamin 2026. Jalankan SEKALI di Supabase SQL Editor (selamat diulang).
create table if not exists rsvp (
  id bigint generated always as identity primary key,
  student text not null check (char_length(student) between 3 and 120),
  unit text not null default '' check (char_length(unit) <= 80),
  guardian text not null check (char_length(guardian) between 2 and 120),
  phone text not null check (char_length(phone) between 7 and 20),
  attending boolean not null,
  guests int not null default 0 check (guests between 0 and 12),
  paid text not null default 'belum' check (paid in ('sudah', 'belum')),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
alter table rsvp enable row level security;
-- Pengunjung laman HANYA boleh menambah. Tiada polisi baca/ubah/padam:
-- data hanya boleh dilihat oleh anda di SQL Editor.
drop policy if exists rsvp_insert on rsvp;
create policy rsvp_insert on rsvp for insert to anon with check (true);
grant insert on rsvp to anon;

-- Ringkasan (jalankan bila perlu). Jika ibu bapa hantar dua kali, hanya yang TERKINI dikira.
-- select count(*) filter (where attending) as hadir, count(*) filter (where not attending) as tidak_hadir,
--        coalesce(sum(guests) filter (where attending),0) as jumlah_hadirin,
--        count(*) filter (where paid='sudah') as sudah_bayar
-- from (select distinct on (upper(student)) * from rsvp order by upper(student), created_at desc) t;
