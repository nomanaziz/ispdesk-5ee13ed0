import { Link } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useQuery } from "@tanstack/react-query";
import { callPortal } from "@/lib/portalApi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Calendar, Hash, FileText, CreditCard } from "lucide-react";

const statusBadge = (s: string) => {
  if (s === "paid") return "bg-emerald-100 text-emerald-700";
  if (s === "partial") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
};

const PortalBills = () => {
  const { customer } = usePortalAuth();

  const { data: bills, isLoading } = useQuery({
    queryKey: ["portal-bills", customer?.sub],
    queryFn: async () => {
      const res = await callPortal<any>("get_bills");
      return (res.bills || []) as any[];
    },
    enabled: !!customer?.sub && customer?.type === "client",
  });

  const totalAmount = (bills || []).reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalPaid = (bills || []).reduce((s, b) => s + Number(b.paid || 0), 0);
  const totalDue = (bills || []).reduce((s, b) => s + Number(b.due || 0), 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow">
          <Receipt className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">মাসিক বিল</h1>
          <p className="text-sm text-muted-foreground">আপনার সকল মাসিক বিল ও পেমেন্ট</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">মোট বিল</div>
            <div className="text-lg font-bold">৳{totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">পরিশোধিত</div>
            <div className="text-lg font-bold text-emerald-600">৳{totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">বকেয়া</div>
            <div className="text-lg font-bold text-rose-600">৳{totalDue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card className="border-0 shadow-sm"><CardContent className="p-10 text-center text-muted-foreground">লোড হচ্ছে...</CardContent></Card>
      ) : (bills || []).length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="p-10 text-center text-muted-foreground">কোনো বিল পাওয়া যায়নি</CardContent></Card>
      ) : (
        <div className="space-y-2.5">
          {bills!.map((b: any) => {
            const isDue = Number(b.due || 0) > 0;
            return (
              <Card key={b.id} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    <div className={`w-1.5 ${isDue ? "bg-rose-400" : "bg-emerald-400"}`} />
                    <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm flex items-center gap-1">
                            <Hash className="h-3 w-3 text-muted-foreground" />{b.bill_id}
                          </span>
                          <Badge className={`${statusBadge(b.status)} border-0 capitalize text-[10px]`}>
                            {b.status === "paid" ? "পরিশোধিত" : b.status === "partial" ? "আংশিক" : "বকেয়া"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{b.month}</span>
                          <span>পরিশোধিত: ৳{Number(b.paid || 0).toLocaleString()}</span>
                          {Number(b.discount || 0) > 0 && <span>ডিসকাউন্ট: ৳{Number(b.discount).toLocaleString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[10px] text-muted-foreground uppercase">পরিমাণ</div>
                          <div className="font-bold">৳{Number(b.amount || 0).toLocaleString()}</div>
                        </div>
                        {isDue && (
                          <div className="text-right">
                            <div className="text-[10px] text-muted-foreground uppercase">বকেয়া</div>
                            <div className="font-bold text-rose-600">৳{Number(b.due || 0).toLocaleString()}</div>
                          </div>
                        )}
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/portal/bills/${b.id}`}><FileText className="h-3.5 w-3.5" /> ইনভয়েস</Link>
                        </Button>
                        {isDue && (
                          <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600 shadow">
                            <CreditCard className="h-3.5 w-3.5" /> পরিশোধ
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PortalBills;
