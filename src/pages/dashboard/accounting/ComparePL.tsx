import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function ComparePL() {
  const [month1, setMonth1] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); });
  const [month2, setMonth2] = useState(new Date().toISOString().slice(0, 7));

  const getRange = (m: string) => {
    const start = `${m}-01`;
    const d = new Date(`${m}-01`); d.setMonth(d.getMonth() + 1);
    return { start, end: d.toISOString().slice(0, 10) };
  };

  const { data, isLoading } = useQuery({
    queryKey: ["compare-pl", month1, month2],
    queryFn: async () => {
      const r1 = getRange(month1), r2 = getRange(month2);
      const [i1, i2, e1, e2] = await Promise.all([
        supabase.from("income_entries").select("source, amount").gte("income_date", r1.start).lt("income_date", r1.end),
        supabase.from("income_entries").select("source, amount").gte("income_date", r2.start).lt("income_date", r2.end),
        supabase.from("expense_entries").select("category, amount").gte("expense_date", r1.start).lt("expense_date", r1.end),
        supabase.from("expense_entries").select("category, amount").gte("expense_date", r2.start).lt("expense_date", r2.end),
      ]);
      return {
        income1: (i1.data ?? []).reduce((s, e) => s + Number(e.amount), 0),
        income2: (i2.data ?? []).reduce((s, e) => s + Number(e.amount), 0),
        expense1: (e1.data ?? []).reduce((s, e) => s + Number(e.amount), 0),
        expense2: (e2.data ?? []).reduce((s, e) => s + Number(e.amount), 0),
      };
    },
  });

  const profit1 = (data?.income1 ?? 0) - (data?.expense1 ?? 0);
  const profit2 = (data?.income2 ?? 0) - (data?.expense2 ?? 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">লাভ-ক্ষতি তুলনা</h1>
        <p className="text-muted-foreground text-sm">দুই মাসের তুলনামূলক বিশ্লেষণ</p>
      </div>

      <div className="flex gap-3">
        <div>
          <label className="text-xs font-medium">মাস ১</label>
          <Input type="month" value={month1} onChange={e => setMonth1(e.target.value)} className="w-[180px]" />
        </div>
        <div>
          <label className="text-xs font-medium">মাস ২</label>
          <Input type="month" value={month2} onChange={e => setMonth2(e.target.value)} className="w-[180px]" />
        </div>
      </div>

      {isLoading ? <Skeleton className="h-40 w-full" /> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">বিবরণ</TableHead>
                  <TableHead className="text-xs text-right">{month1}</TableHead>
                  <TableHead className="text-xs text-right">{month2}</TableHead>
                  <TableHead className="text-xs text-right">পার্থক্য</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-xs py-3 font-medium">মোট আয়</TableCell>
                  <TableCell className="text-xs py-3 text-right">৳{(data?.income1 ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-xs py-3 text-right">৳{(data?.income2 ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-xs py-3 text-right font-medium">
                    ৳{((data?.income2 ?? 0) - (data?.income1 ?? 0)).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs py-3 font-medium">মোট ব্যয়</TableCell>
                  <TableCell className="text-xs py-3 text-right">৳{(data?.expense1 ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-xs py-3 text-right">৳{(data?.expense2 ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-xs py-3 text-right font-medium">
                    ৳{((data?.expense2 ?? 0) - (data?.expense1 ?? 0)).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow className="font-bold border-t-2">
                  <TableCell className="text-xs py-3">নিট লাভ/ক্ষতি</TableCell>
                  <TableCell className={`text-xs py-3 text-right ${profit1 >= 0 ? "text-green-600" : "text-destructive"}`}>৳{profit1.toLocaleString()}</TableCell>
                  <TableCell className={`text-xs py-3 text-right ${profit2 >= 0 ? "text-green-600" : "text-destructive"}`}>৳{profit2.toLocaleString()}</TableCell>
                  <TableCell className={`text-xs py-3 text-right ${profit2 >= profit1 ? "text-green-600" : "text-destructive"}`}>৳{(profit2 - profit1).toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
