-- Admin: lihat RSVP (kehadiran). Jalankan SEKALI di SQL Editor (selepas rsvp.sql dan surat.sql). Selamat diulang.
-- Jika waris menghantar lebih daripada sekali bagi pelajar yang sama, hanya yang TERKINI dikira.
create or replace function senarai_rsvp(p_pass text)
returns table (id bigint, student text, unit text, guardian text, phone text, attending boolean, guests int, paid text, note text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not _admin_ok(p_pass) then raise exception 'Kata laluan salah' using errcode = '28000'; end if;
  return query
    select t.id, t.student, t.unit, t.guardian, t.phone, t.attending, t.guests, t.paid, t.note, t.created_at
    from (select distinct on (upper(r.student)) r.* from rsvp r order by upper(r.student), r.created_at desc) t
    order by t.student;
end $$;

-- Admin: padam satu RSVP (cth ujian atau pendua).
create or replace function padam_rsvp(p_pass text, p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _admin_ok(p_pass) then raise exception 'Kata laluan salah' using errcode = '28000'; end if;
  delete from rsvp where id = p_id;
end $$;

revoke all on function senarai_rsvp(text), padam_rsvp(text, bigint) from public;
grant execute on function senarai_rsvp(text), padam_rsvp(text, bigint) to anon;
