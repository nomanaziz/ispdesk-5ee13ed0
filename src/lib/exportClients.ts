import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ClientExportRow {
  client_id?: string;
  name?: string;
  contact?: string;
  username?: string;
  zone?: string;
  package?: string;
  monthly_bill?: number;
  expire_date?: string;
  billing_status?: string;
  server?: string;
  due?: number;
  paid?: number;
}

const HEADERS: { key: keyof ClientExportRow; label: string }[] = [
  { key: "client_id", label: "Client Code" },
  { key: "name", label: "Name" },
  { key: "contact", label: "Mobile" },
  { key: "username", label: "Username" },
  { key: "zone", label: "Zone" },
  { key: "package", label: "Package" },
  { key: "monthly_bill", label: "Monthly Bill" },
  { key: "paid", label: "Paid" },
  { key: "due", label: "Due" },
  { key: "expire_date", label: "Expire" },
  { key: "billing_status", label: "Status" },
  { key: "server", label: "Server" },
];

export function exportClientsExcel(rows: ClientExportRow[], filename = "clients") {
  const data = rows.map((r) => {
    const o: any = {};
    HEADERS.forEach((h) => (o[h.label] = (r as any)[h.key] ?? ""));
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clients");
  XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportClientsPdf(rows: ClientExportRow[], filename = "clients", title = "Client List") {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);

  autoTable(doc, {
    startY: 24,
    head: [HEADERS.map((h) => h.label)],
    body: rows.map((r) => HEADERS.map((h) => String((r as any)[h.key] ?? ""))),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [33, 150, 243] },
  });

  doc.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function clientsToRows(clients: any[]): ClientExportRow[] {
  return clients.map((c) => ({
    client_id: c.client_id,
    name: c.name,
    contact: c.contact,
    username: c.username,
    zone: c.zone?.name || c.zones?.name || "",
    package: c.package?.name || c.isp_packages?.name || "",
    monthly_bill: Number(c.monthly_bill || 0),
    paid: Number(c.currentBill?.paid || 0),
    due: Number(c.currentBill?.due || 0),
    expire_date: c.expire_date || "",
    billing_status: c.billing_status || c.status || "",
    server: c.mikrotik_device?.name || c.server_name || "",
  }));
}

export function exportInvoicesPdf(clients: any[], filename = "invoices") {
  const doc = new jsPDF();
  clients.forEach((c, idx) => {
    if (idx > 0) doc.addPage();
    const b = c.currentBill;
    doc.setFontSize(18);
    doc.text("INVOICE", 14, 18);
    doc.setFontSize(10);
    doc.text(`Bill ID: ${b?.bill_id || "-"}`, 14, 28);
    doc.text(`Month: ${b?.month || "-"}`, 14, 34);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 40);

    doc.setFontSize(11);
    doc.text("Client Information", 14, 52);
    doc.setFontSize(10);
    doc.text(`Name: ${c.name || "-"}`, 14, 60);
    doc.text(`Code: ${c.client_id || "-"}`, 14, 66);
    doc.text(`Mobile: ${c.contact || "-"}`, 14, 72);
    doc.text(`Package: ${c.package?.name || c.isp_packages?.name || "-"}`, 14, 78);

    autoTable(doc, {
      startY: 88,
      head: [["Description", "Amount"]],
      body: [
        ["Monthly Bill", String(c.monthly_bill || 0)],
        ["Paid", String(b?.paid || 0)],
        ["Discount", String(b?.discount || 0)],
        ["VAT", String(b?.vat || 0)],
        ["Due", String(b?.due || 0)],
      ],
      headStyles: { fillColor: [33, 150, 243] },
    });
  });
  doc.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
