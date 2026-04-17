import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Printer, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

export default function BillView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: bill, isLoading } = useQuery({
    queryKey: ["bw_bill_view", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bw_purchase_bills").select("*, bw_providers(*)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // New pro-rated items first
  const { data: proItems } = useQuery({
    queryKey: ["bw_buy_bill_items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bw_buy_bill_items")
        .select("*")
        .eq("bill_id", id!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Legacy items fallback
  const { data: legacyItems } = useQuery({
    queryKey: ["bw_bill_items_legacy", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bw_bill_items")
        .select("*, bw_items(name)")
        .eq("bill_id", id!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const useNewItems = (proItems || []).length > 0;
  const lineItems = useNewItems ? proItems : legacyItems;

  if (isLoading) return <div className="space-y-4 p-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  if (!bill) return <div className="p-6 text-center text-muted-foreground">বিল পাওয়া যায়নি</div>;

  const provider = bill.bw_providers as any;
  const grandTotal = (lineItems || []).reduce((s: number, li: any) => s + Number((useNewItems ? li.amount : li.total) || 0), 0);
  const due = Number(bill.amount || 0) - Number(bill.paid || 0) - Number(bill.discount || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/bw-buy/bills")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">পার্চেজ বিল — {bill.bill_no}</h1>
            <p className="text-sm text-muted-foreground">ব্যান্ডউইথ ক্রয় — বিল বিস্তারিত</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" /> প্রিন্ট
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/bw-buy/bills/${id}/edit`)} className="gap-1.5">
            <FileText className="h-4 w-4" /> সম্পাদনা
          </Button>
        </div>
      </div>

      {/* Invoice Card */}
      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
            <div>
              <h2 className="text-xl font-bold text-foreground">PURCHASE BILL</h2>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">বিল নং:</span> {bill.bill_no}</p>
                {bill.invoice_no && <p><span className="font-medium text-foreground">ইনভয়েস নং:</span> {bill.invoice_no}</p>}
                <p><span className="font-medium text-foreground">মাস:</span> {bill.billing_month || bill.month || "—"}</p>
                <p><span className="font-medium text-foreground">তারিখ:</span> {new Date(bill.created_at).toLocaleDateString("bn-BD")}</p>
                {bill.payment_due && <p><span className="font-medium text-foreground">পেমেন্ট ডিউ:</span> {new Date(bill.payment_due).toLocaleDateString("bn-BD")}</p>}
              </div>
            </div>
            <div className="text-right">
              <Badge variant={bill.status === "paid" ? "default" : bill.status === "partial" ? "secondary" : "destructive"} className="text-sm px-3 py-1">
                {bill.status === "paid" ? "পরিশোধিত" : bill.status === "partial" ? "আংশিক" : bill.status === "due" ? "বকেয়া" : "অপরিশোধিত"}
              </Badge>
            </div>
          </div>

          {/* Provider Info */}
          {provider && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="font-semibold text-foreground text-lg">{provider.name}</p>
              <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                {provider.contact && <p>যোগাযোগ: {provider.contact}</p>}
                {provider.email && <p>ইমেইল: {provider.email}</p>}
                {provider.mobile && <p>মোবাইল: {provider.mobile}</p>}
                {provider.address && <p>ঠিকানা: {provider.address}</p>}
              </div>
            </div>
          )}

          <Separator className="my-6" />

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            {useNewItems ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">SN</TableHead>
                    <TableHead>সার্ভিস</TableHead>
                    <TableHead className="text-right">Mbps</TableHead>
                    <TableHead className="text-right">রেট/Mbps</TableHead>
                    <TableHead>সময়কাল</TableHead>
                    <TableHead className="text-right">দিন</TableHead>
                    <TableHead className="text-right">মাসের দিন</TableHead>
                    <TableHead className="text-right">মোট</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(lineItems || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                        কোনো আইটেম নেই
                      </TableCell>
                    </TableRow>
                  )}
                  {(lineItems || []).map((li: any, i: number) => (
                    <TableRow key={li.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{li.service_name}</TableCell>
                      <TableCell className="text-right">{Number(li.bandwidth_mbps)}</TableCell>
                      <TableCell className="text-right">৳{Number(li.rate || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">
                        {li.period_start} — {li.period_end}
                      </TableCell>
                      <TableCell className="text-right">{li.days}</TableCell>
                      <TableCell className="text-right">{li.total_days_in_month}</TableCell>
                      <TableCell className="text-right font-medium">
                        ৳{Number(li.amount || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">SN</TableHead>
                    <TableHead>আইটেম</TableHead>
                    <TableHead>বিবরণ</TableHead>
                    <TableHead>ইউনিট</TableHead>
                    <TableHead className="text-right">পরিমাণ</TableHead>
                    <TableHead className="text-right">রেট</TableHead>
                    <TableHead className="text-right">VAT%</TableHead>
                    <TableHead>সময়কাল</TableHead>
                    <TableHead className="text-right">মোট</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(lineItems || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                        কোনো আইটেম নেই
                      </TableCell>
                    </TableRow>
                  )}
                  {(lineItems || []).map((li: any, i: number) => (
                    <TableRow key={li.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{li.bw_items?.name || "—"}</TableCell>
                      <TableCell>{li.description || "—"}</TableCell>
                      <TableCell>{li.unit || "—"}</TableCell>
                      <TableCell className="text-right">{li.quantity}</TableCell>
                      <TableCell className="text-right">৳{Number(li.rate || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{li.vat_percent || 0}%</TableCell>
                      <TableCell className="text-xs">
                        {li.from_date && li.to_date ? `${li.from_date} — ${li.to_date}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">৳{Number(li.total || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <Separator className="my-6" />

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">সাব-টোটাল:</span>
                <span className="font-medium">৳{grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ডিসকাউন্ট:</span>
                <span className="font-medium">৳{Number(bill.discount || 0).toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">মোট পরিমাণ:</span>
                <span className="font-bold text-lg">৳{Number(bill.amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">পরিশোধিত:</span>
                <span className="font-medium text-green-600">৳{Number(bill.paid || 0).toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold">বকেয়া:</span>
                <span className="font-bold text-lg text-destructive">৳{due > 0 ? due.toLocaleString() : "0"}</span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          {bill.remarks && (
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-1">মন্তব্য:</p>
              <p className="text-sm text-muted-foreground">{bill.remarks}</p>
            </div>
          )}

          {/* Attachment */}
          {bill.attachment_url && (
            <div className="mt-4">
              <a href={bill.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <Download className="h-4 w-4" /> সংযুক্তি ডাউনলোড করুন
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
