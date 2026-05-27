import { useState, useEffect } from "react";
import { useEmployeeContext } from "@/hooks/useEmployeeContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Trash2, Save, AlertCircle } from "lucide-react";

interface Props {
  table: "salary_advance_requests" | "loan_requests" | "resignation_requests";
  title: string;
  kind: "advance" | "loan" | "resignation";
}

const MIN_NOTICE_DAYS = 30;

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function MyRequestPage({ table, title, kind }: Props) {
  const qc = useQueryClient();
  const { employee } = useEmployeeContext();
  const [amount, setAmount] = useState("");
  const [tenure, setTenure] = useState("3");
  const [effDate, setEffDate] = useState("");
  const [reason, setReason] = useState("");

  const minResignDate = addDays(new Date(), MIN_NOTICE_DAYS);

  const { data } = useQuery({
    queryKey: ["my-req", table, employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data } = await supabase.from(table as any).select("*").eq("employee_id", employee!.id).order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  // For resignation: find current active (pending/approved) request
  const activeResignation = kind === "resignation"
    ? (data ?? []).find((r: any) => r.status === "pending" || r.status === "approved")
    : null;

  useEffect(() => {
    if (kind === "resignation" && activeResignation?.status === "pending") {
      setEffDate(activeResignation.effective_date || "");
      setReason(activeResignation.reason || "");
    }
  }, [activeResignation?.id]);

  const submit = useMutation({
    mutationFn: async () => {
      if (kind === "resignation" && effDate < minResignDate) {
        throw new Error(`কার্যকর তারিখ আজ থেকে ন্যূনতম ${MIN_NOTICE_DAYS} দিন পরে হতে হবে।`);
      }
      const payload: any = { employee_id: employee!.id, reason: reason || null, status: "pending" };
      if (kind === "advance") payload.amount = Number(amount || 0);
      if (kind === "loan") { payload.amount = Number(amount || 0); payload.tenure_months = Number(tenure || 1); }
      if (kind === "resignation") payload.effective_date = effDate;
      const { error } = await supabase.from(table as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("আবেদন জমা হয়েছে");
      setAmount(""); setTenure("3"); setEffDate(""); setReason("");
      qc.invalidateQueries({ queryKey: ["my-req", table] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!activeResignation) return;
      if (effDate < minResignDate) {
        throw new Error(`কার্যকর তারিখ আজ থেকে ন্যূনতম ${MIN_NOTICE_DAYS} দিন পরে হতে হবে।`);
      }
      const { error } = await supabase.from(table as any)
        .update({ effective_date: effDate, reason: reason || null })
        .eq("id", activeResignation.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("আবেদন আপডেট হয়েছে");
      qc.invalidateQueries({ queryKey: ["my-req", table] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("আবেদন বাতিল হয়েছে");
      qc.invalidateQueries({ queryKey: ["my-req", table] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!employee) return null;

  // ===== Resignation special UI =====
  if (kind === "resignation") {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                পদত্যাগের কার্যকর তারিখ আজ থেকে ন্যূনতম <strong>{MIN_NOTICE_DAYS} দিন</strong> পরে হতে হবে। এর কম সময়ে প্রয়োজন হলে admin-এর সাথে যোগাযোগ করুন। পদত্যাগপত্র একবারই জমা দেওয়া যায় — উপরে পেন্ডিং থাকলে এটাই update বা cancel করুন।
              </AlertDescription>
            </Alert>

            {activeResignation && activeResignation.status === "approved" ? (
              <Alert>
                <AlertDescription>
                  আপনার পদত্যাগপত্র <Badge>অনুমোদিত</Badge> হয়েছে। কার্যকর তারিখ: <strong>{activeResignation.effective_date}</strong>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>কার্যকর তারিখ</Label>
                  <Input
                    type="date"
                    min={minResignDate}
                    value={effDate}
                    onChange={(e) => setEffDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">সর্বনিম্ন: {minResignDate}</p>
                </div>
                <div className="md:col-span-2">
                  <Label>কারণ</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  {activeResignation ? (
                    <>
                      <Button onClick={() => update.mutate()} disabled={update.isPending} className="gap-2">
                        <Save className="h-4 w-4" /> আপডেট করুন
                      </Button>
                      <Button variant="destructive" onClick={() => cancel.mutate(activeResignation.id)} disabled={cancel.isPending} className="gap-2">
                        <Trash2 className="h-4 w-4" /> বাতিল করুন
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => submit.mutate()} disabled={submit.isPending}>আবেদন জমা দিন</Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">ইতিহাস</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>তারিখ</TableHead><TableHead>কার্যকর</TableHead>
                <TableHead>কারণ</TableHead><TableHead>স্ট্যাটাস</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(data ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("bn-BD")}</TableCell>
                    <TableCell>{r.effective_date}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate">{r.reason || "—"}</TableCell>
                    <TableCell><Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "outline"}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {(data ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">কোনো আবেদন নেই</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== Advance (and any legacy loan route) =====
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>পরিমাণ (৳)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          {kind === "loan" && (
            <div>
              <Label>মেয়াদ (মাস)</Label>
              <Input type="number" value={tenure} onChange={(e) => setTenure(e.target.value)} />
            </div>
          )}
          <div className="md:col-span-2">
            <Label>কারণ</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>আবেদন জমা দিন</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">আমার আবেদনের ইতিহাস</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>তারিখ</TableHead><TableHead>পরিমাণ</TableHead>
              {kind === "loan" && <TableHead>মেয়াদ</TableHead>}
              <TableHead>কারণ</TableHead><TableHead>স্ট্যাটাস</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(data ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("bn-BD")}</TableCell>
                  <TableCell>৳{Number(r.amount || 0).toLocaleString()}</TableCell>
                  {kind === "loan" && <TableCell>{r.tenure_months} মাস</TableCell>}
                  <TableCell className="text-xs max-w-xs truncate">{r.reason || "—"}</TableCell>
                  <TableCell><Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "outline"}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
              {(data ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">কোনো আবেদন নেই</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
