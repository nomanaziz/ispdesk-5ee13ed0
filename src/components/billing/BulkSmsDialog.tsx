import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedClients: any[];
}

export default function BulkSmsDialog({ open, onOpenChange, selectedClients }: Props) {
  const qc = useQueryClient();
  const [templateId, setTemplateId] = useState("");
  const [gatewayId, setGatewayId] = useState("");
  const [message, setMessage] = useState("");

  const { data: templates = [] } = useQuery({
    queryKey: ["sms-templates-active"],
    queryFn: async () => {
      const { data } = await supabase.from("sms_templates").select("id, name, content").eq("status", "active");
      return data || [];
    },
  });
  const { data: gateways = [] } = useQuery({
    queryKey: ["sms-gateways-active"],
    queryFn: async () => {
      const { data } = await supabase.from("sms_gateways").select("id, name, is_default").eq("status", "active");
      return data || [];
    },
  });

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!message.trim()) throw new Error("মেসেজ লিখুন");
      const recipients = selectedClients.filter((c) => c.contact).map((c) => c.contact);
      if (recipients.length === 0) throw new Error("কোনো বৈধ মোবাইল নম্বর নেই");

      const { error } = await supabase.from("sms_log").insert({
        recipient: recipients.join(","),
        message,
        gateway_id: gatewayId || null,
        template_id: templateId || null,
        sms_type: "bulk_clients",
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_count: recipients.length,
      });
      if (error) throw error;
      return recipients.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} জনকে SMS পাঠানো হয়েছে`);
      qc.invalidateQueries({ queryKey: ["sms_log_recent"] });
      onOpenChange(false);
      setMessage("");
      setTemplateId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x: any) => x.id === id);
    if (t) setMessage((t as any).content);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>বাল্ক SMS পাঠান ({selectedClients.length} জন)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>গেটওয়ে</Label>
            <Select value={gatewayId} onValueChange={setGatewayId}>
              <SelectTrigger><SelectValue placeholder="গেটওয়ে নির্বাচন" /></SelectTrigger>
              <SelectContent>
                {gateways.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}{g.is_default ? " ⭐" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>টেমপ্লেট (ঐচ্ছিক)</Label>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger><SelectValue placeholder="টেমপ্লেট নির্বাচন" /></SelectTrigger>
              <SelectContent>
                {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>মেসেজ *</Label>
            <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="আপনার মেসেজ লিখুন..." />
            <p className="text-xs text-muted-foreground mt-1">{message.length} অক্ষর</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={() => sendMut.mutate()} disabled={sendMut.isPending}>
            {sendMut.isPending ? "পাঠানো হচ্ছে..." : "পাঠান"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
