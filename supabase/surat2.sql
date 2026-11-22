-- Carian surat mengikut SEBAHAGIAN nama + sokongan lebih daripada satu surat bagi seorang pelajar.
-- Jalankan SEKALI di SQL Editor SELEPAS surat.sql (dan semak.sql jika sudah). Selamat diulang.
-- Selepas itu buka halaman admin dan tekan "Bina carian untuk surat sedia ada" (tak perlu muat naik semula).

alter table surat add column if not exists tokens text[] not null default '{}';
alter table surat add column if not exists kod text not null default '';
create index if not exists surat_tokens_gin on surat using gin (tokens);

-- Ibu bapa: cari dengan kata kunci (cincang setiap perkataan; pelayan tidak pernah nampak perkataan asal).
-- Pulang maksimum 10 padanan (hanya nama dan kod, bukan kandungan fail).
create or replace function cari_surat(p_tokens text[])
returns table (hash text, nama text, kod text)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_tokens is null or array_length(p_tokens, 1) is null or array_length(p_tokens, 1) > 6 then return; end if;
  if exists (select 1 from unnest(p_tokens) t where length(t) <> 64) then return; end if;
  return query select s.hash, s.nama, s.kod from surat s where s.tokens @> p_tokens order by s.nama, s.kod limit 10;
end $$;

-- Admin: simpan surat dengan nama yang telah diurai (nama, kod, token).
create or replace function simpan_surat2(p_pass text, p_hash text, p_nama text, p_kod text, p_tokens text[], p_fail text, p_data text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _admin_ok(p_pass) then raise exception 'Kata laluan salah' using errcode = '28000'; end if;
  if length(p_hash) <> 64 then raise exception 'Cincang tidak sah'; end if;
  if length(p_data) > 2800000 then raise exception 'Fail terlalu besar (maks ~2 MB)'; end if;
  insert into surat (hash, nama, kod, tokens, fail, data, saiz, dikemas_kini)
    values (p_hash, left(p_nama, 160), left(coalesce(p_kod, ''), 40), coalesce(p_tokens, '{}'), left(coalesce(p_fail, 'surat.pdf'), 200), p_data, (length(p_data) * 3) / 4, now())
  on conflict (hash) do update
    set nama = excluded.nama, kod = excluded.kod, tokens = excluded.tokens, fail = excluded.fail, data = excluded.data, saiz = excluded.saiz, dikemas_kini = now();
end $$;

-- Admin: kemas kini nama/kod/token untuk surat sedia ada (tanpa muat naik semula).
create or replace function simpan_token(p_pass text, p_hash text, p_nama text, p_kod text, p_tokens text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _admin_ok(p_pass) then raise exception 'Kata laluan salah' using errcode = '28000'; end if;
  update surat set nama = left(p_nama, 160), kod = left(coalesce(p_kod, ''), 40), tokens = coalesce(p_tokens, '{}') where hash = p_hash;
end $$;

revoke all on function cari_surat(text[]), simpan_surat2(text, text, text, text, text[], text, text), simpan_token(text, text, text, text, text[]) from public;
grant execute on function cari_surat(text[]), simpan_surat2(text, text, text, text, text[], text, text), simpan_token(text, text, text, text, text[]) to anon;
