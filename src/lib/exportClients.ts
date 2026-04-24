import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

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

// ---------- Invoice PDF ----------

interface CompanyInfo {
  name?: string;
  company_name?: string;
  email?: string;
  address1?: string;
  address2?: string;
  company_address?: string;
  mobile1?: string;
  mobile2?: string;
  phone1?: string;
  phone?: string;
  hotline?: string;
  website?: string;
  logo_url?: string;
  tin?: string;
  bin?: string;
  payment_instructions?: string;
}

interface InvoiceCfg {
  invoiceTitle?: string;
  showInvoiceTitle?: boolean;
  titlePosition?: "left" | "center" | "right";
  logoUrl?: string;
  footerNote?: string;
  showVat?: boolean;
}

const DEFAULT_INVOICE_CFG: InvoiceCfg = {
  invoiceTitle: "Invoice",
  showInvoiceTitle: true,
  titlePosition: "left",
  logoUrl: "",
  footerNote: "Thank you for your business.",
  showVat: true,
};

async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const dims: { w: number; h: number } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = () => resolve({ w: 100, h: 100 });
      img.src = dataUrl;
    });
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

const fmtMoney = (n: any) => `BDT ${Number(n || 0).toFixed(2)}`;
const fmtDate = (d?: string | Date | null) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(d);
  }
};

