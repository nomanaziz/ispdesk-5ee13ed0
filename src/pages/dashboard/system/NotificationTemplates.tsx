import { useEffect, useState } from "react";
import { Mail, Plus, Edit, Trash2, Save, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { NOTIF_CATEGORIES, sendNotification, type NotifChannel } from "@/lib/notifications";

interface Template {
  id?: string;
  tenant_id: string;
  name: string;
  category: string;
  channel: NotifChannel;
  subject?: string | null;
  body: string;
  variables: string[];
  enabled: boolean;
}

const blank = (tenant_id: string): Template => ({
  tenant_id, name: "", category: "bill_reminder", channel: "sms", subject: "", body: "", variables: [], enabled: true,
});

export default function NotificationTemplates() {
  const { tenantId } = useTenant();
  const [rows, setRows] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase.from("notification_templates").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setRows((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [tenantId]);

  const save = async () => {
    if (!editing || !tenantId) return;
    const payload = { ...editing, tenant_id: tenantId };
    const { error } = editing.id
      ? await supabase.from("notification_templates").update(payload).eq("id", editing.id)
      : await supabase.from("notification_templates").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("সংরক্ষিত");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("notification_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("মুছে ফেলা হয়েছে");
    load();
  };

  const test = async () => {
    if (!editing?.id || !testTo) return;
    setTesting(true);
    try {
      await sendNotification({
        tenant_id: tenantId!, channel: editing.channel, recipient: testTo, template_id: editing.id,
        variables: { client_name: "টেস্ট গ্রাহক", amount: "১২৩৪", due_date: "৩১/১২/২০২৬" },
      });
      toast.success("টেস্ট পাঠানো হয়েছে");
    } catch (e: any) { toast.error(e.message); }
    setTesting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Mail className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">টেমপ্লেট</h1>
            <p className="text-xs text-muted-foreground">সিস্টেম &gt; নোটিফিকেশন &gt; টেমপ্লেট</p>
          </div>
        </div>
        <Button onClick={() => setEditing(blank(tenantId || ""))}><Plus className="h-4 w-4 mr-1" /> নতুন টেমপ্লেট</Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow><TableHead>নাম</TableHead><TableHead>ক্যাটাগরি</TableHead><TableHead>চ্যানেল</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead className="text-right">অ্যাকশন</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">কোনো টেমপ্লেট নেই</TableCell></TableRow>
              : rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{NOTIF_CATEGORIES.find(c => c.value === r.category)?.label || r.category}</TableCell>
                  <TableCell><Badge variant="outline">{r.channel.toUpperCase()}</Badge></TableCell>
                  <TableCell>{r.enabled ? <Badge>সক্রিয়</Badge> : <Badge variant="secondary">বন্ধ</Badge>}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(r.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "এডিট" : "নতুন"} টেমপ্লেট</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">নাম</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
                <div>
                  <Label className="text-xs">ক্যাটাগরি</Label>
                  <Select value={editing.category} onValueChange={v => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{NOTIF_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">চ্যানেল</Label>
                  <Select value={editing.channel} onValueChange={v => setEditing({ ...editing, channel: v as NotifChannel })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Switch checked={editing.enabled} onCheckedChange={v => setEditing({ ...editing, enabled: v })} />
                  <Label>সক্রিয়</Label>
                </div>
              </div>
              {editing.channel === "email" && (
                <div><Label className="text-xs">Subject</Label><Input value={editing.subject || ""} onChange={e => setEditing({ ...editing, subject: e.target.value })} /></div>
              )}
              <div>
                <Label className="text-xs">বডি (variables: <code>{"{{client_name}} {{amount}} {{due_date}}"}</code>)</Label>
                <Textarea rows={6} value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })} placeholder="প্রিয় {{client_name}}, আপনার বিল ৳{{amount}} বকেয়া। শেষ তারিখ {{due_date}}।" />
              </div>
              {editing.id && (
                <div className="flex gap-2 p-3 border rounded-lg bg-muted/30">
                  <Input placeholder="টেস্ট recipient (phone/email)" value={testTo} onChange={e => setTestTo(e.target.value)} />
                  <Button onClick={test} disabled={testing || !testTo} variant="outline"><Send className="h-4 w-4 mr-1" /> টেস্ট</Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-1" /> বাতিল</Button>
            <Button onClick={save}><Save className="h-4 w-4 mr-1" /> সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
