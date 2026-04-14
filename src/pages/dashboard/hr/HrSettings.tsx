import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Save, Settings } from "lucide-react";

export default function HrSettings() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [prefix, setPrefix] = useState("EMP");
  const [nextNumber, setNextNumber] = useState(1);
  const [padding, setPadding] = useState(3);

  const { data: setting, isLoading } = useQuery({
    queryKey: ["hr-settings-employee-id"],
    queryFn: async () => {
      const { data } = await supabase.from("hr_settings").select("*").eq("setting_key", "employee_id_config").single();
      return data;
    },
  });

  useEffect(() => {
    if (setting) {
      const val = setting.setting_value as any;
      setMode(val.mode || "auto");
      setPrefix(val.prefix || "EMP");
      setNextNumber(val.next_number || 1);
      setPadding(val.padding || 3);
    }
  }, [setting]);

  const mutation = useMutation({
    mutationFn: async () => {
      const value = { mode, prefix, next_number: nextNumber, padding };
      if (setting) {
        const { error } = await supabase.from("hr_settings").update({ setting_value: value }).eq("setting_key", "employee_id_config");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hr_settings").insert({ setting_key: "employee_id_config", setting_value: value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-settings-employee-id"] });
      toast.success("সেটিংস সংরক্ষিত হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const preview = mode === "auto" ? `${prefix}${String(nextNumber).padStart(padding, "0")}` : "ম্যানুয়াল ইনপুট";

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">HR সেটিংস</h1>
          <p className="text-sm text-muted-foreground">কর্মী আইডি কনফিগারেশন</p>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
          <Save className="h-4 w-4" /> {mutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </div>

      <Card className="max-w-xl">
        <CardHeader className="bg-primary/10 rounded-t-lg py-3">
          <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> কর্মী আইডি জেনারেশন</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">আইডি মোড</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as "auto" | "manual")} className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto">স্বয়ংক্রিয় (Auto)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual">ম্যানুয়াল (Manual)</Label>
              </div>
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
    </div>
  );
}
