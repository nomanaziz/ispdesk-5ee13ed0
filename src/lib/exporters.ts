import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ColDef<T = any> {
  header: string;
  accessor: (row: T) => any;
}

export function exportCsv<T>(filename: string, cols: ColDef<T>[], rows: T[]) {
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const head = cols.map((c) => escape(c.header)).join(",");
  const body = rows.map((r) => cols.map((c) => escape(c.accessor(r))).join(",")).join("\n");
  const csv = head + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPdf<T>(filename: string, title: string, cols: ColDef<T>[], rows: T[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(13);
  doc.text(title, 14, 14);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}  |  Total: ${rows.length}`, 14, 19);
  autoTable(doc, {
    startY: 23,
    head: [cols.map((c) => c.header)],
    body: rows.map((r) => cols.map((c) => String(c.accessor(r) ?? ""))),
    styles: { fontSize: 7, cellPadding: 1.4 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
