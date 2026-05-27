import { useState } from "react";
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
import { toast } from "sonner";

interface Props {
  table: "salary_advance_requests" | "loan_requests" | "resignation_requests";
  title: string;
  kind: "advance" | "loan" | "resignation";
}

export default function MyRequestPage({ table, title, kind }: Props) {
  const qc = useQueryClient();
  const { employee } = useEmployeeContext();
  const [amount, setAmount] = useState("");
  const [tenure, setTenure] = useState("3");
  const [effDate, setEffDate] = useState("");
  const [reason, setReason] = useState("");

  const { data } = useQuery({
    queryKey: ["my-req", table, employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data } = await supabase.from(table as any).select("*").eq("employee_id", employee!.id).order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
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

  if (!employee) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {kind !== "resignation" && (
            <div>
              <Label>পরিমাণ (৳)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          )}
          {kind === "loan" && (
            <div>
              <Label>মেয়াদ (মাস)</Label>
              <Input type="number" value={tenure} onChange={(e) => setTenure(e.target.value)} />
            </div>
          )}
          {kind === "resignation" && (
            <div>
              <Label>কার্যকর তারিখ</Label>
              <Input type="date" value={effDate} onChange={(e) => setEffDate(e.target.value)} />
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
              <TableHead>তারিখ</TableHead>
              {kind !== "resignation" && <TableHead>পরিমাণ</TableHead>}
              {kind === "loan" && <TableHead>মেয়াদ</TableHead>}
              {kind === "resignation" && <TableHead>কার্যকর</TableHead>}
              <TableHead>কারণ</TableHead><TableHead>স্ট্যাটাস</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(data ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("bn-BD")}</TableCell>
                  {kind !== "resignation" && <TableCell>৳{Number(r.amount || 0).toLocaleString()}</TableCell>}
                  {kind === "loan" && <TableCell>{r.tenure_months} মাস</TableCell>}
                  {kind === "resignation" && <TableCell>{r.effective_date}</TableCell>}
                  <TableCell className="text-xs max-w-xs truncate">{r.reason || "—"}</TableCell>
                  <TableCell><Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "outline"}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
              {(data ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">কোনো আবেদন নেই</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
