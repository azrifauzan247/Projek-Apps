-- Carian mudah: taip SATU perkataan (cth: falisha) dan surat yang ada nama itu keluar.
-- Tidak perlu "bina carian" dan tidak perlu muat naik semula. Selamat dijalankan berulang kali.
-- Jalankan SEKALI di SQL Editor (selepas surat.sql).

create or replace function cari_surat3(p_q text)
returns table (hash text, nama text, kod text)
language plpgsql stable security definer set search_path = public as $$
declare w text[]; q text;
begin
  q := upper(regexp_replace(coalesce(p_q, ''), '[^A-Za-z0-9 ]+', ' ', 'g'));
  select coalesce(array_agg(x), '{}') into w from unnest(regexp_split_to_array(trim(q), '\s+')) x where length(x) >= 3;
  if array_length(w, 1) is null or array_length(w, 1) > 6 then return; end if;
  return query
    select s.hash, d.nama, d.kod
    from surat s
    cross join lateral (
      select trim(regexp_replace(regexp_replace(upper(coalesce(nullif(s.fail,''), s.nama)), '\.PDF\s*$', ''), '^\s*SURAT[^-]*-\s*', '')) as raw
    ) r
    cross join lateral (
      select trim(regexp_replace(r.raw, '\s*\([^)]*\)\s*$', '')) as nama,
             coalesce(substring(r.raw from '\(([^)]*)\)\s*$'), '') as kod
    ) d
    where not exists (
      select 1 from unnest(w) t
      where upper(d.nama || ' ' || d.kod) !~ ('(^|[^A-Z0-9])' || t)
    )
    order by d.nama, d.kod
    limit 10;
end $$;

revoke all on function cari_surat3(text) from public;
grant execute on function cari_surat3(text) to anon;
