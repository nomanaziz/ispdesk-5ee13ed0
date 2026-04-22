import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { usePopScope } from "@/hooks/usePopScope";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Send as SendIcon, MessageSquare, Users, Clock } from "lucide-react";
import VariableChips from "@/components/sms/VariableChips";

export default function PopSmsSend() {
  const { customer } = usePortalAuth();
  const { branchId } = usePopScope();
  const qc = useQueryClient();
  const [target, setTarget] = useState("all_clients");
  const [gatewayId, setGatewayId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [message, setMessage] = useState("");
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const sentBy = (customer as any)?.sub || null;

  const { data: gateways = [] } = useQuery({
    queryKey: ["pop_sms_gateways_send"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_gateways")
        .select("id, name, is_default")
        .eq("status", "active")
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["pop_sms_templates_effective", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_templates_effective")
        .select("master_id, name, content, is_active, branch_id")
        .eq("is_active", true)
        .or(`branch_id.eq.${branchId},branch_id.is.null`);
      if (error) throw error;
      return (data || []).map((t: any) => ({ id: t.master_id, name: t.name, content: t.content }));
    },
  });

  const { data: recipientCount = 0 } = useQuery({
    queryKey: ["pop_sms_recipient_count", target, branchId],
    enabled: !!branchId,
    queryFn: async () => {
      let q = supabase.from("clients").select("*", { count: "exact", head: true }).eq("branch_id", branchId);
      if (target === "paid_clients") q = q.eq("status", "active");
      else if (target === "unpaid_clients") q = q.eq("status", "expired");
      else if (target === "due_clients") q = q.in("status", ["due", "overdue"]);
      const { count } = await q;
      return count || 0;
    },
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["pop_sms_log_recent", sentBy],
    enabled: !!sentBy,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_log")
        .select("*, sms_gateways(name)")
        .eq("sent_by", sentBy)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!message) throw new Error("মেসেজ প্রয়োজন");
      if (!branchId) throw new Error("POP scope পাওয়া যায়নি");
      const { error } = await supabase.from("sms_log").insert({
        recipient: `pop:${branchId}:${target}`,
        message,
        gateway_id: gatewayId || null,
        template_id: templateId || null,
        sent_by: sentBy,
        sms_type: target,
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_count: recipientCount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "বাল্ক SMS পাঠানো হয়েছে", description: `${recipientCount} জনকে SMS পাঠানো হয়েছে` });
      setMessage("");
      qc.invalidateQueries({ queryKey: ["pop_sms_log_recent"] });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((t) => t.id === id);
    if (t) setMessage(t.content);
  };

  const targetLabel = (t: string) => {
    const map: Record<string, string> = { all_clients: "সকল ক্লায়েন্ট", paid_clients: "পেইড", unpaid_clients: "আনপেইড", due_clients: "বকেয়া" };
    return map[t] || t;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">এসএমএস পাঠান</h1>
        <p className="text-muted-foreground">আপনার POP-এর ক্লায়েন্টদের বাল্ক SMS পাঠান</p>
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
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>গেটওয়ে</Label>
                <Select value={gatewayId} onValueChange={setGatewayId}>
                  <SelectTrigger><SelectValue placeholder="গেটওয়ে নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {gateways.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name} {g.is_default && "⭐"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
            <div className="grid gap-2">
              <Label>মেসেজ *</Label>
              <Textarea ref={messageRef} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="আপনার মেসেজ লিখুন..." />
              <p className="text-xs text-muted-foreground">{message.length} অক্ষর</p>
              <VariableChips textareaRef={messageRef} value={message} onChange={setMessage} />
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
              ) : recentLogs.map((log: any) => (
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
