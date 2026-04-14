import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CreditCard, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function QuickPay() {
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!clientId.trim()) return;
    setLoading(true);
    setClient(null);
    setBills([]);

    const { data: clientData } = await supabase
      .from("clients")
      .select("id, name, client_id, contact, monthly_bill, status")
      .eq("client_id", clientId.trim())
      .maybeSingle();

    if (!clientData) {
      toast({ title: "গ্রাহক পাওয়া যায়নি", description: "সঠিক কাস্টমার আইডি দিন।", variant: "destructive" });
      setLoading(false);
      return;
    }

    setClient(clientData);

    const { data: billData } = await supabase
      .from("billing")
      .select("*")
      .eq("client_id", clientData.id)
      .order("month", { ascending: false })
      .limit(6);

    setBills(billData || []);
    setLoading(false);
  };

  return (
    <div className="py-16 bg-slate-50 min-h-[60vh]">
      <div className="max-w-lg mx-auto px-4">
        <div className="text-center mb-8">
          <CreditCard className="h-10 w-10 text-teal-600 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Quick Pay</h1>
          <p className="text-slate-500">আপনার কাস্টমার আইডি দিয়ে বিল দেখুন ও পরিশোধ করুন</p>
        </div>

        <Card className="border-slate-200 bg-white shadow-sm mb-6">
          <CardContent className="p-6">
            <Label className="text-slate-700">কাস্টমার আইডি</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="যেমন: C-001"
                className="bg-white border-slate-200 text-slate-900"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {client && (
          <Card className="border-slate-200 bg-white shadow-sm mb-6">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg text-slate-900 mb-3">গ্রাহকের তথ্য</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-slate-500">নাম:</span>
                <span className="text-slate-900 font-medium">{client.name}</span>
                <span className="text-slate-500">আইডি:</span>
                <span className="text-slate-900">{client.client_id}</span>
                <span className="text-slate-500">ফোন:</span>
                <span className="text-slate-900">{client.contact || "-"}</span>
                <span className="text-slate-500">মাসিক বিল:</span>
                <span className="text-slate-900 font-medium">৳{client.monthly_bill || 0}</span>
                <span className="text-slate-500">স্ট্যাটাস:</span>
                <span className={client.status === "active" ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                  {client.status === "active" ? "সক্রিয়" : client.status}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {bills.length > 0 && (
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg text-slate-900 mb-3">সাম্প্রতিক বিল</h3>
              <div className="space-y-3">
                {bills.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{b.month}</div>
                      <div className="text-xs text-slate-500">৳{b.amount} | পরিশোধিত: ৳{b.paid || 0}</div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
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
      </div>
    </div>
  );
}
