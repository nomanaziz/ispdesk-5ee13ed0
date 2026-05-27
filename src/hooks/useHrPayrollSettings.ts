import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AttendanceSettings = {
  edit_after_ot_approval: boolean;
  edit_previous_month: boolean;
  weekend_days: string[];
  late_after_min: number;
  early_out_before_min: number;
  overtime_after_min: number;
};

export type PayslipSettings = {
  apply_late_fee: boolean;
  apply_early_out_fee: boolean;
  apply_overtime_fee: boolean;
};

export const DEFAULT_ATTENDANCE: AttendanceSettings = {
  edit_after_ot_approval: false,
  edit_previous_month: false,
  weekend_days: ["FRIDAY"],
  late_after_min: 0,
  early_out_before_min: 0,
  overtime_after_min: 0,
};

export const DEFAULT_PAYSLIP: PayslipSettings = {
  apply_late_fee: false,
  apply_early_out_fee: false,
  apply_overtime_fee: false,
};

export function useHrPayrollSettings() {
  return useQuery({
    queryKey: ["hr-payroll-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("hr_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["attendance_settings", "payslip_settings"]);
      const map = Object.fromEntries((data || []).map((r: any) => [r.setting_key, r.setting_value]));
      return {
        attendance: { ...DEFAULT_ATTENDANCE, ...(map.attendance_settings || {}) } as AttendanceSettings,
        payslip: { ...DEFAULT_PAYSLIP, ...(map.payslip_settings || {}) } as PayslipSettings,
      };
    },
  });
}
