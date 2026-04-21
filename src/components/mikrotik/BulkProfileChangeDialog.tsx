import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedClients: any[];
  onSuccess: () => void;
}

export function BulkProfileChangeDialog({ open, onOpenChange, selectedClients, onSuccess }: Props) {
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [newProfile, setNewProfile] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ username: string; ok: boolean; error?: string }[]>([]);

  // Group by server
  const serverGroups = useMemo(() => {
    const map = new Map<string, { mikrotik_id: string; server_name: string; users: any[] }>();
    for (const c of selectedClients) {
      if (!c.mikrotik_id) continue;
      const key = c.mikrotik_id;
      if (!map.has(key)) {
        map.set(key, {
          mikrotik_id: c.mikrotik_id,
          server_name: c.mikrotik_devices?.name || c.server_name || "Unknown",
          users: [],
        });
      }
      map.get(key)!.users.push(c);
    }
    return Array.from(map.values());
  }, [selectedClients]);

  const isMultiServer = serverGroups.length > 1;
  const activeServerId = selectedServerId || serverGroups[0]?.mikrotik_id || "";
  const activeGroup = serverGroups.find((g) => g.mikrotik_id === activeServerId);
  const activeUsers = activeGroup?.users || [];

  const currentProfiles = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of activeUsers) {
      const p = u.profile || "(none)";
      map.set(p, (map.get(p) || 0) + 1);
    }
    return Array.from(map.entries());
  }, [activeUsers]);

  const transferredCount = activeUsers.filter((u) => u.linked_client_id).length;

  const { data: profiles = [], isLoading: loadingProfiles, error: profileError } = useQuery({
    queryKey: ["mikrotik_profile_list", activeServerId],
    queryFn: async () => {
      if (!activeServerId) return [];
      const { data, error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
        body: { mikrotik_id: activeServerId, action: "list-profiles" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.profiles || []) as any[];
    },
    enabled: open && !!activeServerId,
  });

  const handleSubmit = async () => {
    if (!newProfile || !activeUsers.length) return;
    setRunning(true);
    setResults([]);
    setProgress(0);

    const out: typeof results = [];
    let done = 0;

    for (const u of activeUsers) {
      try {
        const { data, error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
          body: {
            mikrotik_id: u.mikrotik_id,
            username: u.name,
            client_id: u.linked_client_id || null,
            action: "update",
            profile: newProfile,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Update mikrotik_clients row
        await supabase.from("mikrotik_clients").update({ profile: newProfile }).eq("id", u.id);

        // If transferred to a real client, update clients.profile too
        if (u.linked_client_id) {
          await supabase.from("clients").update({ profile: newProfile }).eq("id", u.linked_client_id);
        }

        out.push({ username: u.name, ok: true });
      } catch (e: any) {
        out.push({ username: u.name, ok: false, error: e.message || "Unknown error" });
      }
      done++;
      setProgress(Math.round((done / activeUsers.length) * 100));
      setResults([...out]);
    }

    const okCount = out.filter((r) => r.ok).length;
    const failCount = out.length - okCount;
    if (failCount === 0) toast.success(`${okCount} জন সফল`);
    else toast.warning(`${okCount} জন সফল, ${failCount} জন ব্যর্থ`);

    setRunning(false);
    if (okCount > 0) onSuccess();
  };

  const reset = () => {
    setSelectedServerId("");
    setNewProfile("");
    setProgress(0);
    setResults([]);
    setRunning(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!running) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Profile Change</DialogTitle>
          <DialogDescription>
            নির্বাচিত MikroTik user-দের profile একসাথে পরিবর্তন করুন। MikroTik এবং DB উভয়েই update হবে।
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-md border p-3 text-sm space-y-1">
            <div>মোট নির্বাচিত: <b>{selectedClients.length}</b> জন</div>
            <div className="flex flex-wrap gap-2">
              {serverGroups.map((g) => (
                <Badge key={g.mikrotik_id} variant={g.mikrotik_id === activeServerId ? "default" : "outline"}>
                  {g.server_name}: {g.users.length}
                </Badge>
              ))}
            </div>
          </div>

          {isMultiServer && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                একাধিক server-এর user নির্বাচিত। একসাথে শুধু এক server-এর users handle করা যাবে — নিচ থেকে server বেছে নিন।
              </AlertDescription>
            </Alert>
          )}

          {isMultiServer && (
            <div>
              <label className="text-sm font-medium mb-1 block">Server নির্বাচন</label>
              <Select value={activeServerId} onValueChange={setSelectedServerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {serverGroups.map((g) => (
                    <SelectItem key={g.mikrotik_id} value={g.mikrotik_id}>
                      {g.server_name} ({g.users.length} জন)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Current profiles */}
          <div className="rounded-md border p-3 text-sm">
            <div className="font-medium mb-1">বর্তমান profile ({activeGroup?.server_name}):</div>
            <div className="flex flex-wrap gap-2">
              {currentProfiles.map(([p, n]) => (
                <Badge key={p} variant="secondary">{p}: {n}</Badge>
              ))}
            </div>
          </div>

          {transferredCount > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {transferredCount} জন user ইতিমধ্যে client list-এ transferred — তাদের `clients.profile`-ও update হবে।
              </AlertDescription>
            </Alert>
          )}

          {/* New profile selector */}
          <div>
            <label className="text-sm font-medium mb-1 block">নতুন Profile</label>
            {loadingProfiles ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Profile list লোড হচ্ছে...
              </div>
            ) : profileError ? (
              <Alert variant="destructive">
                <AlertDescription>Profile load ব্যর্থ: {(profileError as any).message}</AlertDescription>
              </Alert>
            ) : (
              <Select value={newProfile} onValueChange={setNewProfile} disabled={running}>
                <SelectTrigger><SelectValue placeholder="Profile বেছে নিন" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p: any) => (
                    <SelectItem key={p[".id"] || p.name} value={p.name}>
                      {p.name}{p["rate-limit"] ? ` — ${p["rate-limit"]}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Progress */}
          {(running || results.length > 0) && (
            <div className="space-y-2">
              <Progress value={progress} />
              <div className="text-xs text-muted-foreground">
                {results.filter((r) => r.ok).length} সফল / {results.filter((r) => !r.ok).length} ব্যর্থ / {activeUsers.length} মোট
              </div>
              {results.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-md border text-xs">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1 border-b last:border-0">
                      {r.ok ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-destructive" />}
                      <span className="font-mono">{r.username}</span>
                      {r.error && <span className="text-destructive">— {r.error}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>বাতিল</Button>
          <Button onClick={handleSubmit} disabled={!newProfile || running || activeUsers.length === 0}>
            {running ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> চলছে...</> : `পরিবর্তন করুন (${activeUsers.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
