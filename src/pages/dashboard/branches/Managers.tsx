import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Managers() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [viewId, setViewId] = useState<string | null>(null);

  const { data: managers, isLoading } = useQuery({
    queryKey: ["branch-managers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_managers")
        .select("*, reseller_tariffs(name), branches(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branch_managers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-managers"] });
      toast.success("মুছে ফেলা হয়েছে");
    },
  });

  const selected = managers?.find((m) => m.id === viewId);

  // Fetch transactions for selected reseller
  const { data: payments } = useQuery({
    queryKey: ["reseller-pgw-payments", viewId],
    enabled: !!viewId,
    queryFn: async () => {
      const { data } = await supabase
        .from("reseller_pgw_payments")
        .select("*")
        .eq("reseller_id", viewId!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: fundings } = useQuery({
    queryKey: ["reseller-fundings-view", viewId],
    enabled: !!viewId,
    queryFn: async () => {
      if (!selected?.branch_id) return [];
      const { data } = await supabase
        .from("branch_funding")
        .select("*")
        .eq("branch_id", selected.branch_id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">POP ম্যানেজার লিস্ট</h1>
          <p className="text-sm text-muted-foreground">সকল POP ম্যানেজার দেখুন ও পরিচালনা করুন</p>
        </div>
        <Button onClick={() => navigate("/dashboard/branches/add-manager")}>+ POP যোগ করুন</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> POP তালিকা
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">লোড হচ্ছে...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>নাম</TableHead>
                    <TableHead>মোবাইল</TableHead>
                    <TableHead>কোড</TableHead>
                    <TableHead>ট্যারিফ</TableHead>
                    <TableHead>ব্যালেন্স (৳)</TableHead>
                    <TableHead>POP</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead>অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers?.map((m: any, i) => (
                    <TableRow key={m.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.contact || "-"}</TableCell>
                      <TableCell className="font-mono">{m.client_code || "-"}</TableCell>
                      <TableCell>{m.reseller_tariffs?.name || "-"}</TableCell>
                      <TableCell className="font-mono">৳{m.balance ?? 0}</TableCell>
                      <TableCell>{m.branches?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewId(m.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => del.mutate(m.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!managers || managers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        কোনো রিসেলার পাওয়া যায়নি
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={!!viewId} onOpenChange={(v) => !v && setViewId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>রিসেলার বিস্তারিত — {selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">ইমেইল:</span> {selected.email || "-"}</div>
                <div><span className="text-muted-foreground">মোবাইল:</span> {selected.contact || "-"}</div>
                <div><span className="text-muted-foreground">NID:</span> {selected.nid_number || "-"}</div>
                <div><span className="text-muted-foreground">ক্লায়েন্ট কোড:</span> {selected.client_code || "-"}</div>
                <div><span className="text-muted-foreground">ব্যালেন্স:</span> <strong>৳{selected.balance ?? 0}</strong></div>
                <div><span className="text-muted-foreground">মিনিমাম রিচার্জ:</span> ৳{selected.min_recharge ?? 0}</div>
              </div>

              {/* Recent PGW Payments */}
              <div>
                <h3 className="font-semibold mb-2">সাম্প্রতিক PGW পেমেন্ট</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>তারিখ</TableHead>
                        <TableHead>মোট</TableHead>
                        <TableHead>আমাদের শেয়ার</TableHead>
                        <TableHead>রিসেলার শেয়ার</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments?.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{new Date(p.created_at).toLocaleDateString("bn-BD")}</TableCell>
                          <TableCell>৳{p.total_amount}</TableCell>
                          <TableCell>৳{p.our_share}</TableCell>
                          <TableCell>৳{p.reseller_share}</TableCell>
                        </TableRow>
                      ))}
                      {(!payments || payments.length === 0) && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">কোনো পেমেন্ট নেই</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Funding History */}
              <div>
                <h3 className="font-semibold mb-2">ফান্ডিং হিস্ট্রি</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>তারিখ</TableHead>
                        <TableHead>পরিমাণ</TableHead>
                        <TableHead>টাইপ</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fundings?.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>{new Date(f.created_at).toLocaleDateString("bn-BD")}</TableCell>
                          <TableCell>৳{f.amount}</TableCell>
                          <TableCell>{f.type || "-"}</TableCell>
                          <TableCell><Badge variant="secondary">{f.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                      {(!fundings || fundings.length === 0) && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">কোনো ফান্ডিং নেই</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
