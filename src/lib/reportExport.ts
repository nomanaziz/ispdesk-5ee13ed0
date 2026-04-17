import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export type Column = { key: string; label: string; format?: (v: any, row?: any) => string };

export function exportCSV(filename: string, columns: Column[], rows: any[]) {
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
  const body = rows
    .map((r) =>
      columns
        .map((c) => {
          const raw = c.format ? c.format(r[c.key], r) : r[c.key];
          const v = raw == null ? "" : String(raw);
          return `"${v.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
  const csv = "\ufeff" + header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

export function exportPDF(title: string, columns: Column[], rows: any[], opts?: { orientation?: "p" | "l" }) {
  const doc = new jsPDF({ orientation: opts?.orientation ?? "l", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(title, 40, 36);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString(), 40, 52);
  autoTable(doc, {
    startY: 64,
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => (c.format ? c.format(r[c.key], r) : r[c.key] ?? ""))),
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [44, 95, 110], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export function exportExcel(filename: string, columns: Column[], rows: any[], sheetName = "Sheet1") {
  const aoa = [
    columns.map((c) => c.label),
    ...rows.map((r) => columns.map((c) => (c.format ? c.format(r[c.key], r) : r[c.key] ?? ""))),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function fmtMoney(v: any) {
  const n = Number(v) || 0;
  return n.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fmtDate(v: any) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB");
}
export function fmtDateTime(v: any) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString("en-GB");
}
