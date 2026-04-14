import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function TrialBalance() {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["chart-of-accounts-trial"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts").select("*").eq("status", "active").order("code");
      if (error) throw error;
      return data;
    },
  });

  const debitTypes = ["asset", "expense"];
  const items = (accounts ?? []).map(a => {
    const bal = Number(a.balance);
    const isDebit = debitTypes.includes(a.type);
    return { ...a, debit: isDebit ? bal : 0, credit: !isDebit ? bal : 0 };
  });

  const totalDebit = items.reduce((s, i) => s + i.debit, 0);
  const totalCredit = items.reduce((s, i) => s + i.credit, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">ট্রায়াল ব্যালেন্স</h1>
        <p className="text-muted-foreground text-sm">ডেবিট ও ক্রেডিট ব্যালেন্স সারসংক্ষেপ</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">মোট ডেবিট</p><p className="text-xl font-bold">৳{totalDebit.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">মোট ক্রেডিট</p><p className="text-xl font-bold">৳{totalCredit.toLocaleString()}</p></CardContent></Card>
      </div>

      {totalDebit !== totalCredit && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          ⚠️ ডেবিট ও ক্রেডিট সমান নয়! পার্থক্য: ৳{Math.abs(totalDebit - totalCredit).toLocaleString()}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">কোড</TableHead>
                <TableHead className="text-xs">অ্যাকাউন্ট</TableHead>
                <TableHead className="text-xs text-right">ডেবিট (৳)</TableHead>
                <TableHead className="text-xs text-right">ক্রেডিট (৳)</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                )) : items.filter(i => i.debit > 0 || i.credit > 0).length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">কোনো ব্যালেন্স নেই</TableCell></TableRow>
                ) : (
                  <>
                    {items.filter(i => i.debit > 0 || i.credit > 0).map(i => (
                      <TableRow key={i.id}>
                        <TableCell className="text-xs py-2 font-mono">{i.code}</TableCell>
                        <TableCell className="text-xs py-2">{i.name}</TableCell>
                        <TableCell className="text-xs py-2 text-right">{i.debit > 0 ? `৳${i.debit.toLocaleString()}` : "-"}</TableCell>
                        <TableCell className="text-xs py-2 text-right">{i.credit > 0 ? `৳${i.credit.toLocaleString()}` : "-"}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell colSpan={2} className="text-xs py-2">মোট</TableCell>
                      <TableCell className="text-xs py-2 text-right">৳{totalDebit.toLocaleString()}</TableCell>
                      <TableCell className="text-xs py-2 text-right">৳{totalCredit.toLocaleString()}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
