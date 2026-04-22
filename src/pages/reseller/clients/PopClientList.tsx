import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { callPortal } from "@/lib/portalApi";

interface PopClientRow {
  id: string;
  name: string | null;
  username: string | null;
  mobile: string | null;
  address: string | null;
  monthly_bill: number | null;
  status: string | null;
  expire_date: string | null;
}

export default function PopClientList() {
  const { data, isLoading } = useQuery({
    queryKey: ["portal-pop-clients"],
    queryFn: async () => {
      const res = await callPortal<{ clients: PopClientRow[] }>("list_pop_clients");
      return res.clients || [];
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Active Clients</h1>
          <p className="text-sm text-muted-foreground">এই POP-এর সক্রিয় ক্লায়েন্ট তালিকা</p>
        </div>
        <Link to="/pop-admin/clients/add">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Add Client</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Active Clients
            {data && <Badge variant="secondary">{data.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (data || []).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">কোনো তথ্য পাওয়া যায়নি</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-border">
                <thead className="bg-primary/10">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold border-r border-border">PPP ID</th>
                    <th className="text-left px-3 py-2 font-semibold border-r border-border">Name</th>
                    <th className="text-left px-3 py-2 font-semibold border-r border-border">Mobile</th>
                    <th className="text-left px-3 py-2 font-semibold border-r border-border">Monthly Bill</th>
                    <th className="text-left px-3 py-2 font-semibold border-r border-border">Expire</th>
                    <th className="text-left px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data || []).map((row, i) => (
                    <tr key={row.id} className={i % 2 ? "bg-primary/5" : ""}>
                      <td className="px-3 py-2 border-r border-b border-border">{row.username ?? "—"}</td>
                      <td className="px-3 py-2 border-r border-b border-border">{row.name ?? "—"}</td>
                      <td className="px-3 py-2 border-r border-b border-border">{row.mobile ?? "—"}</td>
                      <td className="px-3 py-2 border-r border-b border-border">{row.monthly_bill ? `৳ ${Number(row.monthly_bill).toLocaleString()}` : "—"}</td>
                      <td className="px-3 py-2 border-r border-b border-border">{row.expire_date ?? "—"}</td>
                      <td className="px-3 py-2 border-b border-border"><Badge>{row.status ?? "—"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
