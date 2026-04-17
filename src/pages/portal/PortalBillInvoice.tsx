import { useParams, Link } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Receipt } from "lucide-react";

const PortalBillInvoice = () => {
  const { id } = useParams();
  const { customer } = usePortalAuth();

  const { data: bill, isLoading } = useQuery({
    queryKey: ["portal-bill", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("billing")
        .select("*, clients(name, client_id, contact, address, email, monthly_bill)")
        .eq("id", id!)
        .eq("client_id", customer!.sub)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!customer?.sub,
  });

  const { data: company } = useQuery({
    queryKey: ["portal-company"],
    queryFn: async () => {
      const { data } = await supabase.from("system_company").select("*").maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="p-10 text-center">লোড হচ্ছে...</div>;
  if (!bill) return <div className="p-10 text-center">বিল পাওয়া যায়নি</div>;

  const c: any = bill.clients;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to="/portal/bills"><ArrowLeft className="h-4 w-4" /> ফিরে যান</Link>
        </Button>
        <Button onClick={() => window.print()} size="sm">
          <Printer className="h-4 w-4" /> প্রিন্ট
        </Button>
      </div>

      <Card className="border-0 shadow-sm print:shadow-none">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-5 mb-5">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{(company as any)?.name || "ISP Desk"}</h1>
                  <p className="text-xs text-muted-foreground">{(company as any)?.address || ""}</p>
                  <p className="text-xs text-muted-foreground">{(company as any)?.phone || ""} {(company as any)?.email ? "• " + (company as any).email : ""}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">ইনভয়েস</div>
              <div className="text-lg font-bold">{bill.bill_id}</div>
              <Badge className={`mt-1 ${bill.status === "paid" ? "bg-emerald-100 text-emerald-700" : bill.status === "partial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"} border-0`}>
                {bill.status === "paid" ? "পরিশোধিত" : bill.status === "partial" ? "আংশিক" : "বকেয়া"}
              </Badge>
            </div>
          </div>

          {/* Bill to */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-xs uppercase text-muted-foreground mb-1.5">গ্রাহক</div>
              <div className="font-semibold">{c?.name}</div>
              <div className="text-sm text-muted-foreground">আইডি: {c?.client_id}</div>
              {c?.contact && <div className="text-sm text-muted-foreground">ফোন: {c.contact}</div>}
              {c?.address && <div className="text-sm text-muted-foreground">{c.address}</div>}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase text-muted-foreground mb-1.5">বিলিং মাস</div>
              <div className="font-semibold">{bill.month}</div>
              {bill.due_date && <div className="text-sm text-muted-foreground">পেমেন্ট দিতে হবে: {bill.due_date}</div>}
              {bill.pay_date && <div className="text-sm text-muted-foreground">পরিশোধের তারিখ: {bill.pay_date}</div>}
            </div>
          </div>

          {/* Items */}
          <table className="w-full mb-6 text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left py-2.5 px-3">বর্ণনা</th>
                <th className="text-right py-2.5 px-3">পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-3">মাসিক ইন্টারনেট সার্ভিস ({bill.month})</td>
                <td className="py-3 px-3 text-right font-medium">৳{Number(bill.amount || 0).toLocaleString()}</td>
              </tr>
              {Number(bill.discount || 0) > 0 && (
                <tr className="border-b">
                  <td className="py-3 px-3 text-muted-foreground">ডিসকাউন্ট</td>
                  <td className="py-3 px-3 text-right text-emerald-600">- ৳{Number(bill.discount).toLocaleString()}</td>
                </tr>
              )}
              {Number(bill.vat || 0) > 0 && (
                <tr className="border-b">
                  <td className="py-3 px-3 text-muted-foreground">ভ্যাট</td>
                  <td className="py-3 px-3 text-right">৳{Number(bill.vat).toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">মোট</span>
                <span className="font-medium">৳{Number(bill.amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">পরিশোধিত</span>
                <span className="text-emerald-600">৳{Number(bill.paid || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>বকেয়া</span>
                <span className="text-rose-600">৳{Number(bill.due || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground mt-8 pt-5 border-t">
            ধন্যবাদ। সময়মত পেমেন্ট করার জন্য অনুরোধ রইলো।
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalBillInvoice;
