import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, PlayCircle, Save, ShieldOff, Download } from "lucide-react";

type Cfg = {
  enabled: boolean;
  grace_days: number;
  sms_enabled: boolean;
  template_key: string;
  dry_run: boolean;
  mode: "disable" | "block_profile";
  block_profile_name: string;
};

const DEFAULT_CFG: Cfg = {
  enabled: true,
  grace_days: 0,
  sms_enabled: false,
  template_key: "suspension_notice",
  dry_run: false,
  mode: "disable",
  block_profile_name: "block-profile",
};

type PopRow = {
  id: string;
  branch_id: string | null;
  name: string | null;
  pop_code: string | null;
  suspension_mode: string | null;
  block_profile_name: string | null;
};

type Device = { id: string; name: string };

export default function AutoSuspensionScheduler() {
  const [cfg, setCfg] = useState<Cfg>(DEFAULT_CFG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [suspendedCount, setSuspendedCount] = useState<number>(0);
  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [recent, setRecent] = useState<any[]>([]);

  // MikroTik profile fetch
  const [devices, setDevices] = useState<Device[]>([]);
  const [pickDevice, setPickDevice] = useState<string>("");
  const [profiles, setProfiles] = useState<string[]>([]);
  const [fetchingProfiles, setFetchingProfiles] = useState(false);

  // POP overrides
  const [pops, setPops] = useState<PopRow[]>([]);
  const [savingPop, setSavingPop] = useState<string | null>(null);

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

      const { count: bc } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .not("original_profile", "is", null);
      setBlockedCount(bc ?? 0);

      const { data: rec } = await supabase
        .from("clients")
        .select("id, full_name, username, mobile, expire_date, mikrotik_status, billing_status, profile, original_profile, updated_at")
        .or("mikrotik_status.eq.disabled,original_profile.not.is.null")
        .order("updated_at", { ascending: false })
        .limit(20);
      setRecent(rec ?? []);

      const { data: devs } = await supabase
        .from("mikrotik_devices")
        .select("id, name")
        .order("name");
      setDevices((devs as Device[]) ?? []);

      const { data: popRows } = await supabase
        .from("branch_managers")
        .select("id, branch_id, name, pop_code, suspension_mode, block_profile_name")
        .order("pop_code");
      setPops((popRows as PopRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

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
      const msg = `সম্পন্ন: ${data?.disabled ?? 0} disable, ${data?.blocked ?? 0} block-profile`;
      toast.success(msg);
      await loadAll();
    } catch (e: any) {
      toast.error(e.message ?? "চালাতে সমস্যা");
    } finally {
      setRunning(false);
    }
  }

  async function fetchProfiles() {
    if (!pickDevice) { toast.error("একটি MikroTik device সিলেক্ট করুন"); return; }
    setFetchingProfiles(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
        body: { mikrotik_id: pickDevice, action: "list-profiles" },
      });
      if (error) throw error;
      const names = (data?.profiles ?? []).map((p: any) => p?.name).filter(Boolean);
      setProfiles(names);
      toast.success(`${names.length} টি profile পাওয়া গেছে`);
    } catch (e: any) {
      toast.error(e.message ?? "Profile fetch ব্যর্থ");
    } finally {
      setFetchingProfiles(false);
    }
  }

  async function savePop(p: PopRow) {
    setSavingPop(p.id);
    try {
      const { error } = await supabase
        .from("branch_managers")
        .update({ suspension_mode: p.suspension_mode || "inherit", block_profile_name: p.block_profile_name || null })
        .eq("id", p.id);
      if (error) throw error;
      toast.success("POP override সংরক্ষিত");
    } catch (e: any) {
      toast.error(e.message ?? "সংরক্ষণে সমস্যা");
    } finally {
      setSavingPop(null);
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
              মেয়াদোত্তীর্ণ ক্লায়েন্ট auto disable বা block-profile করা হবে।
            </p>
          </div>
        </div>
        <Button onClick={runNow} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
          এখনই চালান
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">আজকের overdue (এখনো enabled)</p>
          <p className="text-3xl font-bold mt-1">{overdueCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">মোট disable</p>
          <p className="text-3xl font-bold mt-1">{suspendedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Block-profile-এ আছে</p>
          <p className="text-3xl font-bold mt-1">{blockedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">শিডিউল স্ট্যাটাস</p>
          <p className="text-xl font-semibold mt-1">
            {cfg.enabled ? <Badge>চালু</Badge> : <Badge variant="secondary">বন্ধ</Badge>}
            {cfg.dry_run && <Badge variant="outline" className="ml-2">Dry-run</Badge>}
            <Badge variant="outline" className="ml-2">{cfg.mode === "block_profile" ? "Block-Profile" : "Disable"}</Badge>
          </p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>গ্লোবাল সেটিংস</CardTitle></CardHeader>
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
              <p className="text-xs text-muted-foreground">সত্যিকারে কিছু না করে শুধু রিপোর্ট দেখাবে।</p>
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
              <Label>সাসপেনশন মোড</Label>
              <Select value={cfg.mode} onValueChange={(v) => setCfg({ ...cfg, mode: v as Cfg["mode"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="disable">Disable (MikroTik user disable)</SelectItem>
                  <SelectItem value="block_profile">Block Profile (profile change)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Block-profile মোডে user connect করতে পারবে কিন্তু internet পাবে না।
              </p>
            </div>
            <div>
              <Label>গ্রেস ডে (দিন)</Label>
              <Input
                type="number"
                min={0}
                value={cfg.grace_days}
                onChange={(e) => setCfg({ ...cfg, grace_days: parseInt(e.target.value || "0", 10) })}
              />
              <p className="text-xs text-muted-foreground mt-1">expire_date এর পরে এত দিন wait করে action নিবে।</p>
            </div>
          </div>

          {cfg.mode === "block_profile" && (
            <div className="rounded-md border p-3 space-y-3 bg-muted/40">
              <Label>Block Profile name</Label>
              <div className="flex gap-2">
                <Input
                  value={cfg.block_profile_name}
                  onChange={(e) => setCfg({ ...cfg, block_profile_name: e.target.value })}
                  placeholder="block-profile"
                  list="profile-list"
                />
              </div>
              {profiles.length > 0 && (
                <datalist id="profile-list">
                  {profiles.map((p) => <option key={p} value={p} />)}
                </datalist>
              )}
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">MikroTik থেকে profile fetch</Label>
                  <Select value={pickDevice} onValueChange={setPickDevice}>
                    <SelectTrigger><SelectValue placeholder="Device সিলেক্ট করুন" /></SelectTrigger>
                    <SelectContent>
                      {devices.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" onClick={fetchProfiles} disabled={fetchingProfiles}>
                  {fetchingProfiles ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  Profiles আনুন
                </Button>
              </div>
              {profiles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {profiles.length} টি profile পাওয়া গেছে — input box-এ type করে suggest থেকে select করুন।
                </p>
              )}
            </div>
          )}

          <div>
            <Label>SMS টেমপ্লেট key</Label>
            <Input
              value={cfg.template_key}
              onChange={(e) => setCfg({ ...cfg, template_key: e.target.value })}
              placeholder="suspension_notice"
            />
          </div>

          <Button onClick={saveCfg} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            সেটিংস সংরক্ষণ
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>POP / Reseller Override</CardTitle>
          <p className="text-sm text-muted-foreground">প্রতিটা POP চাইলে নিজের mode বেছে নিতে পারে। Inherit থাকলে global setting follow করবে।</p>
        </CardHeader>
        <CardContent>
          {pops.length === 0 ? (
            <p className="text-sm text-muted-foreground">কোনো POP নেই।</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>POP</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Block Profile name</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pops.map((p, idx) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.pop_code || "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={p.suspension_mode || "inherit"}
                        onValueChange={(v) => {
                          const copy = [...pops]; copy[idx] = { ...p, suspension_mode: v }; setPops(copy);
                        }}
                      >
                        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inherit">Inherit (global)</SelectItem>
                          <SelectItem value="disable">Disable</SelectItem>
                          <SelectItem value="block_profile">Block Profile</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={p.block_profile_name || ""}
                        placeholder={cfg.block_profile_name}
                        disabled={p.suspension_mode !== "block_profile"}
                        onChange={(e) => {
                          const copy = [...pops]; copy[idx] = { ...p, block_profile_name: e.target.value }; setPops(copy);
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => savePop(p)} disabled={savingPop === p.id}>
                        {savingPop === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
        <CardHeader><CardTitle>সাম্প্রতিক সাসপেন্ডেড / Blocked ক্লায়েন্ট</CardTitle></CardHeader>
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
                  <TableHead>State</TableHead>
                  <TableHead>Current / Original profile</TableHead>
                  <TableHead>মেয়াদ শেষ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.full_name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.username}</TableCell>
                    <TableCell>{r.mobile}</TableCell>
                    <TableCell>
                      {r.original_profile
                        ? <Badge variant="outline">Block-profile</Badge>
                        : <Badge variant="secondary">Disabled</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.profile || "—"}{r.original_profile ? ` ← ${r.original_profile}` : ""}
                    </TableCell>
                    <TableCell>{r.expire_date}</TableCell>
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
