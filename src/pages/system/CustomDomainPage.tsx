import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMySubscription } from "@/hooks/useMySubscription";
import { Globe, Plus, RefreshCw, Trash2, Copy, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const TARGET = "edge.ispdesk.app";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    pending: { label: "অপেক্ষমাণ", cls: "bg-muted text-muted-foreground", icon: Clock },
    verifying: { label: "যাচাই হচ্ছে", cls: "bg-blue-500 text-white", icon: RefreshCw },
    verified: { label: "যাচাইকৃত", cls: "bg-emerald-500 text-white", icon: CheckCircle2 },
    active: { label: "সক্রিয়", cls: "bg-emerald-600 text-white", icon: CheckCircle2 },
    failed: { label: "ব্যর্থ", cls: "bg-destructive text-destructive-foreground", icon: AlertCircle },
  };
  const m = map[status] ?? map.pending;
  const Icon = m.icon;
  return <Badge className={m.cls}><Icon className="h-3 w-3 mr-1" />{m.label}</Badge>;
}

export default function CustomDomainPage() {
  const qc = useQueryClient();
  const { data: sub } = useMySubscription();
  const tenantId = sub?.customer?.id;

  const { data: domains, isLoading } = useQuery({
    queryKey: ["tenant-domains", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_domains" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const [open, setOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("কোনো সাবস্ক্রিপশন পাওয়া যায়নি");
      const clean = newDomain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
      const { error } = await supabase.from("tenant_domains" as any).insert({
        tenant_id: tenantId,
        domain: clean,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ডোমেইন যুক্ত হয়েছে");
      setOpen(false);
      setNewDomain("");
      qc.invalidateQueries({ queryKey: ["tenant-domains", tenantId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("verify-custom-domain", { body: { domainId: id } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) toast.success("ডোমেইন সফলভাবে যাচাই হয়েছে");
      else toast.error("যাচাই ব্যর্থ: " + (data?.errors?.join(", ") ?? "unknown"));
      qc.invalidateQueries({ queryKey: ["tenant-domains", tenantId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenant_domains" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ডোমেইন মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["tenant-domains", tenantId] });
    },
  });

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("কপি হয়েছে"); };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="h-6 w-6" /> কাস্টম ডোমেইন</h1>
          <p className="text-sm text-muted-foreground">আপনার নিজস্ব ডোমেইন দিয়ে প্যানেল অ্যাক্সেস করুন</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!tenantId}><Plus className="h-4 w-4 mr-2" /> নতুন ডোমেইন</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>ডোমেইন যুক্ত করুন</DialogTitle></DialogHeader>
            <Input placeholder="panel.example.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} />
            <DialogFooter>
              <Button onClick={() => addMutation.mutate()} disabled={!newDomain || addMutation.isPending}>
                যুক্ত করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!tenantId && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>সাবস্ক্রিপশন প্রয়োজন</AlertTitle>
          <AlertDescription>কাস্টম ডোমেইন যুক্ত করতে আপনার একটি সক্রিয় প্যানেল সাবস্ক্রিপশন থাকতে হবে।</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : domains && domains.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ডোমেইন</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>সর্বশেষ চেক</TableHead>
                  <TableHead className="text-right">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((d: any) => (
                  <>
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.domain}</TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.last_checked_at ? new Date(d.last_checked_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => verifyMutation.mutate(d.id)} disabled={verifyMutation.isPending}>
                          <RefreshCw className="h-3 w-3 mr-1" /> যাচাই
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(d.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {d.status !== "verified" && d.status !== "active" && (
                      <TableRow key={d.id + "-dns"}>
                        <TableCell colSpan={4} className="bg-muted/30">
                          <div className="space-y-2 text-sm">
                            <div className="font-medium">DNS রেকর্ড সেটআপ:</div>
                            <div className="grid gap-2 md:grid-cols-2">
                              <div className="border rounded-md p-3 bg-background">
                                <div className="text-xs text-muted-foreground">CNAME</div>
                                <div className="flex items-center justify-between gap-2">
                                  <code className="text-xs">{d.domain} → {TARGET}</code>
                                  <Button size="icon" variant="ghost" onClick={() => copy(TARGET)}><Copy className="h-3 w-3" /></Button>
                                </div>
                              </div>
                              <div className="border rounded-md p-3 bg-background">
                                <div className="text-xs text-muted-foreground">TXT (_lovable_verify.{d.domain})</div>
                                <div className="flex items-center justify-between gap-2">
                                  <code className="text-xs truncate">{d.verification_token}</code>
                                  <Button size="icon" variant="ghost" onClick={() => copy(d.verification_token)}><Copy className="h-3 w-3" /></Button>
                                </div>
                              </div>
                            </div>
                            {d.error_message && (
                              <div className="text-xs text-destructive">{d.error_message}</div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>কোনো কাস্টম ডোমেইন নেই</CardTitle>
            <CardDescription>"নতুন ডোমেইন" বাটন চাপুন এবং DNS রেকর্ড যুক্ত করুন</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
