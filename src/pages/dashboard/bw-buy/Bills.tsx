import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Trash2, Edit, Eye, Receipt, DollarSign, CreditCard, TrendingDown, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Bills() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: bills, isLoading } = useQuery({
    queryKey: ["bw_purchase_bills"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bw_purchase_bills").select("*, bw_providers(name, contact)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: providers } = useQuery({
    queryKey: ["bw_providers_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bw_providers").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bw_purchase_bills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bw_purchase_bills"] });
      toast.success("সফলভাবে মুছে ফেলা হয়েছে");
      setDeleteDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (bills || [])
    .filter((b: any) => statusFilter === "all" || b.status === statusFilter)
    .filter((b: any) => providerFilter === "all" || b.provider_id === providerFilter)
    .filter((b: any) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return b.bill_no.toLowerCase().includes(s) || (b.invoice_no || "").toLowerCase().includes(s) || (b.bw_providers?.name || "").toLowerCase().includes(s);
    });

  const totalAmount = (bills || []).reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
  const totalPaid = (bills || []).reduce((s: number, b: any) => s + Number(b.paid || 0), 0);
  const totalDiscount = (bills || []).reduce((s: number, b: any) => s + Number(b.discount || 0), 0);
  const totalDue = totalAmount - totalPaid - totalDiscount;

  const paidCount = (bills || []).filter((b: any) => b.status === "paid").length;
  const dueCount = (bills || []).filter((b: any) => b.status === "due" || b.status === "partial").length;
  const unpaidCount = (bills || []).filter((b: any) => b.status === "unpaid").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">পার্চেজ বিল</h1>
          <p className="text-sm text-muted-foreground">ব্যান্ডউইথ ক্রয় — বিল ম্যানেজমেন্ট</p>
        </div>
        <Button onClick={() => navigate("/dashboard/bw-buy/bills/new")} className="gap-2">
          <Plus className="h-4 w-4" /> নতুন বিল
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">মোট পার্চেজ</p>
                <p className="text-xl font-bold">৳{totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">মোট পরিশোধ</p>
                <p className="text-xl font-bold">৳{totalPaid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">মোট বকেয়া</p>
                <p className="text-xl font-bold">৳{totalDue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">মোট ডিসকাউন্ট</p>
                <p className="text-xl font-bold">৳{totalDiscount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Count badges */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="secondary" className="px-3 py-1.5 text-sm">মোট: {(bills || []).length}</Badge>
        <Badge className="bg-green-600 px-3 py-1.5 text-sm">পরিশোধিত: {paidCount}</Badge>
        <Badge className="bg-amber-600 px-3 py-1.5 text-sm">বকেয়া: {dueCount}</Badge>
        <Badge className="bg-red-600 px-3 py-1.5 text-sm">অপরিশোধিত: {unpaidCount}</Badge>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="বিল নম্বর, ইনভয়েস..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="স্ট্যাটাস" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
            <SelectItem value="paid">পরিশোধিত</SelectItem>
            <SelectItem value="due">বকেয়া</SelectItem>
            <SelectItem value="partial">আংশিক</SelectItem>
            <SelectItem value="unpaid">অপরিশোধিত</SelectItem>
          </SelectContent>
        </Select>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="প্রোভাইডার" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল প্রোভাইডার</SelectItem>
            {(providers || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Bill Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">SN</TableHead>
                    <TableHead>প্রোভাইডার</TableHead>
                    <TableHead>বিল নং</TableHead>
                    <TableHead>ইনভয়েস নং</TableHead>
                    <TableHead>মাস</TableHead>
                    <TableHead className="text-right">পরিমাণ</TableHead>
                    <TableHead className="text-right">পরিশোধ</TableHead>
                    <TableHead className="text-right">ডিসকাউন্ট</TableHead>
                    <TableHead className="text-right">বকেয়া</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">কোনো বিল পাওয়া যায়নি</TableCell></TableRow>
                  )}
                  {filtered.map((b: any, i: number) => {
                    const due = Number(b.amount || 0) - Number(b.paid || 0) - Number(b.discount || 0);
                    return (
                      <TableRow key={b.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{b.bw_providers?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{b.bw_providers?.contact || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{b.bill_no}</TableCell>
                        <TableCell>{b.invoice_no || "—"}</TableCell>
                        <TableCell>{b.month || b.billing_month || "—"}</TableCell>
                        <TableCell className="text-right font-medium">৳{Number(b.amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">৳{Number(b.paid || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">৳{Number(b.discount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">{due > 0 ? <span className="text-destructive">৳{due.toLocaleString()}</span> : "৳0"}</TableCell>
                        <TableCell>
                          <Badge variant={b.status === "paid" ? "default" : b.status === "partial" ? "secondary" : "destructive"}>
                            {b.status === "paid" ? "পরিশোধিত" : b.status === "partial" ? "আংশিক" : b.status === "due" ? "বকেয়া" : "অপরিশোধিত"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => navigate(`/dashboard/bw-buy/bills/${b.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => navigate(`/dashboard/bw-buy/bills/${b.id}/edit`)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setDeleteId(b.id); setDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>মুছে ফেলার নিশ্চিতকরণ</DialogTitle>
            <DialogDescription>আপনি কি নিশ্চিত? এই বিল এবং সংশ্লিষ্ট সকল আইটেম মুছে যাবে।</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>বাতিল</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "মুছে ফেলা হচ্ছে..." : "মুছে ফেলুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
