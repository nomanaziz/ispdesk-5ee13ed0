import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Rocket } from "lucide-react";
import { toast } from "sonner";

export default function SpeedTestTab() {
  const qc = useQueryClient();
  const [mode, setMode] = useState("demo");
  const [url, setUrl] = useState("https://www.speedtest.net");

  const { data } = useQuery({
    queryKey: ["pm-speedtest"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("setting_key, setting_value").in("setting_key", ["speed_test_mode", "speed_test_url"]);
      return data || [];
    },
  });

  useEffect(() => {
    if (!data) return;
    const m = data.find((d) => d.setting_key === "speed_test_mode")?.setting_value as string | undefined;
    const u = data.find((d) => d.setting_key === "speed_test_url")?.setting_value as string | undefined;
    if (typeof m === "string") setMode(m);
    if (typeof u === "string") setUrl(u);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error: e1 } = await supabase.from("system_settings").upsert({ setting_key: "speed_test_mode", setting_value: mode as any }, { onConflict: "setting_key" });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("system_settings").upsert({ setting_key: "speed_test_url", setting_value: url as any }, { onConflict: "setting_key" });
      if (e2) throw e2;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pm-speedtest"] }); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3 max-w-xl">
      <div className="flex items-center gap-2">
        <Rocket className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Speed Test Server</h3>
      </div>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Mode</Label>
            <RadioGroup value={mode} onValueChange={setMode} className="grid grid-cols-2 gap-2">
              <Label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                <RadioGroupItem value="demo" /> <span className="text-xs">Demo (Speedtest.net)</span>
              </Label>
              <Label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                <RadioGroupItem value="custom" /> <span className="text-xs">Custom URL</span>
              </Label>
            </RadioGroup>
          </div>
          <div>
            <Label>Server URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-speedtest.example.com" />
            <p className="text-[11px] text-muted-foreground mt-1">Clients will see this in their portal.</p>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
