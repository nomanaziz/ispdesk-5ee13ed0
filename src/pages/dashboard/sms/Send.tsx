import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Send as SendIcon, MessageSquare, Users, Clock } from "lucide-react";

export default function SendSMS() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [target, setTarget] = useState("all_clients");
  const [groupId, setGroupId] = useState("");
  const [gatewayId, setGatewayId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [message, setMessage] = useState("");

  const { data: gateways = [] } = useQuery({
    queryKey: ["sms_gateways"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sms_gateways").select("*").eq("status", "active").order("is_default", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["sms_groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sms_groups").select("*").eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["sms_templates_effective_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_templates_effective")
        .select("master_id, name, content, is_active, branch_id")
        .eq("is_active", true)
        .is("branch_id", null);
      if (error) throw error;
      return (data || []).map((t: any) => ({ id: t.master_id, name: t.name, content: t.content }));
    },
  });

  const { data: recipientCount = 0 } = useQuery({
    queryKey: ["sms_recipient_count", target, groupId],
    queryFn: async () => {
      if (target === "group" && groupId) {
        const group = groups.find((g) => g.id === groupId);
        if (group?.group_type === "manual" && Array.isArray(group.members)) return (group.members as any[]).length;
        if (group?.group_type === "paid_clients") {
          const { count } = await supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active");
          return count || 0;
        }
        if (group?.group_type === "unpaid_clients") {
          const { count } = await supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "expired");
          return count || 0;
        }
        if (group?.group_type === "due_clients") {
          const { count } = await supabase.from("clients").select("*", { count: "exact", head: true }).in("status", ["due", "overdue"]);
          return count || 0;
        }
      }
      if (target === "paid_clients") {
        const { count } = await supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active");
        return count || 0;
      }
      if (target === "unpaid_clients") {
        const { count } = await supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "expired");
        return count || 0;
      }
      if (target === "due_clients") {
        const { count } = await supabase.from("clients").select("*", { count: "exact", head: true }).in("status", ["due", "overdue"]);
        return count || 0;
      }
      if (target === "all_clients") {
        const { count } = await supabase.from("clients").select("*", { count: "exact", head: true });
        return count || 0;
      }
      return 0;
    },
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["sms_log_recent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sms_log").select("*, sms_gateways(name)").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!message) throw new Error("মেসেজ প্রয়োজন");
      const recipientLabel = target === "group" ? `group:${groupId}` : target;
      const { error } = await supabase.from("sms_log").insert({
        recipient: recipientLabel,
        message,
        gateway_id: gatewayId || null,
        template_id: null,
        sent_by: user?.id || null,
        sms_type: target,
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_count: recipientCount,
        group_id: target === "group" ? groupId : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "বাল্ক SMS পাঠানো হয়েছে", description: `${recipientCount} জনকে SMS পাঠানো হয়েছে` });
      setMessage("");
      qc.invalidateQueries({ queryKey: ["sms_log_recent"] });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((t) => t.id === id);
    if (t) setMessage(t.content);
  };

  const targetLabel = (t: string) => {
    const map: Record<string, string> = { all_clients: "সকল ক্লায়েন্ট", paid_clients: "পেইড ক্লায়েন্ট", unpaid_clients: "আনপেইড ক্লায়েন্ট", due_clients: "বকেয়া ক্লায়েন্ট", group: "গ্রুপ" };
    return map[t] || t;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">এসএমএস পাঠান</h1>
        <p className="text-muted-foreground">গ্রুপ বা ফিল্টার করা ক্লায়েন্টদের বাল্ক SMS পাঠান</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />বাল্ক SMS</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>টার্গেট</Label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_clients">সকল ক্লায়েন্ট</SelectItem>
                    <SelectItem value="paid_clients">পেইড ক্লায়েন্ট</SelectItem>
                    <SelectItem value="unpaid_clients">আনপেইড ক্লায়েন্ট</SelectItem>
                    <SelectItem value="due_clients">বকেয়া ক্লায়েন্ট</SelectItem>
                    <SelectItem value="group">গ্রুপ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {target === "group" && (
                <div className="grid gap-2">
                  <Label>গ্রুপ নির্বাচন</Label>
                  <Select value={groupId} onValueChange={setGroupId}>
                    <SelectTrigger><SelectValue placeholder="গ্রুপ নির্বাচন করুন" /></SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>গেটওয়ে</Label>
                <Select value={gatewayId} onValueChange={setGatewayId}>
                  <SelectTrigger><SelectValue placeholder="গেটওয়ে নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {gateways.map((g) => <SelectItem key={g.id} value={g.id}>{g.name} {g.is_default && "⭐"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>টেমপ্লেট (ঐচ্ছিক)</Label>
                <Select value={templateId} onValueChange={applyTemplate}>
                  <SelectTrigger><SelectValue placeholder="টেমপ্লেট নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>মেসেজ *</Label>
              <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="আপনার মেসেজ লিখুন..." />
              <p className="text-xs text-muted-foreground">{message.length} অক্ষর</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">প্রাপক: <span className="text-primary">{recipientCount} জন</span></span>
              </div>
              <Button onClick={() => sendMutation.mutate()} disabled={!message || recipientCount === 0 || sendMutation.isPending}>
                <SendIcon className="h-4 w-4 mr-2" />{sendMutation.isPending ? "পাঠানো হচ্ছে..." : "SMS পাঠান"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />সাম্প্রতিক SMS</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">কোনো SMS লগ নেই</p>
              ) : recentLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-xs">{targetLabel(log.sms_type)}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString("bn-BD")}</span>
                  </div>
                  <p className="text-sm truncate">{log.message}</p>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>প্রাপক: {log.recipient_count} জন</span>
                    <Badge variant={log.status === "sent" ? "default" : "secondary"} className="text-xs">{log.status === "sent" ? "পাঠানো" : log.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
