import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

const TABS = [
  { key: "salary_advance_requests", label: "অগ্রিম বেতন", kind: "advance" as const },
  { key: "resignation_requests", label: "পদত্যাগ", kind: "resignation" as const },
  { key: "requisitions", label: "রিকুইজিশন", kind: "requisition" as const },
];

export default function EmployeeRequests() {
  const [tab, setTab] = useState(TABS[0].key);
  return (
    <Card>
      <CardHeader><CardTitle>কর্মী আবেদনসমূহ</CardTitle></CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>{TABS.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}</TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-4">
              <RequestList table={t.key as any} kind={t.kind} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function RequestList({ table, kind }: { table: string; kind: "advance" | "loan" | "resignation" | "requisition" }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["emp-req-admin", table],
    queryFn: async () => {
      const { data } = await supabase.from(table as any).select("*, employees(name, employee_id)").order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });
  const decide = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase.from(table as any).update({
        status: accept ? "approved" : "rejected", approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("সম্পন্ন"); qc.invalidateQueries({ queryKey: ["emp-req-admin", table] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Table>
      <TableHeader><TableRow>
        <TableHead>তারিখ</TableHead><TableHead>কর্মী</TableHead>
        {kind !== "resignation" && <TableHead>পরিমাণ</TableHead>}
        {kind === "loan" && <TableHead>মেয়াদ</TableHead>}
        {kind === "resignation" && <TableHead>কার্যকর</TableHead>}
        <TableHead>কারণ</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead className="w-32"></TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {(data ?? []).map((r: any) => (
          <TableRow key={r.id}>
            <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("bn-BD")}</TableCell>
            <TableCell>{r.employees?.name} <span className="text-xs text-muted-foreground">({r.employees?.employee_id})</span></TableCell>
            {kind !== "resignation" && <TableCell>৳{Number(r.amount || 0).toLocaleString()}</TableCell>}
            {kind === "loan" && <TableCell>{r.tenure_months} মাস</TableCell>}
            {kind === "resignation" && <TableCell>{r.effective_date}</TableCell>}
            <TableCell className="text-xs max-w-xs truncate">{r.reason || "—"}</TableCell>
            <TableCell><Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "outline"}>{r.status}</Badge></TableCell>
            <TableCell>
              {r.status === "pending" && (
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" onClick={() => decide.mutate({ id: r.id, accept: true })}><Check className="h-4 w-4 text-green-600" /></Button>
                  <Button size="icon" variant="outline" onClick={() => decide.mutate({ id: r.id, accept: false })}><X className="h-4 w-4 text-destructive" /></Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
        {(data ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4">কোনো আবেদন নেই</TableCell></TableRow>}
      </TableBody>
    </Table>
  );
}
