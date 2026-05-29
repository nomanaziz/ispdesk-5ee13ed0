import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, PlayCircle, Save, ShieldOff } from "lucide-react";

type Cfg = {
  enabled: boolean;
  grace_days: number;
  sms_enabled: boolean;
  template_key: string;
  dry_run: boolean;
};

const DEFAULT_CFG: Cfg = {
  enabled: true,
  grace_days: 0,
  sms_enabled: false,
  template_key: "suspension_notice",
  dry_run: false,
};

export default function AutoSuspensionScheduler() {
  const [cfg, setCfg] = useState<Cfg>(DEFAULT_CFG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [suspendedCount, setSuspendedCount] = useState<number>(0);
  const [recent, setRecent] = useState<any[]>([]);

  async function loadAll() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "auto_suspension")
        .maybeSingle();
      if (data?.setting_value) setCfg({ ...DEFAULT_CFG, ...(data.setting_value as any) });

      const today = new Date().toISOString().slice(0, 10);
      const { count: oc } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .lt("expire_date", today)
        .eq("mikrotik_status", "enabled");
      setOverdueCount(oc ?? 0);

      const { count: sc } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("mikrotik_status", "disabled");
      setSuspendedCount(sc ?? 0);

      const { data: rec } = await supabase
        .from("clients")
        .select("id, full_name, username, mobile, expire_date, mikrotik_status, updated_at")
        .eq("mikrotik_status", "disabled")
        .order("updated_at", { ascending: false })
        .limit(20);
      setRecent(rec ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function saveCfg() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({ setting_key: "auto_suspension", setting_value: cfg as any }, { onConflict: "setting_key" });
      if (error) throw error;
      toast.success("সেটিংস সংরক্ষিত হয়েছে");
    } catch (e: any) {
      toast.error(e.message ?? "সংরক্ষণে সমস্যা");
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    setRunning(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("enforce-expired-disable", { body: {} });
      if (error) throw error;
      setLastResult(data);
      toast.success(`সম্পন্ন: ${data?.disabled ?? 0} জন সাসপেন্ড`);
      await loadAll();
    } catch (e: any) {
      toast.error(e.message ?? "চালাতে সমস্যা");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldOff className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">অটো-সাসপেনশন শিডিউলার</h1>
            <p className="text-sm text-muted-foreground">
              মেয়াদোত্তীর্ণ ক্লায়েন্ট স্বয়ংক্রিয়ভাবে MikroTik-এ disable হবে ও SMS পাঠাবে।
            </p>
          </div>
        </div>
        <Button onClick={runNow} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
          এখনই চালান
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">আজকের overdue (এখনো enabled)</p>
          <p className="text-3xl font-bold mt-1">{overdueCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">মোট সাসপেন্ডেড</p>
          <p className="text-3xl font-bold mt-1">{suspendedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">শিডিউল স্ট্যাটাস</p>
          <p className="text-xl font-semibold mt-1">
            {cfg.enabled ? <Badge>চালু</Badge> : <Badge variant="secondary">বন্ধ</Badge>}
            {cfg.dry_run && <Badge variant="outline" className="ml-2">Dry-run</Badge>}
          </p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>সেটিংস</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>অটো-সাসপেনশন চালু</Label>
              <p className="text-xs text-muted-foreground">বন্ধ থাকলে শিডিউলার কিছু করবে না।</p>
            </div>
            <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Dry-run মোড</Label>
              <p className="text-xs text-muted-foreground">সত্যিকারে disable না করে শুধু রিপোর্ট দেখাবে।</p>
            </div>
            <Switch checked={cfg.dry_run} onCheckedChange={(v) => setCfg({ ...cfg, dry_run: v })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>SMS পাঠান</Label>
              <p className="text-xs text-muted-foreground">সাসপেন্ডের সময় ক্লায়েন্টকে notification পাঠাবে।</p>
            </div>
            <Switch checked={cfg.sms_enabled} onCheckedChange={(v) => setCfg({ ...cfg, sms_enabled: v })} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>গ্রেস ডে (দিন)</Label>
              <Input
                type="number"
                min={0}
                value={cfg.grace_days}
                onChange={(e) => setCfg({ ...cfg, grace_days: parseInt(e.target.value || "0", 10) })}
              />
              <p className="text-xs text-muted-foreground mt-1">expire_date এর পরে এত দিন wait করে সাসপেন্ড করবে।</p>
            </div>
            <div>
              <Label>SMS টেমপ্লেট key</Label>
              <Input
                value={cfg.template_key}
                onChange={(e) => setCfg({ ...cfg, template_key: e.target.value })}
                placeholder="suspension_notice"
              />
              <p className="text-xs text-muted-foreground mt-1">নোটিফিকেশন টেমপ্লেট পেজে এই key দিয়ে template বানান।</p>
            </div>
          </div>

          <Button onClick={saveCfg} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            সেটিংস সংরক্ষণ
          </Button>
        </CardContent>
      </Card>

      {lastResult && (
        <Card>
          <CardHeader><CardTitle>সর্বশেষ Run রিপোর্ট</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{JSON.stringify(lastResult, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>সাম্প্রতিক সাসপেন্ডেড ক্লায়েন্ট</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">কোনো সাসপেন্ডেড ক্লায়েন্ট নেই।</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>নাম</TableHead>
                  <TableHead>ইউজারনেম</TableHead>
                  <TableHead>মোবাইল</TableHead>
                  <TableHead>মেয়াদ শেষ</TableHead>
                  <TableHead>সর্বশেষ আপডেট</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.full_name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.username}</TableCell>
                    <TableCell>{r.mobile}</TableCell>
                    <TableCell>{r.expire_date}</TableCell>
                    <TableCell className="text-xs">{r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
