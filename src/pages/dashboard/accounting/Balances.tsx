import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function Balances() {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["chart-of-accounts-balances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts").select("*").eq("status", "active").order("code");
      if (error) throw error;
      return data;
    },
  });

  const grouped = (accounts ?? []).reduce((acc, a) => {
    if (!acc[a.type]) acc[a.type] = [];
    acc[a.type].push(a);
    return acc;
  }, {} as Record<string, typeof accounts>);

  const typeLabel: Record<string, string> = { asset: "সম্পদ", liability: "দায়", equity: "মূলধন", income: "আয়", expense: "ব্যয়" };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">অ্যাকাউন্ট ব্যালেন্স</h1>
        <p className="text-muted-foreground text-sm">সকল অ্যাকাউন্টের বর্তমান ব্যালেন্স</p>
      </div>

      {isLoading ? <Skeleton className="h-40 w-full" /> : Object.entries(grouped).map(([type, accts]) => {
        const total = (accts ?? []).reduce((s, a) => s + Number(a.balance), 0);
        return (
          <Card key={type}>
            <CardContent className="p-0">
              <div className="p-3 border-b bg-muted/50">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold">{typeLabel[type] || type}</h3>
                  <span className="text-sm font-bold">৳{total.toLocaleString()}</span>
                </div>
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">কোড</TableHead>
                  <TableHead className="text-xs">নাম</TableHead>
                  <TableHead className="text-xs text-right">ব্যালেন্স</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(accts ?? []).map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs py-2 font-mono">{a.code}</TableCell>
                      <TableCell className="text-xs py-2">{a.name}</TableCell>
                      <TableCell className="text-xs py-2 text-right font-medium">৳{Number(a.balance).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
