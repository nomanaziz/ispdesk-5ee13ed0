import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, ArrowRightLeft, CheckCircle, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClients: any[];
}

export default function ServerMigrationDialog({ open, onOpenChange, selectedClients }: Props) {
  const [targetServerId, setTargetServerId] = useState("");
  const [validationResult, setValidationResult] = useState<null | { valid: boolean; missing: string[] }>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: servers = [] } = useQuery({
    queryKey: ["mikrotik-servers"],
    queryFn: async () => {
      const { data } = await supabase.from("mikrotik_devices").select("id, name, ip_address").eq("enabled", true);
      return data || [];
    },
  });

  const clientProfiles = [...new Set(selectedClients.map((c) => c.profile).filter(Boolean))];

  const handleValidate = async () => {
    if (!targetServerId) {
      toast({ title: "Target server সিলেক্ট করুন", variant: "destructive" });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
        body: {
          mikrotik_id: targetServerId,
          username: "__profile_check__",
          action: "list-profiles",
        },
      });

      if (error) throw error;

      const targetProfiles: string[] = (data.profiles || []).map((p: any) => p.name);
      const missing = clientProfiles.filter((p) => !targetProfiles.includes(p));

      setValidationResult({ valid: missing.length === 0, missing });
    } catch (err: any) {
      toast({ title: "Validation ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleMigrate = async () => {
    if (!validationResult?.valid) return;

    setIsMigrating(true);
    setMigrationLog([]);
    const logs: string[] = [];

    for (const client of selectedClients) {
      const clientName = `${client.client_id} (${client.name})`;

      try {
        // Step 1: Remove from source server
        if (client.mikrotik_id) {
          logs.push(`🔄 ${clientName}: Source server থেকে remove করা হচ্ছে...`);
          setMigrationLog([...logs]);

          await supabase.functions.invoke("manage-mikrotik-ppp", {
            body: {
              mikrotik_id: client.mikrotik_id,
              username: client.username,
              client_id: client.id,
              action: "remove",
            },
          });
        }

        // Step 2: Create on target server
        logs.push(`🔄 ${clientName}: Target server-এ create করা হচ্ছে...`);
        setMigrationLog([...logs]);

        await supabase.functions.invoke("create-mikrotik-ppp", {
          body: {
            mikrotik_id: targetServerId,
            username: client.username,
            password: client.password || "",
            profile: client.profile || "",
            remote_address: client.remote_address || "",
            disabled: client.mikrotik_status === "disabled" ? "yes" : "no",
          },
        });

        // Step 3: Update DB
        const targetServer = servers.find((s: any) => s.id === targetServerId);
        await supabase
          .from("clients")
          .update({
            mikrotik_id: targetServerId,
            server_name: targetServer?.name || "",
          })
          .eq("id", client.id);

        logs.push(`✅ ${clientName}: সফলভাবে migrate হয়েছে`);
        setMigrationLog([...logs]);
      } catch (err: any) {
        logs.push(`❌ ${clientName}: ব্যর্থ — ${err.message}`);
        setMigrationLog([...logs]);
      }
    }

    setIsMigrating(false);
    queryClient.invalidateQueries({ queryKey: ["billing-list"] });
    toast({ title: "Migration সম্পন্ন", description: `${selectedClients.length} জন ক্লায়েন্ট প্রসেস করা হয়েছে` });
  };

  const handleClose = () => {
    setTargetServerId("");
    setValidationResult(null);
    setMigrationLog([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Server Migration
          </DialogTitle>
          <DialogDescription>
            {selectedClients.length} জন ক্লায়েন্ট অন্য MikroTik server-এ transfer করুন
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Selected Profiles:</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {clientProfiles.length > 0 ? clientProfiles.map((p) => (
                <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
              )) : (
                <span className="text-xs text-muted-foreground">কোনো profile নেই</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Target Server</label>
            <Select value={targetServerId} onValueChange={(v) => { setTargetServerId(v); setValidationResult(null); }}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Server সিলেক্ট করুন" />
              </SelectTrigger>
              <SelectContent>
                {servers.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.ip_address})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {validationResult && !validationResult.valid && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-2">
                <AlertTriangle className="h-4 w-4" />
                Profile Mismatch!
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                নিচের profile গুলো target server-এ নেই:
              </p>
              <div className="flex flex-wrap gap-1">
                {validationResult.missing.map((p) => (
                  <Badge key={p} variant="destructive" className="text-xs">{p}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Target server-এ এই profile তৈরি করুন, তারপর আবার চেষ্টা করুন।
              </p>
            </div>
          )}

          {validationResult?.valid && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-2 text-emerald-500 font-medium text-sm">
                <CheckCircle className="h-4 w-4" />
                সব profile match করেছে! Transfer করতে পারবেন।
              </div>
            </div>
          )}

          {migrationLog.length > 0 && (
            <div className="max-h-40 overflow-y-auto p-2 rounded bg-muted text-xs font-mono space-y-0.5">
              {migrationLog.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isMigrating}>বাতিল</Button>
          {!validationResult?.valid ? (
            <Button onClick={handleValidate} disabled={isValidating || !targetServerId}>
              {isValidating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Validate Profiles
            </Button>
          ) : (
            <Button onClick={handleMigrate} disabled={isMigrating} className="bg-blue-600 hover:bg-blue-700">
              {isMigrating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Transfer Now
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
