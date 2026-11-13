#!/usr/bin/env python3
"""Sediakan surat jemputan untuk halaman RSVP.

Guna:  python3 scripts/rsvp-surat.py <folder-pdf> [--out public/JemputanHariAnugerahAkramin2026/surat]

Letak semua PDF dalam satu folder. NAMA FAIL = NAMA PENUH PELAJAR, cth:
    AHMAD BIN ABDULLAH.pdf
Skrip ini menyalin setiap PDF dengan nama rawak dan menulis index.json yang
hanya mengandungi cincang (hash) nama. Senarai nama TIDAK boleh dilihat
oleh pengunjung, mereka hanya boleh memuat turun jika menaip nama yang betul.
Fail senarai.csv (nama, fail) ditulis ke <folder-pdf>, BUKAN ke folder awam.
"""
import argparse, csv, hashlib, json, re, secrets, shutil, sys, unicodedata
from pathlib import Path

SALT = "ay2026|"                       # mesti sama dengan halaman RSVP
SKIP = {"BIN", "BINTI", "BT", "BTE", "B"}

def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").upper()
    s = re.sub(r"[^A-Z0-9 ]+", " ", s)
    return " ".join(t for t in s.split() if t and t not in SKIP)

def key(name: str) -> str:
    return hashlib.sha256((SALT + norm(name)).encode("utf-8")).hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", type=Path)
    ap.add_argument("--out", type=Path, default=Path("public/JemputanHariAnugerahAkramin2026/surat"))
    a = ap.parse_args()
    pdfs = sorted(a.src.glob("*.pdf"))
    if not pdfs:
        sys.exit("Tiada fail .pdf dalam " + str(a.src))
    if a.out.exists():
        shutil.rmtree(a.out)
    a.out.mkdir(parents=True)
    idx, rows, dup = {}, [], []
    for p in pdfs:
        name = p.stem
        if len(norm(name).split()) < 2:
            print("  LANGKAU (nama terlalu pendek):", p.name); continue
        k = key(name)
        if k in idx:
            dup.append(name); continue
        f = secrets.token_hex(8) + ".pdf"
        shutil.copyfile(p, a.out / f)
        idx[k] = f
        rows.append((name, f))
    (a.out / "index.json").write_text(json.dumps(idx, separators=(",", ":")), encoding="utf-8")
    with open(a.src / "senarai.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh); w.writerow(["nama", "fail"]); w.writerows(rows)
    print(f"Siap: {len(rows)} surat -> {a.out}")
    if dup:
        print("AMARAN nama berganda (hanya yang pertama digunakan):", ", ".join(dup))
    print("Senarai rujukan:", a.src / "senarai.csv", "(jangan masukkan dalam folder awam)")

if __name__ == "__main__":
    main()
