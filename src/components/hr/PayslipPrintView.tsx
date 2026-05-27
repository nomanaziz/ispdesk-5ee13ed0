import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeForEmployee, periodLabel, type ComputedPayroll } from "@/lib/payrollCompute";

interface Props {
  payroll: any;
  employee: any;
  companyName?: string;
}

function fmt(n: number | string | null | undefined) {
  return Number(n || 0).toLocaleString();
}

function monthRange(month: string) {
  // month: YYYY-MM-DD
  const d = new Date(month);
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const f = (x: Date) => `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}/${x.getFullYear()}`;
  return `${f(start)} To ${f(end)}`;
}

export default function PayslipPrintView({ payroll, employee, companyName = "Company Name" }: Props) {
  const [computed, setComputed] = useState<ComputedPayroll | null>(null);

  useEffect(() => {
    (async () => {
      const overrides = payroll?.adjustments && Array.isArray(payroll.adjustments) ? payroll.adjustments : [];
      const c = await computeForEmployee(employee, overrides);
      setComputed(c);
    })();
  }, [payroll, employee]);

  const status = payroll?.payment_status || payroll?.status || "unpaid";
  const statusLabel =
    status === "paid" ? "Fully Paid" : status === "partial" ? "Partially Paid" : "Unpaid";
  const statusColor =
    status === "paid" ? "#2563eb" : status === "partial" ? "#d97706" : "#dc2626";

  const month = payroll?.month || "";
  const monthShort = month ? periodLabel(month.slice(0, 7)) : "";

  const allowances = computed?.lines.filter((l) => l.type === "allowance") || [];
  const deductions = computed?.lines.filter((l) => l.type === "deduction") || [];
  const rows = Math.max(allowances.length, deductions.length, 1);

  const loanDed = Number(payroll?.loan_deduction || 0);
  const advDed = Number(payroll?.advance_deduction || 0);
  const extraDed = loanDed + advDed;
  const totalAdd = computed?.total_allowance ?? 0;
  const totalDed = (computed?.total_deduction ?? 0) + extraDed;
  const basic = computed?.basic_salary ?? 0;
  const gross = basic + totalAdd;
  const net = gross - totalDed;

  return (
    <div className="payslip-sheet" style={{ fontFamily: "Arial, sans-serif", color: "#333", padding: "24px", background: "#fff" }}>
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", alignItems: "start" }}>
        <div></div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", fontWeight: 700 }}>{companyName}</div>
          <div style={{ marginTop: "6px", fontWeight: 600 }}>
            Pay Slip for the period of <strong>{monthShort}</strong>
          </div>
          <div style={{ marginTop: "2px" }}>{monthRange(month)}</div>
        </div>
        <div style={{ textAlign: "right", color: statusColor, fontWeight: 600 }}>{statusLabel}</div>
      </div>

      {/* Employee info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 32px", marginTop: "20px", fontSize: "13px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "150px 10px 1fr" }}>
          <span>Employee Name</span><span>:</span><strong>{employee?.name || "—"}</strong>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "150px 10px 1fr" }}>
          <span>Pay Slip Id</span><span>:</span><strong>{payroll?.id?.slice(0, 18) || "—"}</strong>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "150px 10px 1fr" }}>
          <span>Employee Id</span><span>:</span><strong>{employee?.employee_id || "—"}</strong>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "150px 10px 1fr" }}>
          <span>Position Name</span><span>:</span><strong>{employee?.positions?.name || "—"}</strong>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "150px 10px 1fr" }}>
          <span>Employee Number</span><span>:</span><strong>{employee?.phone || employee?.mobile || "—"}</strong>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "150px 10px 1fr" }}>
          <span>Joinning Date</span><span>:</span>
          <strong>{employee?.joining_date ? new Date(employee.joining_date).toLocaleDateString("en-GB") : "—"}</strong>
        </div>
      </div>

      {/* Payheads table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: "#4a4a4a", color: "#fff" }}>
            <th style={th}>Payheads</th>
            <th style={th}>Unit</th>
            <th style={th}>Type</th>
            <th style={th}>Addition</th>
            <th style={th}>Amount</th>
            <th style={th}>Deduction</th>
            <th style={th}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {/* Basic salary as first row */}
          <tr>
            <td style={td}>Basic Salary</td>
            <td style={tdC}>{fmt(basic)}</td>
            <td style={tdC}>Amount</td>
            <td style={tdC}>Addition</td>
            <td style={tdC}>{fmt(basic)}</td>
            <td style={tdC}></td>
            <td style={tdC}></td>
          </tr>
          {Array.from({ length: rows }).map((_, i) => {
            const a = allowances[i];
            const d = deductions[i];
            if (!a && !d) return null;
            return (
              <tr key={i}>
                <td style={td}>{a?.name || d?.name || ""}</td>
                <td style={tdC}>{a ? fmt(a.amount) : d ? fmt(d.amount) : 0}</td>
                <td style={tdC}>{a?.amount_type === "percentage" ? "Percentage" : "Amount"}</td>
                <td style={tdC}>{a ? "Addition" : ""}</td>
                <td style={tdC}>{a ? fmt(a.amount) : ""}</td>
                <td style={tdC}>{d ? "Deduction" : ""}</td>
                <td style={tdC}>{d ? fmt(d.amount) : ""}</td>
              </tr>
            );
          })}
          {loanDed > 0 && (
            <tr>
              <td style={td}>Loan Installment</td>
              <td style={tdC}>{fmt(loanDed)}</td>
              <td style={tdC}>Amount</td>
              <td style={tdC}></td>
              <td style={tdC}></td>
              <td style={tdC}>Deduction</td>
              <td style={tdC}>{fmt(loanDed)}</td>
            </tr>
          )}
          {advDed > 0 && (
            <tr>
              <td style={td}>Advance Adjustment</td>
              <td style={tdC}>{fmt(advDed)}</td>
              <td style={tdC}>Amount</td>
              <td style={tdC}></td>
              <td style={tdC}></td>
              <td style={tdC}>Deduction</td>
              <td style={tdC}>{fmt(advDed)}</td>
            </tr>
          )}
          <tr style={{ fontWeight: 700 }}>
            <td style={td}></td>
            <td style={tdC}></td>
            <td style={tdC}></td>
            <td style={tdC}>Total</td>
            <td style={tdC}>{fmt(basic + totalAdd)}</td>
            <td style={tdC}>Total</td>
            <td style={tdC}>{fmt(totalDed)}</td>
          </tr>
        </tbody>
      </table>

      {/* Footer summary table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px", fontSize: "13px" }}>
        <tbody>
          <tr>
            <td style={{ ...td, width: "33%" }}></td>
            <td style={{ ...tdC, fontWeight: 600 }}>Gross Salary</td>
            <td style={{ ...tdC, width: "33%" }}>{fmt(gross)}</td>
          </tr>
          <tr>
            <td style={td}></td>
            <td style={{ ...tdC, fontWeight: 600 }}>Total Deduction</td>
            <td style={tdC}>{fmt(totalDed)}</td>
          </tr>
          <tr>
            <td style={td}></td>
            <td style={{ ...tdC, fontWeight: 700 }}>Net Salary</td>
            <td style={{ ...tdC, fontWeight: 700 }}>{fmt(net)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { border: "1px solid #ccc", padding: "8px", textAlign: "center", fontWeight: 600 };
const td: React.CSSProperties = { border: "1px solid #ccc", padding: "6px 10px" };
const tdC: React.CSSProperties = { border: "1px solid #ccc", padding: "6px 10px", textAlign: "center" };
