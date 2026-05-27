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
  lines: PayheadLine[];           // does NOT include the Basic Salary line
  total_allowance: number;        // sum of allowance lines (excl. basic)
  total_deduction: number;
  net_salary: number;             // basic + allowance - deduction
}

let _defaultTplCache: string | null | undefined = undefined;
export async function getDefaultTemplateId(): Promise<string | null> {
  if (_defaultTplCache !== undefined) return _defaultTplCache;
  const { data } = await supabase
    .from("payroll_templates")
    .select("id")
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();
  _defaultTplCache = data?.id ?? null;
  return _defaultTplCache;
}

/**
 * Build payheads for an employee from their template (or default fallback).
 * "Basic Salary" payhead is treated specially: its computed amount becomes
 * `basic_salary` and the line is NOT included in `lines` to avoid double-count.
 */
export async function computeForEmployee(
  employee: any,
  overrides: Array<{ payhead_id: string; amount: number }> = []
): Promise<ComputedPayroll> {
  const gross = Number(employee.salary || 0); // employee.salary represents gross base used for % calc
  const lines: PayheadLine[] = [];
  let tplId = employee.payroll_template_id;
  if (!tplId) tplId = await getDefaultTemplateId();

  let basicLineAmount: number | null = null;

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
      const computed = isPct ? (gross * baseVal) / 100 : baseVal;
      const override = overrides.find((o) => o.payhead_id === ph.id);
      const amount = override ? Number(override.amount) : computed;

      // Capture Basic Salary separately
      if (String(ph.name || "").trim().toLowerCase() === "basic salary") {
        basicLineAmount = amount;
        continue;
      }

      lines.push({
        payhead_id: ph.id,
        name: ph.name,
        type: ph.type === "deduction" ? "deduction" : "allowance",
        amount_type: isPct ? "percentage" : "amount",
        base_amount: computed,
        amount,
        is_override: !!override,
        source: "template",
      });
    }
  }

  // Manual / extra overrides not in template
  for (const o of overrides) {
    if (lines.find((l) => l.payhead_id === o.payhead_id)) continue;
    // ignore if it's the basic salary override (already captured above)
    const { data: ph } = await supabase.from("payheads").select("id,name,type").eq("id", o.payhead_id).maybeSingle();
    if (!ph) continue;
    if (String((ph as any).name || "").trim().toLowerCase() === "basic salary") {
      basicLineAmount = Number(o.amount);
      continue;
    }
    lines.push({
      payhead_id: ph.id,
      name: (ph as any).name,
      type: (ph as any).type === "deduction" ? "deduction" : "allowance",
      amount_type: "amount",
      base_amount: 0,
      amount: Number(o.amount),
      is_override: true,
      source: "manual",
    });
  }

  // Fallback: if no Basic Salary payhead was found, derive 50% of gross
  const basic_salary = basicLineAmount !== null ? basicLineAmount : Math.round(gross * 0.5);

  const total_allowance = lines.filter((l) => l.type === "allowance").reduce((s, l) => s + l.amount, 0);
  const total_deduction = lines.filter((l) => l.type === "deduction").reduce((s, l) => s + l.amount, 0);

  return {
    employee_id: employee.id,
    basic_salary,
    lines,
    total_allowance,
    total_deduction,
    net_salary: basic_salary + total_allowance - total_deduction,
  };
}

export function monthToDate(month: string) {
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
