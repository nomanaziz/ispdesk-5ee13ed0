import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Settings2, Play, Loader2 } from "lucide-react";

type Mode = "monthly_first" | "date_to_date" | "both";
interface CycleConfig { mode: Mode; grace_days: number; }

const DEFAULT: CycleConfig = { mode: "monthly_first", grace_days: 15 };

export default function BillingCycleSettings() {
  const { value, isLoading, save, isSaving } = useSystemSetting<CycleConfig>(
    "billing_cycle_config",
    DEFAULT
  );

  const [mode, setMode] = useState<Mode>(DEFAULT.mode);
  const [grace, setGrace] = useState<number>(DEFAULT.grace_days);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!isLoading && value) {
      setMode(value.mode || DEFAULT.mode);
      setGrace(Number(value.grace_days ?? DEFAULT.grace_days));
    }
  }, [isLoading, value]);

  const handleSave = () => save({ mode, grace_days: grace });

  const generateNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-monthly-billing", {
        body: {},
      });
      if (error) throw error;
      toast.success(data?.message || "Bills generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate bills");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow">
          <Settings2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">বিলিং সাইকেল সেটিংস</h1>
          <p className="text-sm text-muted-foreground">
            ক্লায়েন্টদের মাসিক বিল কিভাবে এবং কখন তৈরি হবে তা নির্ধারণ করুন।
          </p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> বিলিং চক্র
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="gap-3">
            <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value="monthly_first" className="mt-1" />
              <div>
                <div className="font-semibold">Monthly — প্রতি মাসের ১ তারিখ</div>
                <div className="text-sm text-muted-foreground">
                  সকল active client-এর জন্য প্রতি মাসের ১ তারিখে একসাথে বিল তৈরি হবে।
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value="date_to_date" className="mt-1" />
              <div>
                <div className="font-semibold">Date-to-Date</div>
                <div className="text-sm text-muted-foreground">
                  প্রতিটি client-এর joining date / billing date অনুযায়ী আলাদা আলাদা বিল।
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value="both" className="mt-1" />
              <div>
                <div className="font-semibold">Both</div>
                <div className="text-sm text-muted-foreground">
                  client প্রোফাইল-এ থাকা cycle field অনুযায়ী individually decide হবে।
                </div>
              </div>
            </label>
          </RadioGroup>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Grace days (পেমেন্টের জন্য সময়)</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={grace}
                onChange={(e) => setGrace(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> সংরক্ষণ হচ্ছে…</> : "সেটিংস সংরক্ষণ করুন"}
            </Button>
            <Button onClick={generateNow} disabled={running} variant="secondary">
              {running ? <><Loader2 className="h-4 w-4 animate-spin" /> চলছে…</> : <><Play className="h-4 w-4" /> এখনই এই মাসের বিল তৈরি করুন</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-200">
          <strong>ℹ️ Note:</strong> Date-to-Date চক্র এবং automatic cron schedule (প্রতি মাসের ১ তারিখে auto-run) পরবর্তী phase-এ যোগ হবে। আপাতত উপরের button দিয়ে manually generate করুন।
        </CardContent>
      </Card>
    </div>
  );
}
