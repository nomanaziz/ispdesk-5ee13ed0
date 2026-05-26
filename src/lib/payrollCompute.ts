// Payroll computation helpers
import { supabase } from "@/integrations/supabase/client";

export interface PayheadLine {
  payhead_id: string;
  name: string;
  type: "allowance" | "deduction";
  amount_type: "amount" | "percentage";
  base_amount: number; // from template
  amount: number;      // computed (or override)
  is_override?: boolean;
  source?: "template" | "attendance" | "manual";
}

export interface ComputedPayroll {
  employee_id: string;
  basic_salary: number;
  lines: PayheadLine[];
  total_allowance: number;
  total_deduction: number;
  net_salary: number;
}

/**
 * Build default payheads for an employee from their assigned payroll template.
 * Overrides (per-month adjustments JSON) replace amounts by payhead_id.
 */
export async function computeForEmployee(
  employee: any,
  overrides: Array<{ payhead_id: string; amount: number }> = []
): Promise<ComputedPayroll> {
  const basic = Number(employee.salary || 0);
  const lines: PayheadLine[] = [];
  const tplId = employee.payroll_template_id;

  if (tplId) {
    const { data: assigned } = await supabase
      .from("payroll_template_payheads")
      .select("*, payheads(id, name, type)")
      .eq("template_id", tplId);

    for (const row of assigned || []) {
      const ph: any = (row as any).payheads;
      if (!ph) continue;
      const baseVal = Number((row as any).amount_value || 0);
      const isPct = (row as any).amount_type === "percentage";
      const computed = isPct ? (basic * baseVal) / 100 : baseVal;
      const override = overrides.find((o) => o.payhead_id === ph.id);
      lines.push({
        payhead_id: ph.id,
        name: ph.name,
        type: ph.type === "deduction" ? "deduction" : "allowance",
        amount_type: isPct ? "percentage" : "amount",
        base_amount: computed,
        amount: override ? Number(override.amount) : computed,
        is_override: !!override,
        source: "template",
      });
    }
  }

  // any override pointing to non-template payhead → add as manual
  for (const o of overrides) {
    if (lines.find((l) => l.payhead_id === o.payhead_id)) continue;
    const { data: ph } = await supabase.from("payheads").select("id,name,type").eq("id", o.payhead_id).maybeSingle();
    if (!ph) continue;
    lines.push({
      payhead_id: ph.id,
      name: ph.name,
      type: (ph as any).type === "deduction" ? "deduction" : "allowance",
      amount_type: "amount",
      base_amount: 0,
      amount: Number(o.amount),
      is_override: true,
      source: "manual",
    });
  }

  const total_allowance = lines.filter((l) => l.type === "allowance").reduce((s, l) => s + l.amount, 0);
  const total_deduction = lines.filter((l) => l.type === "deduction").reduce((s, l) => s + l.amount, 0);

  return {
    employee_id: employee.id,
    basic_salary: basic,
    lines,
    total_allowance,
    total_deduction,
    net_salary: basic + total_allowance - total_deduction,
  };
}

export function monthToDate(month: string) {
  // month "2026-05" → "2026-05-01"
  return month.length === 7 ? `${month}-01` : month;
}

export function dateToMonth(date: string) {
  return date.slice(0, 7);
}

export function periodLabel(month: string) {
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [y, mo] = month.split("-");
  return `${m[Number(mo) - 1]}-${y.slice(-2)}`;
}
