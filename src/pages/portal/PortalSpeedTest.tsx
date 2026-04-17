import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Rocket, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const PortalSpeedTest = () => {
  const [mode, setMode] = useState("demo");
  const [url, setUrl] = useState("https://www.speedtest.net");

  const { data } = useQuery({
    queryKey: ["portal-speedtest"],
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

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-400 to-pink-500 flex items-center justify-center text-white shadow">
          <Rocket className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Speed Test</h1>
          <p className="text-sm text-muted-foreground">Check your connection speed</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-[16/10] w-full bg-muted">
            <iframe src={url} className="w-full h-full border-0" title="Speed Test" />
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{mode === "demo" ? "Demo server" : "Custom server"}</span>
            <a href={url} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5 mr-1" /> Open in new tab</Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalSpeedTest;
