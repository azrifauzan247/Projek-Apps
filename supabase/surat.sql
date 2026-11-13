-- Surat jemputan RSVP: muat naik oleh admin, muat turun oleh ibu bapa mengikut nama pelajar.
-- Jalankan SEKALI di Supabase SQL Editor (selamat diulang).
--
-- !!! SEBELUM RUN: tukar 'GANTI-KATA-LALUAN' di bawah kepada kata laluan admin pilihan anda
--     (panjang, sukar diteka). Kata laluan ini digunakan di halaman /rsvp/admin/.

create table if not exists rsvp_admin (id int primary key check (id = 1), pass_hash text not null);
insert into rsvp_admin (id, pass_hash)
  values (1, encode(sha256(convert_to('GANTI-KATA-LALUAN', 'utf8')), 'hex'))
  on conflict (id) do nothing;

create table if not exists surat (
  hash text primary key,                  -- sha256(garam + nama dinormalkan); nama tidak boleh dibaca umum
  nama text not null,
  fail text not null default 'surat.pdf',
  data text not null,                     -- PDF dalam base64
  saiz int not null default 0,
  dikemas_kini timestamptz not null default now()
);
alter table rsvp_admin enable row level security;
alter table surat enable row level security;
-- TIADA polisi pada dua jadual ini: pengunjung tidak boleh baca/tulis terus.
-- Akses hanya melalui fungsi di bawah.
revoke all on rsvp_admin from anon, authenticated;
revoke all on surat from anon, authenticated;

create or replace function _admin_ok(p_pass text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rsvp_admin
                 where id = 1 and pass_hash = encode(sha256(convert_to(coalesce(p_pass, ''), 'utf8')), 'hex'));
$$;

-- Ibu bapa: ambil surat dengan cincang nama. Pulang kosong jika tiada.
create or replace function ambil_surat(p_hash text)
returns table (nama text, fail text, data text)
language sql stable security definer set search_path = public as $$
  select s.nama, s.fail, s.data from surat s where s.hash = p_hash and length(p_hash) = 64;
$$;

-- Admin: simpan / ganti surat.
create or replace function simpan_surat(p_pass text, p_hash text, p_nama text, p_fail text, p_data text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _admin_ok(p_pass) then raise exception 'Kata laluan salah' using errcode = '28000'; end if;
  if length(p_hash) <> 64 then raise exception 'Cincang tidak sah'; end if;
  if length(p_data) > 2800000 then raise exception 'Fail terlalu besar (maks ~2 MB)'; end if;
  insert into surat (hash, nama, fail, data, saiz, dikemas_kini)
    values (p_hash, left(p_nama, 160), left(coalesce(p_fail, 'surat.pdf'), 200), p_data, (length(p_data) * 3) / 4, now())
  on conflict (hash) do update
    set nama = excluded.nama, fail = excluded.fail, data = excluded.data, saiz = excluded.saiz, dikemas_kini = now();
end $$;

-- Admin: senarai (tanpa kandungan fail).
create or replace function senarai_surat(p_pass text)
returns table (hash text, nama text, fail text, saiz int, dikemas_kini timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not _admin_ok(p_pass) then raise exception 'Kata laluan salah' using errcode = '28000'; end if;
  return query select s.hash, s.nama, s.fail, s.saiz, s.dikemas_kini from surat s order by s.nama;
end $$;

-- Admin: padam satu surat.
create or replace function padam_surat(p_pass text, p_hash text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _admin_ok(p_pass) then raise exception 'Kata laluan salah' using errcode = '28000'; end if;
  delete from surat where hash = p_hash;
end $$;

revoke all on function _admin_ok(text) from public, anon, authenticated;
revoke all on function ambil_surat(text), simpan_surat(text, text, text, text, text),
                       senarai_surat(text), padam_surat(text, text) from public;
grant execute on function ambil_surat(text), simpan_surat(text, text, text, text, text),
                          senarai_surat(text), padam_surat(text, text) to anon;
