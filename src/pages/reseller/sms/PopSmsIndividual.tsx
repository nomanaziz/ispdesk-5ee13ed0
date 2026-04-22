import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { usePopScope } from "@/hooks/usePopScope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Send, Search, MessageSquare } from "lucide-react";
import VariableChips from "@/components/sms/VariableChips";

export default function PopSmsIndividual() {
  const { customer } = usePortalAuth();
  const { branchId } = usePopScope();
  const qc = useQueryClient();
  const sentBy = (customer as any)?.sub || null;

  const [number, setNumber] = useState("");
  const [message, setMessage] = useState("");
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [gatewayId, setGatewayId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [clientTab, setClientTab] = useState("all");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const { data: gateways = [] } = useQuery({
    queryKey: ["pop_sms_gateways_ind"],
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
    queryKey: ["pop_sms_templates_ind", branchId],
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

  const { data: clients = [] } = useQuery({
    queryKey: ["pop_sms_clients", clientTab, clientSearch, branchId],
    enabled: !!branchId,
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("id, client_id, name, contact, status, monthly_bill")
        .eq("branch_id", branchId)
        .order("name");
      if (clientTab === "paid") query = query.eq("status", "active");
      else if (clientTab === "unpaid") query = query.eq("status", "expired");
      else if (clientTab === "due") query = query.in("status", ["due", "overdue"]);
      if (clientSearch) {
        query = query.or(`name.ilike.%${clientSearch}%,contact.ilike.%${clientSearch}%,client_id.ilike.%${clientSearch}%`);
      }
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const recipients = selectedClients.length > 0
        ? clients.filter((c: any) => selectedClients.includes(c.id)).map((c: any) => c.contact).filter(Boolean)
        : number ? [number] : [];
      if (recipients.length === 0) throw new Error("প্রাপক নম্বর প্রয়োজন");
      if (!message) throw new Error("মেসেজ প্রয়োজন");

      const logs = recipients.map((r: string) => ({
        recipient: r,
        message,
        gateway_id: gatewayId || null,
        template_id: templateId || null,
        sent_by: sentBy,
        sms_type: "individual",
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_count: 1,
      }));

      const { error } = await supabase.from("sms_log").insert(logs);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "SMS পাঠানো হয়েছে", description: `${selectedClients.length || 1} জনকে SMS পাঠানো হয়েছে` });
      setNumber("");
      setMessage("");
      setSelectedClients([]);
      qc.invalidateQueries({ queryKey: ["pop_sms_log_recent"] });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const toggleClient = (id: string) => {
    setSelectedClients((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((t) => t.id === id);
    if (t) setMessage(t.content);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ইন্ডিভিজুয়াল / গ্রুপ এসএমএস</h1>
        <p className="text-muted-foreground">নির্দিষ্ট নম্বর বা ক্লায়েন্টে SMS পাঠান</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />মেসেজ তৈরি করুন</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>প্রাপক নম্বর (ম্যানুয়াল)</Label>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="01XXXXXXXXX" />
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
            {selectedClients.length > 0 && (
              <p className="text-sm font-medium text-primary">{selectedClients.length} জন ক্লায়েন্ট নির্বাচিত</p>
            )}
            <Button className="w-full" onClick={() => sendMutation.mutate()} disabled={(!number && selectedClients.length === 0) || !message || sendMutation.isPending}>
              <Send className="h-4 w-4 mr-2" />{sendMutation.isPending ? "পাঠানো হচ্ছে..." : "SMS পাঠান"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>ক্লায়েন্ট নির্বাচন করুন</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={clientTab} onValueChange={(v) => { setClientTab(v); setSelectedClients([]); }}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">সকল</TabsTrigger>
                <TabsTrigger value="paid" className="flex-1">পেইড</TabsTrigger>
                <TabsTrigger value="unpaid" className="flex-1">আনপেইড</TabsTrigger>
                <TabsTrigger value="due" className="flex-1">বকেয়া</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="ক্লায়েন্ট খুঁজুন..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>নাম</TableHead>
                    <TableHead>নম্বর</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4">কোনো ক্লায়েন্ট পাওয়া যায়নি</TableCell></TableRow>
                  ) : clients.map((c: any) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => toggleClient(c.id)}>
                      <TableCell><Checkbox checked={selectedClients.includes(c.id)} /></TableCell>
                      <TableCell className="text-xs">{c.client_id}</TableCell>
                      <TableCell className="font-medium text-sm">{c.name}</TableCell>
                      <TableCell className="text-sm">{c.contact}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