async function fetchInvoiceContext(billingIds: string[]) {
  const [companyRes, invoiceRes, historyRes] = await Promise.all([
    supabase.from("system_settings").select("setting_value").eq("setting_key", "company_info").maybeSingle(),
    supabase.from("system_settings").select("setting_value").eq("setting_key", "invoice_setup").maybeSingle(),
    billingIds.length
      ? supabase.from("billing_history").select("*").in("billing_id", billingIds).order("changed_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const company = (companyRes.data?.setting_value as CompanyInfo) || {};
  const invoiceCfg: InvoiceCfg = { ...DEFAULT_INVOICE_CFG, ...((invoiceRes.data?.setting_value as InvoiceCfg) || {}) };
  const histories: Record<string, any[]> = {};
  for (const row of (historyRes.data || []) as any[]) {
    const k = row.billing_id || "_";
    (histories[k] = histories[k] || []).push(row);
  }
  return { company, invoiceCfg, histories };
}

function describeHistory(row: any): string {
  const oldV = row.old_value || {};
  const newV = row.new_value || {};
  const changes: string[] = [];
  if (oldV.amount !== undefined && newV.amount !== undefined && oldV.amount !== newV.amount) {
    changes.push(`Amount ${oldV.amount} -> ${newV.amount}`);
  }
  if (oldV.package_id !== newV.package_id) {
    changes.push(`Package changed`);
  }
  if (oldV.discount !== undefined && newV.discount !== undefined && oldV.discount !== newV.discount) {
    changes.push(`Discount ${oldV.discount} -> ${newV.discount}`);
  }
  if (oldV.vat !== undefined && newV.vat !== undefined && oldV.vat !== newV.vat) {
    changes.push(`VAT ${oldV.vat} -> ${newV.vat}`);
  }
  if (!changes.length) changes.push(row.action || "updated");
  return changes.join(", ");
}

export async function exportInvoicesPdf(clients: any[], filename = "invoices") {
  const billingIds = clients.map((c) => c.currentBill?.id).filter(Boolean);
  const { company, invoiceCfg, histories } = await fetchInvoiceContext(billingIds);

  const logoUrl = invoiceCfg.logoUrl || company.logo_url || "";
  const logo = logoUrl ? await loadImageAsDataUrl(logoUrl) : null;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  const companyName = company.company_name || company.name || "Company";
  const addr = [company.address1, company.address2, company.company_address].filter(Boolean).join(", ");
  const mobiles = [company.mobile1, company.mobile2].filter(Boolean).join(" / ");
  const phones = [company.phone1, company.phone, company.hotline].filter(Boolean).join(" / ");

  clients.forEach((c, idx) => {
    if (idx > 0) doc.addPage();
    const bill = c.currentBill || {};
    let y = margin;

    // Header band
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, pageW, 38, "F");

    if (logo) {
      const maxH = 22;
      const ratio = logo.w / logo.h;
      const h = maxH;
      const w = h * ratio;
      try {
        doc.addImage(logo.dataUrl, "PNG", margin, 8, w, h);
      } catch {
        // ignore
      }
    }

    const headerX = logo ? margin + 30 : margin;
    doc.setTextColor(20, 30, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(companyName, headerX, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 70, 90);
    let hy = 19;
    if (addr) { doc.text(addr, headerX, hy); hy += 4; }
    const contactBits: string[] = [];
    if (mobiles) contactBits.push(`Mobile: ${mobiles}`);
    if (phones) contactBits.push(`Phone: ${phones}`);
    if (company.email) contactBits.push(company.email);
    if (company.website) contactBits.push(company.website);
    if (contactBits.length) { doc.text(contactBits.join("  |  "), headerX, hy); hy += 4; }
    const idBits: string[] = [];
    if (company.tin) idBits.push(`TIN: ${company.tin}`);
    if (company.bin) idBits.push(`BIN: ${company.bin}`);
    if (idBits.length) doc.text(idBits.join("  |  "), headerX, hy);

    y = 44;

    // Invoice title
    if (invoiceCfg.showInvoiceTitle !== false) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(33, 99, 232);
      const title = invoiceCfg.invoiceTitle || "Invoice";
      const pos = invoiceCfg.titlePosition || "left";
      const tx = pos === "center" ? pageW / 2 : pos === "right" ? pageW - margin : margin;
      doc.text(title, tx, y, { align: pos === "center" ? "center" : pos === "right" ? "right" : "left" });
      y += 6;
    }

    // Meta row
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 50, 70);
    const monthLabel = bill.month ? new Date(bill.month).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "-";
    doc.text(`Bill #: ${bill.bill_id || "-"}`, margin, y);
    doc.text(`Date: ${fmtDate(new Date())}`, pageW - margin, y, { align: "right" });
    y += 5;
    doc.text(`Month: ${monthLabel}`, margin, y);

    // Status badge
    const due = Number(bill.due || 0);
    const paid = Number(bill.paid || 0);
    const isPaid = due <= 0 && paid > 0;
    const badge = isPaid ? "PAID" : due > 0 ? "DUE" : "UNPAID";
    const badgeColor: [number, number, number] = isPaid ? [34, 160, 90] : [220, 70, 70];
    doc.setFillColor(...badgeColor);
    const bw = 24, bh = 6;
    doc.roundedRect(pageW - margin - bw, y - 4, bw, bh, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(badge, pageW - margin - bw / 2, y, { align: "center" });
    y += 6;

    // Bill To
    doc.setTextColor(20, 30, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Bill To", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 50, 70);
    doc.text(`${c.name || "-"}  (${c.client_id || "-"})`, margin, y); y += 4;
    if (c.contact) { doc.text(`Mobile: ${c.contact}`, margin, y); y += 4; }
    if (c.address) { doc.text(String(c.address), margin, y); y += 4; }
    const pkgName = c.package?.name || c.isp_packages?.name || "-";
    doc.text(`Package: ${pkgName}`, margin, y); y += 4;
    if (c.expire_date) { doc.text(`Expire: ${fmtDate(c.expire_date)}`, margin, y); y += 4; }

    y += 2;

    // Items table
    const monthlyBill = Number(bill.amount ?? c.monthly_bill ?? 0);
    const discount = Number(bill.discount || 0);
    const vat = Number(bill.vat || 0);
    const advance = Number(bill.advance || 0);

    const body: any[] = [];
    body.push([`Internet Service - ${pkgName}`, "1", fmtMoney(monthlyBill)]);
    if (invoiceCfg.showVat !== false && vat > 0) body.push([`VAT`, "", fmtMoney(vat)]);
    if (discount > 0) body.push([`Discount`, "", `- ${fmtMoney(discount)}`]);

    autoTable(doc, {
      startY: y,
      head: [["Description", "Qty", "Amount"]],
      body,
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [33, 99, 232], textColor: 255 },
      columnStyles: { 1: { halign: "center", cellWidth: 20 }, 2: { halign: "right", cellWidth: 35 } },
      margin: { left: margin, right: margin },
    });

    let afterTable = (doc as any).lastAutoTable.finalY + 4;
    const subtotal = monthlyBill + (invoiceCfg.showVat !== false ? vat : 0) - discount;

    // Totals box (right aligned)
    const totals: [string, string][] = [
      ["Subtotal", fmtMoney(subtotal)],
      ["Paid", fmtMoney(paid)],
    ];
    if (advance > 0) totals.push(["Advance", fmtMoney(advance)]);
    totals.push(["Total Due", fmtMoney(due)]);

    const boxW = 70;
    const boxX = pageW - margin - boxW;
    let ty = afterTable;
    totals.forEach(([k, v], i) => {
      const isLast = i === totals.length - 1;
      if (isLast) {
        doc.setFillColor(33, 99, 232);
        doc.rect(boxX, ty, boxW, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(40, 50, 70);
        doc.setFont("helvetica", "normal");
      }
      doc.setFontSize(9);
      doc.text(k, boxX + 3, ty + (isLast ? 5 : 4.5));
      doc.text(v, boxX + boxW - 3, ty + (isLast ? 5 : 4.5), { align: "right" });
      ty += isLast ? 7 : 5.5;
    });
    afterTable = ty + 4;

    // Modification history
    const hist = (histories[bill.id] || []).filter((h: any) => h.action !== "create");
    if (hist.length) {
      doc.setTextColor(20, 30, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Bill Modification History", margin, afterTable);
      afterTable += 4;
      autoTable(doc, {
        startY: afterTable,
        head: [["Date", "Change", "Reason"]],
        body: hist.map((h: any) => [
          fmtDate(h.changed_at),
          describeHistory(h),
          h.remarks || "-",
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [120, 130, 150], textColor: 255 },
        margin: { left: margin, right: margin },
      });
      afterTable = (doc as any).lastAutoTable.finalY + 4;
    }

    // Payment instructions
    if (company.payment_instructions) {
      doc.setFontSize(8.5);
      doc.setTextColor(60, 70, 90);
      doc.setFont("helvetica", "bold");
      doc.text("Payment Instructions:", margin, afterTable);
      afterTable += 4;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(String(company.payment_instructions), pageW - margin * 2);
      doc.text(lines, margin, afterTable);
      afterTable += lines.length * 4;
    }

    // Footer
    const footerY = pageH - 18;
    doc.setDrawColor(220, 225, 235);
    doc.line(margin, footerY, pageW - margin, footerY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(60, 70, 90);
    if (invoiceCfg.footerNote) {
      doc.text(invoiceCfg.footerNote, pageW / 2, footerY + 5, { align: "center" });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 130, 150);
    doc.text(
      `Generated ${new Date().toLocaleString()}  |  Page ${idx + 1} of ${clients.length}`,
      pageW / 2,
      footerY + 10,
      { align: "center" },
    );
  });

  doc.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
