"use client";
import { useMemo, useState } from "react";
import { Check, ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { useApp, call } from "@/lib/store";
import { Button, Card, Empty, Field, Input, Modal, PageHeader, Progress, cn } from "@/components/ui";
import { fmtDateTime } from "@/lib/logic";
import type { CheckItem } from "@/lib/types";

export default function SenaraiSemak() {
  const { data, run, confirm, can } = useApp();
  const [edit, setEdit] = useState<Partial<CheckItem> | null>(null);
  const [pending, setPending] = useState<number[]>([]);
  const groups = useMemo(() => {
    const m = new Map<string, CheckItem[]>();
    for (const c of data.checklist) m.set(c.category, [...(m.get(c.category) ?? []), c]);
    return [...m.entries()];
  }, [data.checklist]);
  const done = data.checklist.filter((c) => c.done).length;
  const pct = data.checklist.length ? Math.round((done / data.checklist.length) * 100) : 0;

  async function toggle(c: CheckItem) {
    if (data.me.role === "member") return;
    setPending((p) => [...p, c.id]);
    await run(() => call("PATCH", `/api/r/checklist/${c.id}`, { done: !c.done }));
    setPending((p) => p.filter((x) => x !== c.id));
  }
  async function del(c: CheckItem) {
    if (!(await confirm({ title: "Padam item", message: `Padam "${c.title}" daripada senarai semak?` }))) return;
    await run(() => call("DELETE", `/api/r/checklist/${c.id}`), "Item dipadam");
  }
  return (
    <>
      <PageHeader title="Senarai Semak Persiapan Majlis" sub="Tanda item apabila siap — dikemas kini untuk semua pengguna secara langsung"
        actions={can.admin && <Button variant="gold" onClick={() => setEdit({})}><Plus className="size-4" />Tambah Item</Button>} />
      <Card className="p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="size-14 rounded-2xl bg-gold-100 text-gold-600 grid place-items-center shrink-0"><ClipboardCheck className="size-7" /></div>
        <div className="flex-1"><p className="font-semibold text-navy-900">{done} daripada {data.checklist.length} item siap</p><Progress value={pct} className="mt-2" /></div>
      </Card>
      {groups.length === 0 ? <Card><Empty title="Senarai semak kosong" /></Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map(([cat, items]) => {
            const d = items.filter((i) => i.done).length;
            return (
              <Card key={cat}>
                <div className="flex items-center justify-between px-5 pt-4 pb-2"><h3 className="font-semibold text-navy-900 flex items-center gap-2">{cat}{d === items.length && <Check className="size-4 text-emerald-500" />}</h3><span className="text-xs text-slate-500 tabular-nums">{d}/{items.length}</span></div>
                <ul className="px-2 pb-3">
                  {items.map((c) => (
                    <li key={c.id} className="group flex items-start gap-1 rounded-lg hover:bg-navy-50">
                      <button onClick={() => toggle(c)} disabled={data.me.role === "member" || pending.includes(c.id)} role="checkbox" aria-checked={!!c.done} className="flex-1 flex items-start gap-3 text-left px-3 py-2.5 cursor-pointer disabled:cursor-default min-w-0">
                        <span className={cn("mt-0.5 size-5 rounded-md border-2 grid place-items-center shrink-0 transition", c.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white")}>{c.done ? <Check className="size-3.5" strokeWidth={3} /> : null}</span>
                        <span className="min-w-0"><span className={cn("block text-sm", c.done && "line-through text-slate-400")}>{c.title}</span>{c.done && c.done_at ? <span className="block text-[11px] text-slate-400">{fmtDateTime(c.done_at)} · {c.done_by}</span> : null}</span>
                      </button>
                      {can.admin && <div className="flex pt-1.5 pr-1 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100"><button aria-label={`Sunting ${c.title}`} onClick={() => setEdit(c)} className="p-1.5 rounded hover:bg-white text-slate-500 cursor-pointer"><Pencil className="size-3.5" /></button><button aria-label={`Padam ${c.title}`} onClick={() => del(c)} className="p-1.5 rounded hover:bg-white text-red-600 cursor-pointer"><Trash2 className="size-3.5" /></button></div>}
                    </li>))}
                </ul>
              </Card>);
          })}
        </div>
      )}
      {edit && <ItemForm key={edit.id ?? "baru"} value={edit} cats={groups.map((g) => g[0])} onClose={() => setEdit(null)} />}
    </>
  );
}

function ItemForm({ value, cats, onClose }: { value: Partial<CheckItem>; cats: string[]; onClose: () => void }) {
  const { run } = useApp();
  const [category, setCat] = useState(value.category ?? "");
  const [title, setTitle] = useState(value.title ?? "");
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function save() {
    const e: Record<string, string> = {};
    if (!category.trim()) e.category = "Kategori diperlukan";
    if (!title.trim()) e.title = "Tajuk item diperlukan";
    setErr(e); if (Object.keys(e).length) return;
    setBusy(true);
    const ok = await run(() => value.id ? call("PATCH", `/api/r/checklist/${value.id}`, { category, title }) : call("POST", "/api/r/checklist", { category, title }), "Item disimpan");
    setBusy(false); if (ok) onClose();
  }
  return (
    <Modal open onClose={onClose} title={value.id ? "Sunting Item" : "Item Baharu"} footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button variant="gold" onClick={save} loading={busy}>Simpan</Button></>}>
      <div className="space-y-4">
        <Field label="Kategori *" error={err.category}><Input list="cats" value={category} onChange={(e) => setCat(e.target.value)} /><datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist></Field>
        <Field label="Item *" error={err.title}><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
