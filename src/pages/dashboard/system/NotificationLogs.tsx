import { useEffect, useState } from "react";
import { ScrollText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

interface Log {
  id: string; channel: string; recipient: string; subject: string | null;
  status: string; provider: string | null; error: string | null;
  sent_at: string | null; created_at: string;
}

export default function NotificationLogs() {
  const { tenantId } = useTenant();
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    let q = supabase.from("notification_logs").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(500);
    if (filterStatus !== "all") q = q.eq("status", filterStatus);
    if (filterChannel !== "all") q = q.eq("channel", filterChannel);
    if (search) q = q.ilike("recipient", `%${search}%`);
    const { data } = await q;
    setRows((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [tenantId, filterStatus, filterChannel]);

  const badge = (s: string) => {
    const variant = s === "sent" || s === "delivered" ? "default" : s === "failed" ? "destructive" : "secondary";
    return <Badge variant={variant as any}>{s}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><ScrollText className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">নোটিফিকেশন লগ</h1>
            <p className="text-xs text-muted-foreground">সিস্টেম &gt; নোটিফিকেশন &gt; লগ</p>
          </div>
        </div>
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> রিফ্রেশ</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Recipient খুঁজুন" value={search} onChange={e => setSearch(e.target.value)} onBlur={load} className="max-w-xs" />
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব চ্যানেল</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>সময়</TableHead><TableHead>চ্যানেল</TableHead><TableHead>প্রাপক</TableHead>
              <TableHead>প্রোভাইডার</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead>ত্রুটি</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">কোনো লগ নেই</TableCell></TableRow>
              : rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("bn-BD")}</TableCell>
                  <TableCell><Badge variant="outline">{r.channel}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.recipient}</TableCell>
                  <TableCell className="text-xs">{r.provider || "-"}</TableCell>
                  <TableCell>{badge(r.status)}</TableCell>
                  <TableCell className="text-xs text-destructive max-w-xs truncate" title={r.error || ""}>{r.error || "-"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
