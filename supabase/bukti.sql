-- Bukti pembayaran RM30: ibu bapa muat naik di halaman jemputan; admin melihat di /rsvp/admin/.
-- Jalankan SEKALI di SQL Editor SELEPAS surat.sql (guna fungsi _admin_ok). Selamat diulang.
create table if not exists bukti_bayaran (
  id bigint generated always as identity primary key,
  student text not null,
  phone text not null default '',
  fail text not null default 'bukti',
  mime text not null,
  data text not null,                  -- fail dalam base64
  saiz int not null default 0,
  created_at timestamptz not null default now()
);
alter table bukti_bayaran enable row level security;
revoke all on bukti_bayaran from anon, authenticated;   -- tiada akses terus; hanya melalui fungsi

-- Ibu bapa: hantar bukti (dengan had untuk elak penyalahgunaan).
create or replace function hantar_bukti(p_student text, p_phone text, p_fail text, p_mime text, p_data text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if char_length(coalesce(p_student, '')) < 3 then raise exception 'Nama pelajar tidak sah'; end if;
  if p_mime not in ('image/jpeg', 'image/png', 'application/pdf') then raise exception 'Jenis fail tidak dibenarkan'; end if;
  if length(coalesce(p_data, '')) < 100 or length(p_data) > 2800000 then raise exception 'Saiz fail tidak sah (maks ~2 MB)'; end if;
  if (select count(*) from bukti_bayaran where upper(student) = upper(left(p_student, 160))) >= 5 then
    raise exception 'Terlalu banyak bukti untuk nama ini'; end if;
  if (select count(*) from bukti_bayaran) >= 3000 then raise exception 'Had sistem dicapai'; end if;
  insert into bukti_bayaran (student, phone, fail, mime, data, saiz)
    values (upper(left(p_student, 160)), left(coalesce(p_phone, ''), 20), left(coalesce(p_fail, 'bukti'), 200), p_mime, p_data, (length(p_data) * 3) / 4)
    returning id into v_id;
  return v_id;
end $$;

-- Admin: senarai, lihat, padam.
create or replace function senarai_bukti(p_pass text)
returns table (id bigint, student text, phone text, fail text, mime text, saiz int, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not _admin_ok(p_pass) then raise exception 'Kata laluan salah' using errcode = '28000'; end if;
  return query select b.id, b.student, b.phone, b.fail, b.mime, b.saiz, b.created_at from bukti_bayaran b order by b.created_at desc;
end $$;

create or replace function ambil_bukti(p_pass text, p_id bigint)
returns table (fail text, mime text, data text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not _admin_ok(p_pass) then raise exception 'Kata laluan salah' using errcode = '28000'; end if;
  return query select b.fail, b.mime, b.data from bukti_bayaran b where b.id = p_id;
end $$;

create or replace function padam_bukti(p_pass text, p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _admin_ok(p_pass) then raise exception 'Kata laluan salah' using errcode = '28000'; end if;
  delete from bukti_bayaran where id = p_id;
end $$;

revoke all on function hantar_bukti(text, text, text, text, text), senarai_bukti(text), ambil_bukti(text, bigint), padam_bukti(text, bigint) from public;
grant execute on function hantar_bukti(text, text, text, text, text), senarai_bukti(text), ambil_bukti(text, bigint), padam_bukti(text, bigint) to anon;
