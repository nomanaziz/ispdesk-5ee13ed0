import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Share2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function OltSharing() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedOlt, setSelectedOlt] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [filterOlt, setFilterOlt] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");

  const { data: olts = [] } = useQuery({
    queryKey: ["olt-devices-select"],
    queryFn: async () => { const { data } = await supabase.from("olt_devices").select("id, name, ip_address"); return data || []; },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-list"],
    queryFn: async () => { const { data } = await supabase.from("branches").select("id, name"); return data || []; },
  });

  const { data: shares = [] } = useQuery({
    queryKey: ["olt-shares"],
    queryFn: async () => {
      const { data } = await supabase.from("olt_branch_shares")
        .select("*, olt_devices(name, ip_address), branches(name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("olt_branch_shares").insert({
        olt_id: selectedOlt, branch_id: selectedBranch, shared_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["olt-shares"] }); setOpen(false); toast.success("শেয়ার যোগ হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("olt_branch_shares").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["olt-shares"] }); toast.success("শেয়ার মুছে ফেলা হয়েছে"); },
  });

  const filtered = shares.filter((s: any) => {
    if (filterOlt !== "all" && s.olt_id !== filterOlt) return false;
    if (filterBranch !== "all" && s.branch_id !== filterBranch) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">OLT শেয়ারিং</h1>
          <p className="text-muted-foreground text-sm">ব্রাঞ্চ অনুযায়ী OLT অ্যাক্সেস শেয়ারিং</p>
        </div>
        <Button onClick={() => { setSelectedOlt(""); setSelectedBranch(""); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> শেয়ার যোগ করুন</Button>
      </div>

      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center"><Share2 className="h-6 w-6 text-blue-500" /></div>
          <div>
            <p className="text-sm text-muted-foreground">মোট শেয়ার</p>
            <p className="text-2xl font-bold text-foreground">{shares.length}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle>শেয়ার তালিকা</CardTitle>
          <div className="flex gap-2">
            <Select value={filterOlt} onValueChange={setFilterOlt}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">সকল OLT</SelectItem>{olts.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">সকল ব্রাঞ্চ</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>OLT নাম</TableHead>
                  <TableHead>OLT IP</TableHead>
                  <TableHead>শেয়ারকৃত ব্রাঞ্চ</TableHead>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">কোনো শেয়ার পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((s: any, i) => (
                  <TableRow key={s.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.olt_devices?.name || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{s.olt_devices?.ip_address || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{s.branches?.name || "—"}</Badge></TableCell>
                    <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString("bn-BD")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("মুছে ফেলতে চান?")) delMut.mutate(s.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>OLT শেয়ার যোগ করুন</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>OLT নির্বাচন করুন *</Label>
              <Select value={selectedOlt} onValueChange={setSelectedOlt}>
                <SelectTrigger><SelectValue placeholder="OLT বাছাই করুন" /></SelectTrigger>
                <SelectContent>{olts.map(o => <SelectItem key={o.id} value={o.id}>{o.name} ({o.ip_address})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>ব্রাঞ্চ নির্বাচন করুন *</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger><SelectValue placeholder="ব্রাঞ্চ বাছাই করুন" /></SelectTrigger>
                <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
            <Button onClick={() => addMut.mutate()} disabled={!selectedOlt || !selectedBranch || addMut.isPending}>
              {addMut.isPending ? "সেভ হচ্ছে..." : "শেয়ার করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
