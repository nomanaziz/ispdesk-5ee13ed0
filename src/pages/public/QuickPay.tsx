import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Search, AlertTriangle, CheckCircle2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BreadcrumbBanner } from "@/components/public/BreadcrumbBanner";
import QuickPayDialog from "@/components/public/QuickPayDialog";

export default function QuickPay() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [payOpen, setPayOpen] = useState(false);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setClient(null);
    setBills([]);

    // Case-insensitive multi-field search across separate queries (avoids PostgREST .or() escaping issues with _ , % etc.)
    const cols = "id, name, client_id, contact, monthly_bill, status, user_id, address";
    const tryQueries = [
      supabase.from("clients").select(cols).ilike("client_id", q).limit(1),
      supabase.from("clients").select(cols).ilike("user_id", q).limit(1),
      supabase.from("clients").select(cols).ilike("contact", `%${q}%`).limit(1),
      supabase.from("clients").select(cols).ilike("name", `%${q}%`).limit(1),
    ];
    let clientData: any = null;
    for (const p of tryQueries) {
      const { data } = await p;
      if (data && data.length > 0) { clientData = data[0]; break; }
    }
    if (!clientData) {
      toast({
        title: "গ্রাহক পাওয়া যায়নি",
        description: "সঠিক কাস্টমার আইডি, ইউজার নেম, নাম অথবা মোবাইল নম্বর দিন।",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    setClient(clientData);
    const { data: billData } = await supabase
      .from("billing")
      .select("*")
      .eq("client_id", clientData.id)
      .order("month", { ascending: false })
      .limit(12);
    setBills(billData || []);
    setLoading(false);
  };

  const totalDue = bills.reduce((s, b) => s + Number(b.due || 0), 0);
  const totalPaid = bills.reduce((s, b) => s + Number(b.paid || 0), 0);
  const hasDue = totalDue > 0;

  return (
    <>
      <BreadcrumbBanner
        title="বিল পরিশোধ"
        subtitle="আপনার কাস্টমার আইডি দিয়ে বিল দেখুন ও পরিশোধ করুন"
        breadcrumbs={[{ label: "বিল পরিশোধ" }]}
      />

      <div className="py-12 bg-slate-50 min-h-[60vh]">
        <div className="max-w-lg mx-auto px-4">
          <Card className="border-slate-200 bg-white shadow-sm mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-cyan-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">বিল অনুসন্ধান</h2>
                  <p className="text-xs text-slate-500">কাস্টমার আইডি, ইউজার নেম, নাম বা মোবাইল</p>
                </div>
              </div>
              <Label className="text-slate-700 font-medium">কাস্টমার তথ্য</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="যেমন: naeem, CL001, 0170... বা নাম"
                  className="bg-slate-50 border-slate-200 text-slate-900"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white px-6">
                  <Search className="h-4 w-4 mr-1" /> {loading ? "..." : "খুঁজুন"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {client && (
            <Card className="border-slate-200 bg-white shadow-sm mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg text-slate-900">গ্রাহকের তথ্য</h3>
                  {hasDue ? (
                    <Badge className="bg-red-100 text-red-700 border-0 gap-1">
                      <AlertTriangle className="h-3 w-3" /> বকেয়া আছে
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 border-0 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> পরিশোধিত
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-slate-500">নাম:</span>
                  <span className="text-slate-900 font-medium">{client.name}</span>
                  <span className="text-slate-500">আইডি:</span>
                  <span className="text-slate-900">{client.client_id}</span>
                  <span className="text-slate-500">ফোন:</span>
                  <span className="text-slate-900">{client.contact || "-"}</span>
                  <span className="text-slate-500">মাসিক বিল:</span>
                  <span className="text-slate-900 font-bold text-cyan-600">৳{client.monthly_bill || 0}</span>
                  <span className="text-slate-500">স্ট্যাটাস:</span>
                  <span className={String(client.status).toLowerCase() === "active" ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                    {String(client.status).toLowerCase() === "active" ? "সক্রিয়" : client.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t">
                  <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                    <div className="text-[11px] text-red-600 font-medium">মোট বকেয়া</div>
                    <div className="text-xl font-bold text-red-700">৳{totalDue.toLocaleString()}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                    <div className="text-[11px] text-emerald-600 font-medium">মোট পরিশোধিত</div>
                    <div className="text-xl font-bold text-emerald-700">৳{totalPaid.toLocaleString()}</div>
                  </div>
                </div>

                <Button
                  onClick={() => setPayOpen(true)}
                  className="w-full mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold h-12 text-base shadow-md"
                >
                  <Wallet className="h-5 w-5 mr-2" />
                  Pay Now — ৳{(totalDue || Number(client.monthly_bill) || 0).toLocaleString()} পরিশোধ করুন
                </Button>
              </CardContent>
            </Card>
          )}

          {client && (
            <QuickPayDialog
              open={payOpen}
              onOpenChange={setPayOpen}
              client={client}
              defaultAmount={totalDue || Number(client.monthly_bill) || 0}
            />
          )}

          {bills.length > 0 && (
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg text-slate-900 mb-3">সাম্প্রতিক বিল</h3>
                <div className="space-y-3">
                  {bills.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{b.month}</div>
                        <div className="text-xs text-slate-500">৳{b.amount} | পরিশোধিত: ৳{b.paid || 0} | বকেয়া: ৳{b.due || 0}</div>
                      </div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        b.status === "paid" ? "bg-green-100 text-green-700" :
                        b.status === "partial" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {b.status === "paid" ? "পরিশোধিত" : b.status === "partial" ? "আংশিক" : "বকেয়া"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {client && bills.length === 0 && (
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-6 text-center text-sm text-slate-500">
                কোনো বিলিং রেকর্ড পাওয়া যায়নি।
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
