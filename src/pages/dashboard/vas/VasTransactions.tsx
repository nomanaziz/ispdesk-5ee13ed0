import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

export default function VasTransactions() {
  const [search, setSearch] = useState("");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["vas-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vas_transactions")
        .select("*, clients(name, client_id), vas_services(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = transactions.filter((t: any) =>
    (t.clients?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.vas_services?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
  const paidCount = transactions.filter((t: any) => t.status === "paid").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">VAS লেনদেন</h1>
        <p className="text-muted-foreground text-sm">VAS সার্ভিসের লেনদেন ইতিহাস</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">মোট লেনদেন</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{transactions.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">মোট পরিমাণ</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">৳{totalAmount.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">পেইড</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{paidCount}</p></CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="ক্লায়েন্ট / সার্ভিস খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>ক্লায়েন্ট</TableHead>
              <TableHead>সার্ভিস</TableHead>
              <TableHead>পরিমাণ (৳)</TableHead>
              <TableHead>তারিখ</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">কোনো লেনদেন পাওয়া যায়নি</TableCell></TableRow>
            ) : (
              filtered.map((t: any, i: number) => (
                <TableRow key={t.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{t.clients?.name || "—"}<br /><span className="text-xs text-muted-foreground">{t.clients?.client_id}</span></TableCell>
                  <TableCell><Badge variant="outline">{t.vas_services?.name || "—"}</Badge></TableCell>
                  <TableCell>{t.amount || 0}</TableCell>
                  <TableCell>{t.transaction_date ? format(new Date(t.transaction_date), "dd MMM yyyy", { locale: bn }) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "paid" ? "default" : t.status === "pending" ? "secondary" : "destructive"}>
                      {t.status === "paid" ? "পেইড" : t.status === "pending" ? "পেন্ডিং" : t.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
