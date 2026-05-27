import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Settings, Clock, FileText, IdCard, Building2, Briefcase, DollarSign, Shield, UserX, Server, ScrollText } from "lucide-react";
import { DEFAULT_ATTENDANCE, DEFAULT_PAYSLIP, type AttendanceSettings, type PayslipSettings } from "@/hooks/useHrPayrollSettings";
import Departments from "./Departments";
import Positions from "./Positions";
import Payheads from "./Payheads";
import AttendanceRules from "./AttendanceRules";
import ResignRules from "./ResignRules";
import FacilityPolicies from "./FacilityPolicies";
import ShiftManagement from "./ShiftManagement";
import ZktecoDevices from "./ZktecoDevices";

const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export default function HrSettings() {
  const queryClient = useQueryClient();

  // Employee ID config
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [prefix, setPrefix] = useState("EMP");
  const [nextNumber, setNextNumber] = useState(1);
  const [padding, setPadding] = useState(3);

  // Attendance + Payslip settings
  const [att, setAtt] = useState<AttendanceSettings>(DEFAULT_ATTENDANCE);
  const [pay, setPay] = useState<PayslipSettings>(DEFAULT_PAYSLIP);

  const { data: allSettings, isLoading } = useQuery({
    queryKey: ["hr-settings-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("hr_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["employee_id_config", "attendance_settings", "payslip_settings"]);
      return Object.fromEntries((data || []).map((r: any) => [r.setting_key, r.setting_value]));
    },
  });

  useEffect(() => {
    if (!allSettings) return;
    const eid = allSettings.employee_id_config as any;
    if (eid) {
      setMode(eid.mode || "auto");
      setPrefix(eid.prefix || "EMP");
      setNextNumber(eid.next_number || 1);
      setPadding(eid.padding || 3);
    }
    if (allSettings.attendance_settings) setAtt({ ...DEFAULT_ATTENDANCE, ...(allSettings.attendance_settings as any) });
    if (allSettings.payslip_settings) setPay({ ...DEFAULT_PAYSLIP, ...(allSettings.payslip_settings as any) });
  }, [allSettings]);

  const upsert = async (key: string, value: any) => {
    const { data: existing } = await supabase.from("hr_settings").select("id").eq("setting_key", key).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("hr_settings").update({ setting_value: value }).eq("setting_key", key);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("hr_settings").insert({ setting_key: key, setting_value: value });
      if (error) throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      await upsert("employee_id_config", { mode, prefix, next_number: nextNumber, padding });
      await upsert("attendance_settings", att);
      await upsert("payslip_settings", pay);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-settings-all"] });
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-settings"] });
      toast.success("সব সেটিংস সংরক্ষিত হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const preview = mode === "auto" ? `${prefix}${String(nextNumber).padStart(padding, "0")}` : "ম্যানুয়াল ইনপুট";

  const [activeTab, setActiveTab] = useState("attendance");
  const showSaveBtn = ["attendance", "payslip", "empid"].includes(activeTab);

  const toggleDay = (d: string) => {
    setAtt((s) => ({ ...s, weekend_days: s.weekend_days.includes(d) ? s.weekend_days.filter((x) => x !== d) : [...s.weekend_days, d] }));
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">HR & Payroll সেটিংস</h1>
          <p className="text-sm text-muted-foreground">সকল HR কনফিগারেশন এক জায়গায়</p>
        </div>
        {showSaveBtn && (
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
            <Save className="h-4 w-4" /> {mutation.isPending ? "সংরক্ষণ হচ্ছে..." : "Save or Update"}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="attendance" className="gap-2"><Clock className="h-4 w-4" /> Attendance Settings</TabsTrigger>
          <TabsTrigger value="payslip" className="gap-2"><FileText className="h-4 w-4" /> Payslip Settings</TabsTrigger>
          <TabsTrigger value="empid" className="gap-2"><IdCard className="h-4 w-4" /> Employee ID</TabsTrigger>
          <TabsTrigger value="departments" className="gap-2"><Building2 className="h-4 w-4" /> ডিপার্টমেন্ট</TabsTrigger>
          <TabsTrigger value="positions" className="gap-2"><Briefcase className="h-4 w-4" /> পদবী</TabsTrigger>
          <TabsTrigger value="payheads" className="gap-2"><DollarSign className="h-4 w-4" /> পে-হেড</TabsTrigger>
          <TabsTrigger value="attendance-rules" className="gap-2"><Shield className="h-4 w-4" /> উপস্থিতি নিয়ম</TabsTrigger>
          <TabsTrigger value="shifts" className="gap-2"><Clock className="h-4 w-4" /> শিফট</TabsTrigger>
          <TabsTrigger value="zkteco" className="gap-2"><Server className="h-4 w-4" /> ZKTeco</TabsTrigger>
          <TabsTrigger value="facility-policies" className="gap-2"><ScrollText className="h-4 w-4" /> সুবিধা পলিসি</TabsTrigger>
          <TabsTrigger value="resign-rules" className="gap-2"><UserX className="h-4 w-4" /> রিজাইন নিয়ম</TabsTrigger>
        </TabsList>


        {/* ---------- Attendance ---------- */}
        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader className="bg-primary/10 rounded-t-lg py-3">
              <CardTitle className="text-base">Set "Attendance Settings" Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="font-semibold">Edit after Overtime approval</Label>
                  <p className="text-xs text-muted-foreground">Allow In-time & Out-time edit after overtime approval.</p>
                  <RadioGroup
                    value={att.edit_after_ot_approval ? "enable" : "disable"}
                    onValueChange={(v) => setAtt({ ...att, edit_after_ot_approval: v === "enable" })}
                    className="flex gap-6 pt-1"
                  >
                    <div className="flex items-center gap-2"><RadioGroupItem value="enable" id="ota-en" /><Label htmlFor="ota-en">Enable</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="disable" id="ota-dis" /><Label htmlFor="ota-dis">Disable</Label></div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Edit Previous Month Timing</Label>
                  <p className="text-xs text-muted-foreground">Allow In-time & Out-time edit for:</p>
                  <RadioGroup
                    value={att.edit_previous_month ? "both" : "current"}
                    onValueChange={(v) => setAtt({ ...att, edit_previous_month: v === "both" })}
                    className="flex flex-col gap-2 pt-1"
                  >
                    <div className="flex items-center gap-2"><RadioGroupItem value="both" id="pm-both" /><Label htmlFor="pm-both">Current Month & Previous Month</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="current" id="pm-cur" /><Label htmlFor="pm-cur">Current Month</Label></div>
                  </RadioGroup>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-semibold">Weekend Days</Label>
                <p className="text-xs text-muted-foreground">Set Weekend Days</p>
                <div className="flex flex-wrap gap-4 pt-1">
                  {DAYS.map((d) => (
                    <div key={d} className="flex items-center gap-2">
                      <Checkbox id={d} checked={att.weekend_days.includes(d)} onCheckedChange={() => toggleDay(d)} />
                      <Label htmlFor={d} className="text-sm">{d}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-semibold">Late & Overtime Manage</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">If an employee comes after office Start time, then after how many minutes from Start Time, the late count will start?</p>
                    <Input type="number" min={0} value={att.late_after_min} onChange={(e) => setAtt({ ...att, late_after_min: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">If an employee leaves before office End time, then how many minutes before End Time, the Early Out count will start?</p>
                    <Input type="number" min={0} value={att.early_out_before_min} onChange={(e) => setAtt({ ...att, early_out_before_min: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">If an employee leaves after office End time, then after how many minutes from End Time, the Overtime count will start?</p>
                    <Input type="number" min={0} value={att.overtime_after_min} onChange={(e) => setAtt({ ...att, overtime_after_min: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Payslip ---------- */}
        <TabsContent value="payslip" className="mt-4">
          <Card>
            <CardHeader className="bg-primary/10 rounded-t-lg py-3">
              <CardTitle className="text-base">Set "Payslip Generation Settings" Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { key: "apply_late_fee" as const, title: "Generate with Late fee", desc: "Calculate late fee during generate a payslip." },
                  { key: "apply_early_out_fee" as const, title: "Generate with Early Out fee", desc: "Calculate Early Out fee during generate a payslip." },
                  { key: "apply_overtime_fee" as const, title: "Generate with Overtime fee", desc: "Calculate Overtime fee during generate a payslip." },
                ].map((f) => (
                  <div key={f.key} className="space-y-2">
                    <Label className="font-semibold">{f.title}</Label>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                    <RadioGroup
                      value={pay[f.key] ? "enable" : "disable"}
                      onValueChange={(v) => setPay({ ...pay, [f.key]: v === "enable" })}
                      className="flex gap-6 pt-1"
                    >
                      <div className="flex items-center gap-2"><RadioGroupItem value="enable" id={`${f.key}-en`} /><Label htmlFor={`${f.key}-en`}>Enable</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="disable" id={`${f.key}-dis`} /><Label htmlFor={`${f.key}-dis`}>Disable</Label></div>
                    </RadioGroup>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Employee ID ---------- */}
        <TabsContent value="empid" className="mt-4">
          <Card className="max-w-xl">
            <CardHeader className="bg-primary/10 rounded-t-lg py-3">
              <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> কর্মী আইডি জেনারেশন</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">আইডি মোড</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as "auto" | "manual")} className="flex gap-6">
                  <div className="flex items-center gap-2"><RadioGroupItem value="auto" id="auto" /><Label htmlFor="auto">স্বয়ংক্রিয় (Auto)</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="manual" id="manual" /><Label htmlFor="manual">ম্যানুয়াল (Manual)</Label></div>
                </RadioGroup>
              </div>

              {mode === "auto" && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>প্রিফিক্স কোড</Label>
                      <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="EMP" />
                    </div>
                    <div>
                      <Label>শুরুর নম্বর</Label>
                      <Input type="number" min={1} value={nextNumber} onChange={(e) => setNextNumber(parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                      <Label>ডিজিট সংখ্যা</Label>
                      <Input type="number" min={1} max={10} value={padding} onChange={(e) => setPadding(parseInt(e.target.value) || 3)} />
                    </div>
                  </div>
                  <div className="bg-muted rounded-md p-3">
                    <Label className="text-xs text-muted-foreground">প্রিভিউ</Label>
                    <p className="text-lg font-mono font-bold text-foreground">{preview}</p>
                  </div>
                </>
              )}

              {mode === "manual" && (
                <div className="bg-muted rounded-md p-3">
                  <p className="text-sm text-muted-foreground">ম্যানুয়াল মোডে কর্মী যোগ করার সময় আইডি হাতে লিখতে হবে।</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="mt-4"><Departments /></TabsContent>
        <TabsContent value="positions" className="mt-4"><Positions /></TabsContent>
        <TabsContent value="payheads" className="mt-4"><Payheads /></TabsContent>
        <TabsContent value="attendance-rules" className="mt-4"><AttendanceRules /></TabsContent>
        <TabsContent value="shifts" className="mt-4"><ShiftManagement /></TabsContent>
        <TabsContent value="zkteco" className="mt-4"><ZktecoDevices /></TabsContent>
        <TabsContent value="facility-policies" className="mt-4"><FacilityPolicies /></TabsContent>
        <TabsContent value="resign-rules" className="mt-4"><ResignRules /></TabsContent>
      </Tabs>
    </div>
  );
}
