import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function BalanceSheet() {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["chart-of-accounts-bs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts").select("*").eq("status", "active").order("code");
      if (error) throw error;
      return data;
    },
  });

  const assets = (accounts ?? []).filter(a => a.type === "asset");
  const liabilities = (accounts ?? []).filter(a => a.type === "liability");
  const equity = (accounts ?? []).filter(a => a.type === "equity");

  const totalAssets = assets.reduce((s, a) => s + Number(a.balance), 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + Number(a.balance), 0);
  const totalEquity = equity.reduce((s, a) => s + Number(a.balance), 0);

  const Section = ({ title, items, total, color }: { title: string; items: any[]; total: number; color: string }) => (
    <Card>
      <CardContent className="p-0">
        <div className={`p-3 border-b ${color}`}><h3 className="text-sm font-semibold">{title}</h3></div>
        <Table>
          <TableBody>
            {items.map(a => (
              <TableRow key={a.id}>
                <TableCell className="text-xs py-2 font-mono">{a.code}</TableCell>
                <TableCell className="text-xs py-2">{a.name}</TableCell>
                <TableCell className="text-xs py-2 text-right font-medium">৳{Number(a.balance).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold border-t-2">
              <TableCell colSpan={2} className="text-xs py-2">মোট {title}</TableCell>
              <TableCell className="text-xs py-2 text-right">৳{total.toLocaleString()}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">ব্যালেন্স শীট</h1>
        <p className="text-muted-foreground text-sm">সম্পদ, দায় ও মূলধন বিবরণী</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">মোট সম্পদ</p><p className="text-xl font-bold">৳{totalAssets.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">মোট দায়</p><p className="text-xl font-bold">৳{totalLiabilities.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">মোট মূলধন</p><p className="text-xl font-bold">৳{totalEquity.toLocaleString()}</p></CardContent></Card>
      </div>

      {isLoading ? <Skeleton className="h-40 w-full" /> : (
        <div className="space-y-4">
          <Section title="সম্পদ (Assets)" items={assets} total={totalAssets} color="bg-muted/50" />
          <Section title="দায় (Liabilities)" items={liabilities} total={totalLiabilities} color="bg-muted/50" />
          <Section title="মূলধন (Equity)" items={equity} total={totalEquity} color="bg-muted/50" />

          {totalAssets !== (totalLiabilities + totalEquity) && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              ⚠️ সম্পদ = দায় + মূলধন সমান নয়! পার্থক্য: ৳{Math.abs(totalAssets - totalLiabilities - totalEquity).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
