// Loan + Advance salary auto-deduction helpers
import { supabase } from "@/integrations/supabase/client";

export interface DeductionResult {
  loan_deduction: number;
  advance_deduction: number;
  active_loan_id?: string;
  installment_amount?: number;
  advance_ids: string[];
}

/**
 * Calculate loan installment + previous-month advance to deduct from this month's payslip.
 * month format: "YYYY-MM"
 */
export async function getDeductionsForEmployee(employeeId: string, month: string): Promise<DeductionResult> {
  const result: DeductionResult = {
    loan_deduction: 0,
    advance_deduction: 0,
    advance_ids: [],
  };

  // 1. Active loan with remaining balance
  const { data: loans } = await supabase
    .from("employee_loans")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("status", "active")
    .gt("remaining_balance", 0)
    .order("created_at");

  const loan = (loans || [])[0];
  if (loan && loan.start_month <= month) {
    // skip if installment already paid for this month
    const { data: paid } = await supabase
      .from("loan_installments")
      .select("id")
      .eq("loan_id", loan.id)
      .eq("month", month)
      .maybeSingle();
    if (!paid) {
      const inst = Math.min(Number(loan.monthly_installment), Number(loan.remaining_balance));
      result.loan_deduction = inst;
      result.active_loan_id = loan.id;
      result.installment_amount = inst;
    }
  }

  // 2. Approved advance salary not yet adjusted — adjust in next month's payslip
  const { data: advances } = await supabase
    .from("advance_salary")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("status", "approved")
    .is("adjusted_in_month", null);

  for (const a of advances || []) {
    result.advance_deduction += Number(a.amount);
    result.advance_ids.push(a.id);
  }

  return result;
}

/**
 * After payroll insert, record loan installment row + mark advances adjusted.
 */
export async function applyDeductions(payrollId: string, month: string, ded: DeductionResult) {
  if (ded.active_loan_id && ded.installment_amount) {
    await supabase.from("loan_installments").insert({
      loan_id: ded.active_loan_id,
      month,
      amount: ded.installment_amount,
      payroll_id: payrollId,
      status: "paid",
    });
    // update remaining
    const { data: loan } = await supabase
      .from("employee_loans")
      .select("remaining_balance")
      .eq("id", ded.active_loan_id)
      .single();
    if (loan) {
      const newBal = Number(loan.remaining_balance) - ded.installment_amount;
      await supabase
        .from("employee_loans")
        .update({
          remaining_balance: Math.max(0, newBal),
          status: newBal <= 0 ? "completed" : "active",
        })
        .eq("id", ded.active_loan_id);
    }
  }

  if (ded.advance_ids.length) {
    await supabase
      .from("advance_salary")
      .update({ adjusted_in_month: month, status: "adjusted" })
      .in("id", ded.advance_ids);
  }
}

/**
 * If payslip regenerated, reverse previously-applied deductions for that payroll row.
 */
export async function reverseDeductions(payrollId: string, month: string) {
  // Loan installments
  const { data: insts } = await supabase
    .from("loan_installments")
    .select("*")
    .eq("payroll_id", payrollId);
  for (const i of insts || []) {
    const { data: loan } = await supabase
      .from("employee_loans")
      .select("remaining_balance")
      .eq("id", i.loan_id)
      .maybeSingle();
    if (loan) {
      await supabase
        .from("employee_loans")
        .update({
          remaining_balance: Number(loan.remaining_balance) + Number(i.amount),
          status: "active",
        })
        .eq("id", i.loan_id);
    }
  }
  if (insts?.length) {
    await supabase.from("loan_installments").delete().eq("payroll_id", payrollId);
  }

  // Advances adjusted in this month
  await supabase
    .from("advance_salary")
    .update({ adjusted_in_month: null, status: "approved" })
    .eq("adjusted_in_month", month);
}
