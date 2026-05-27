import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500 hover:bg-amber-600 text-white",
  approved: "bg-green-600 hover:bg-green-700 text-white",
  rejected: "bg-destructive text-destructive-foreground",
};

export default function ConveyanceBills() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("pending");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [reviewBill, setReviewBill] = useState<any>(null);
  const [remark, setRemark] = useState("");
  const [action, setAction] = useState<"approved" | "rejected">("approved");

  const { data: employees } = useQuery({
    queryKey: ["employees-min"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id,name,employee_id").eq("status", "active").order("name");
      return data || [];
    },
  });

  const { data: bills, isLoading } = useQuery({
    queryKey: ["conveyance-bills", status, employeeFilter, month],
    queryFn: async () => {
      let q: any = supabase
        .from("conveyance_bills" as any)
        .select("*, employees(name, employee_id)")
        .order("bill_date", { ascending: false });
      if (status !== "all") q = q.eq("status", status);
      if (employeeFilter !== "all") q = q.eq("employee_id", employeeFilter);
      if (month) {
        const start = `${month}-01`;
        const [y, m] = month.split("-").map(Number);
        const end = new Date(y, m, 0).toISOString().slice(0, 10);
        q = q.gte("bill_date", start).lte("bill_date", end);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const review = useMutation({
    mutationFn: async () => {
      if (!reviewBill) return;
      const { data: userData } = await supabase.auth.getUser();
      const updates: any = {
        status: action,
        review_remark: remark || null,
        reviewed_by: userData.user?.id,
        reviewed_at: new Date().toISOString(),
      };
      // If approved, also create an expense entry
      if (action === "approved") {
        const total = Number(reviewBill.fare_amount || 0) + Number(reviewBill.other_amount || 0);
        const { data: exp, error: expErr } = await supabase.from("expense_entries").insert({
          amount: total,
          expense_date: reviewBill.bill_date,
          category: "Conveyance",
          description: `Conveyance — ${reviewBill.employees?.name || "Employee"}: ${reviewBill.from_location} → ${reviewBill.to_location} (${reviewBill.transport_mode})`,
          reference: `CONV-${reviewBill.id.slice(0, 8)}`,
          status: "approved",
          month: reviewBill.bill_date.slice(0, 7),
        } as any).select("id").single();
        if (expErr) throw expErr;
        updates.expense_entry_id = exp?.id;
      }
      const { error } = await supabase.from("conveyance_bills" as any).update(updates).eq("id", reviewBill.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conveyance-bills"] });
      toast.success(action === "approved" ? "অনুমোদিত + খরচে যোগ হয়েছে" : "প্রত্যাখ্যান হয়েছে");
      setReviewBill(null);
      setRemark("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openReview(b: any, act: "approved" | "rejected") {
    setReviewBill(b);
    setAction(act);
    setRemark("");
  }

  const totalApproved = (bills || []).filter((b: any) => b.status === "approved")
    .reduce((s: number, b: any) => s + Number(b.fare_amount || 0) + Number(b.other_amount || 0), 0);
  const totalPending = (bills || []).filter((b: any) => b.status === "pending")
    .reduce((s: number, b: any) => s + Number(b.fare_amount || 0) + Number(b.other_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">কনভেয়েন্স বিল</h1>
        <p className="text-sm text-muted-foreground">কর্মীদের যাতায়াত খরচ verify ও approve করুন</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">মোট বিল</p><p className="text-xl font-bold">{(bills || []).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">অনুমোদিত</p><p className="text-xl font-bold text-green-600">৳{totalApproved.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">পেন্ডিং</p><p className="text-xl font-bold text-amber-600">৳{totalPending.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">মাস</p><p className="text-base font-semibold">{month}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-3">
          <CardTitle className="text-base flex-1">বিল তালিকা</CardTitle>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল কর্মী</SelectItem>
              {(employees || []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
        </CardHeader>
        <CardContent>
          {isLoading ? <p>লোড হচ্ছে...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>কর্মী</TableHead>
                  <TableHead>রুট</TableHead>
                  <TableHead>মোড</TableHead>
                  <TableHead className="text-right">ভাড়া</TableHead>
                  <TableHead className="text-right">অন্যান্য</TableHead>
                  <TableHead className="text-right">মোট</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead className="w-32">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(bills || []).map((b: any) => {
                  const total = Number(b.fare_amount || 0) + Number(b.other_amount || 0);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs">{b.bill_date}</TableCell>
                      <TableCell>{b.employees?.name}<div className="text-xs text-muted-foreground">{b.employees?.employee_id}</div></TableCell>
                      <TableCell className="text-xs">
                        {b.from_location} → {b.to_location}
                        {b.purpose && <div className="text-muted-foreground">{b.purpose}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{b.transport_mode}</TableCell>
                      <TableCell className="text-right">৳{Number(b.fare_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right">৳{Number(b.other_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">৳{total.toLocaleString()}</TableCell>
                      <TableCell><Badge className={STATUS_BADGE[b.status]}>{b.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {b.receipt_url && <Button variant="ghost" size="icon" asChild><a href={b.receipt_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>}
                          {b.status === "pending" && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => openReview(b, "approved")}><Check className="h-4 w-4 text-green-600" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => openReview(b, "rejected")}><X className="h-4 w-4 text-destructive" /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(bills || []).length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">কোনো বিল নেই</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reviewBill} onOpenChange={(o) => !o && setReviewBill(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === "approved" ? "অনুমোদন" : "প্রত্যাখ্যান"}</DialogTitle>
          </DialogHeader>
          {reviewBill && (
            <div className="space-y-2 text-sm">
              <p><strong>{reviewBill.employees?.name}</strong> — {reviewBill.bill_date}</p>
              <p>{reviewBill.from_location} → {reviewBill.to_location} ({reviewBill.transport_mode})</p>
              <p>মোট: ৳{(Number(reviewBill.fare_amount || 0) + Number(reviewBill.other_amount || 0)).toLocaleString()}</p>
              <div>
                <Label>মন্তব্য</Label>
                <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={3} />
              </div>
              {action === "approved" && <p className="text-xs text-muted-foreground">এই বিল accounts/expense এ যোগ হবে।</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewBill(null)}>বাতিল</Button>
            <Button onClick={() => review.mutate()} disabled={review.isPending} variant={action === "rejected" ? "destructive" : "default"}>
              {action === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
