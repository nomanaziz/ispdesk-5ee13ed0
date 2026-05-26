import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Props {
  employee: any | null;
  onClose: () => void;
}

export default function EmployeePayheadsDialog({ employee, onClose }: Props) {
  const tplId = employee?.payroll_template_id;

  const { data: lines } = useQuery({
    queryKey: ["emp-payheads", employee?.id, tplId],
    enabled: !!employee && !!tplId,
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_template_payheads")
        .select("*, payheads(name, type)")
        .eq("template_id", tplId);
      return data || [];
    },
  });

  const basic = Number(employee?.salary || 0);

  return (
    <Dialog open={!!employee} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {employee?.name} ({employee?.employee_id}) — PayHeads
          </DialogTitle>
        </DialogHeader>

        {!tplId ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            এই কর্মীকে কোনো payroll template assign করা নেই।
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-sm bg-muted/40 p-3 rounded">
              <div><span className="text-muted-foreground">মূল বেতন: </span><strong>৳{basic.toLocaleString()}</strong></div>
              <div><span className="text-muted-foreground">ডিপার্টমেন্ট: </span>{employee?.departments?.name || "—"}</div>
              <div><span className="text-muted-foreground">পদবী: </span>{employee?.positions?.name || "—"}</div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PayHead</TableHead>
                  <TableHead>ধরন</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">পরিমাণ</TableHead>
                  <TableHead className="text-right">প্রযোজ্য</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(lines || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      কোনো payhead assign করা নেই
                    </TableCell>
                  </TableRow>
                )}
                {(lines || []).map((r: any) => {
                  const isPct = r.amount_type === "percentage";
                  const applied = isPct ? (basic * Number(r.amount_value || 0)) / 100 : Number(r.amount_value || 0);
                  const isDed = r.payheads?.type === "deduction";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.payheads?.name}</TableCell>
                      <TableCell>
                        <Badge variant={isDed ? "destructive" : "default"}>{isDed ? "কর্তন" : "ভাতা"}</Badge>
                      </TableCell>
                      <TableCell>{isPct ? "শতাংশ" : "টাকা"}</TableCell>
                      <TableCell className="text-right">{isPct ? `${r.amount_value}%` : `৳${Number(r.amount_value).toLocaleString()}`}</TableCell>
                      <TableCell className={`text-right font-semibold ${isDed ? "text-destructive" : "text-green-600"}`}>
                        ৳{applied.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
