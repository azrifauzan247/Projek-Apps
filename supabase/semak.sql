-- Semakan surat jemputan oleh guru (BACA SAHAJA). Jalankan SEKALI di SQL Editor SELEPAS surat.sql. Selamat diulang.
-- Guru guna kata laluan GURU yang berasingan; mereka tidak boleh memuat naik atau memadam.
-- Kata laluan guru TIDAK ditetapkan di sini. Tetapkan sendiri selepas ini (lihat arahan di bawah).

create table if not exists rsvp_semak (id int primary key check (id = 1), pass_hash text not null);
alter table rsvp_semak enable row level security;
revoke all on rsvp_semak from anon, authenticated;

create or replace function _semak_ok(p_pass text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_pass, '') <> '' and (
    exists (select 1 from rsvp_semak where id = 1 and pass_hash = encode(sha256(convert_to(p_pass, 'utf8')), 'hex'))
    or _admin_ok(p_pass));
$$;

create or replace function senarai_semak(p_pass text)
returns table (hash text, nama text, fail text, saiz int, dikemas_kini timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not _semak_ok(p_pass) then raise exception 'Kata laluan salah' using errcode = '28000'; end if;
  return query select s.hash, s.nama, s.fail, s.saiz, s.dikemas_kini from surat s order by s.nama;
end $$;

create or replace function ambil_semak(p_pass text, p_hash text)
returns table (nama text, fail text, data text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not _semak_ok(p_pass) then raise exception 'Kata laluan salah' using errcode = '28000'; end if;
  return query select s.nama, s.fail, s.data from surat s where s.hash = p_hash;
end $$;

revoke all on function _semak_ok(text) from public, anon, authenticated;
revoke all on function senarai_semak(text), ambil_semak(text, text) from public;
grant execute on function senarai_semak(text), ambil_semak(text, text) to anon;

-- TETAPKAN KATA LALUAN GURU (jalankan sebagai query berasingan, tukar KATA-LALUAN-GURU):
-- insert into rsvp_semak (id, pass_hash) values (1, encode(sha256(convert_to('KATA-LALUAN-GURU', 'utf8')), 'hex'))
-- on conflict (id) do update set pass_hash = excluded.pass_hash;
--
-- TUKAR KATA LALUAN ADMIN (disyorkan, kerana 1234 terlalu lemah):
-- update rsvp_admin set pass_hash = encode(sha256(convert_to('KATA-LALUAN-ADMIN-BARU', 'utf8')), 'hex') where id = 1;
