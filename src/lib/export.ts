import type { Report } from "./reports";

const latin = (s: string) => String(s ?? "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x09\x0a\x0d\x20-\xff]/g, "-");
export const fileBase = (r: Report) => `${r.title.replace(/[^\w]+/g, "_").replace(/^_|_$/g, "").slice(0, 60)}_${new Date().toISOString().slice(0, 10)}`;

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function exportPdf(r: Report) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(10, 27, 61); doc.rect(0, 0, W, 64, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text(latin("AJK COMMAND CENTER 2026"), 36, 28);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(217, 184, 74); doc.text(latin(r.event), 36, 46);
  doc.setTextColor(10, 27, 61); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(latin(r.title), 36, 92);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90);
  doc.text(latin(`Tarikh laporan: ${r.generatedAt}   |   Skop: ${r.scope}`), 36, 108);
  let y = 122;
  autoTable(doc, { startY: y, head: [["Ringkasan", ""]], body: r.summary.map(([a, b]) => [latin(a), latin(b)]), theme: "grid", styles: { fontSize: 9, cellPadding: 4 }, headStyles: { fillColor: [201, 162, 39], textColor: 10 }, columnStyles: { 0: { cellWidth: 200, fontStyle: "bold" } }, tableWidth: 420, margin: { left: 36 } });
  for (const s of r.sections) {
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
    if (y > doc.internal.pageSize.getHeight() - 90) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(10, 27, 61); doc.text(latin(s.heading), 36, y);
    autoTable(doc, {
      startY: y + 6, head: [s.columns.map(latin)], body: s.rows.length ? s.rows.map((row) => row.map(latin)) : [[{ content: "Tiada rekod", colSpan: s.columns.length, styles: { halign: "center", textColor: 130 } }]],
      theme: "striped", styles: { fontSize: 8, cellPadding: 3.5, overflow: "linebreak" }, headStyles: { fillColor: [10, 27, 61], textColor: 255 }, alternateRowStyles: { fillColor: [242, 245, 251] }, margin: { left: 36, right: 36 },
    });
  }
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(130); doc.text(latin(`${r.event}  |  Halaman ${i}/${n}`), 36, doc.internal.pageSize.getHeight() - 20); }
  download(doc.output("blob"), `${fileBase(r)}.pdf`);
}

export async function exportExcel(r: Report) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "AJK Command Center 2026"; wb.created = new Date();
  const navy = "FF0A1B3D", gold = "FFC9A227";
  const ws = wb.addWorksheet("Ringkasan");
  ws.columns = [{ width: 34 }, { width: 50 }];
  ws.addRow(["AJK COMMAND CENTER 2026"]).font = { bold: true, size: 14, color: { argb: navy } };
  ws.addRow([r.event]); ws.addRow([r.title]).font = { bold: true, size: 12 };
  ws.addRow(["Tarikh laporan", r.generatedAt]); ws.addRow(["Skop", r.scope]); ws.addRow([]);
  const h = ws.addRow(["Ringkasan", ""]); h.font = { bold: true }; h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: gold } };
  r.summary.forEach(([a, b]) => ws.addRow([a, b]));
  r.sections.forEach((s, i) => {
    const sh = wb.addWorksheet(`${i + 1}. ${s.heading}`.replace(/[\\/?*[\]:]/g, "").slice(0, 31));
    sh.addRow(s.columns);
    const head = sh.getRow(1); head.font = { bold: true, color: { argb: "FFFFFFFF" } }; head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };
    s.rows.forEach((row) => sh.addRow(row));
    sh.columns = s.columns.map((c, ci) => ({ width: Math.min(60, Math.max(c.length + 2, ...s.rows.map((rw) => String(rw[ci] ?? "").length + 2), 10)) }));
    sh.eachRow((row) => row.eachCell((c) => { c.alignment = { vertical: "top", wrapText: true }; }));
    sh.views = [{ state: "frozen", ySplit: 1 }];
  });
  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${fileBase(r)}.xlsx`);
}
