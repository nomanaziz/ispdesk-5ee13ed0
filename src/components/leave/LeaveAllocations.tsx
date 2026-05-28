import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export default function LeaveAllocations() {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [running, setRunning] = useState(false);

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ["leave_balances", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_leave_balances")
        .select("id, allocated, used, carried_from_prev, employee_id, category_id, employees(full_name), leave_categories(name)")
        .eq("year", year);
      if (error) throw error;
      return data || [];
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      setRunning(true);
      const { error } = await supabase.rpc("recalculate_leave_balances", { _year: year });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${year} সালের বরাদ্দ তৈরি হয়েছে`);
      qc.invalidateQueries({ queryKey: ["leave_balances", year] });
    },
    onError: (e: any) => toast.error("ত্রুটি: " + e.message),
    onSettled: () => setRunning(false),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-sm font-medium">বছর</label>
            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28" />
          </div>
          <Button onClick={() => generate.mutate()} disabled={running}>
            <RefreshCw className="h-4 w-4 mr-1" />
            {running ? "তৈরি হচ্ছে..." : `${year} বছরের বরাদ্দ তৈরি`}
          </Button>
          <p className="text-xs text-muted-foreground ml-auto">
            সকল active কর্মচারীর জন্য active category অনুযায়ী allocation generate করবে।
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>কর্মচারী</TableHead>
                <TableHead>ক্যাটাগরি</TableHead>
                <TableHead className="text-right">বরাদ্দ</TableHead>
                <TableHead className="text-right">ব্যবহৃত</TableHead>
                <TableHead className="text-right">ক্যারি-ফরোয়ার্ড</TableHead>
                <TableHead className="text-right">অবশিষ্ট</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
              ) : balances.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">এই বছরের কোনো বরাদ্দ নেই — উপরে "{year} বছরের বরাদ্দ তৈরি" চাপুন</TableCell></TableRow>
              ) : (
                balances.map((b: any) => {
                  const remaining = Number(b.allocated) + Number(b.carried_from_prev) - Number(b.used);
                  return (
                    <TableRow key={b.id}>
                      <TableCell>{b.employees?.full_name || "—"}</TableCell>
                      <TableCell>{b.leave_categories?.name || "—"}</TableCell>
                      <TableCell className="text-right">{b.allocated}</TableCell>
                      <TableCell className="text-right">{b.used}</TableCell>
                      <TableCell className="text-right">{b.carried_from_prev}</TableCell>
                      <TableCell className="text-right font-semibold">{remaining}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
