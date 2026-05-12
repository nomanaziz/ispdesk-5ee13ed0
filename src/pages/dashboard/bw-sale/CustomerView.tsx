import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, KeyRound, Download, User, List, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { loginAsUser } from "@/lib/impersonate";
import { toast } from "sonner";
import BwInvoiceDetailDialog from "@/components/bw-sale/BwInvoiceDetailDialog";

export default function CustomerView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [pop, setPop] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [latestInvoiceNo, setLatestInvoiceNo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(null);

  useEffect(() => { if (id) fetchData(); }, [id]);

  async function fetchData() {
    setLoading(true);
    const { data: c } = await supabase.from("bw_sale_customers").select("*").eq("id", id!).single();
    if (c) {
      setCustomer(c);
      if (c.pop_id) {
        const { data: p } = await supabase.from("bw_sale_pops").select("*").eq("id", c.pop_id).single();
        if (p) setPop(p);
      }
      const { data: inv } = await supabase.from("bw_sales_invoices").select("*").eq("customer_id", c.id).order("created_at", { ascending: false });
      if (inv) setInvoices(inv);

      // Derive current services from latest invoice items
      const latest = (inv || [])[0];
      if (latest) {
        setLatestInvoiceNo(latest.invoice_no || "");
        const { data: its } = await supabase.from("bw_invoice_items").select("*").eq("invoice_id", latest.id).order("sort_order");
        // De-duplicate by service_name (keep first)
        const seen = new Set<string>();
        const uniq: any[] = [];
        for (const it of (its || [])) {
          const key = (it.service_name || it.item_name || "").trim().toLowerCase();
          if (key && !seen.has(key)) { seen.add(key); uniq.push(it); }
        }
        setServices(uniq);
      } else {
        setServices([]);
      }
    }
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  if (!customer) return <div className="flex items-center justify-center py-20 text-muted-foreground">Customer not found</div>;

  const totalAmount = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const totalDiscount = invoices.reduce((s, i) => s + (i.discount || 0), 0);
  const totalDue = invoices.reduce((s, i) => s + (i.due || 0), 0);

  const InfoRow = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value || "—"}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Left Sidebar */}
        <div className="w-full sm:w-72 shrink-0 space-y-3">
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{customer.customer_name}</h3>
              <Badge variant={customer.activity_status === "active" ? "default" : "secondary"}>
                {customer.activity_status}
              </Badge>
              <div className="space-y-2 pt-2">
                {isAdmin && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() =>
                      loginAsUser("bw_customer", customer.id)
                        .then(() => toast.success("নতুন ট্যাবে লগইন হচ্ছে"))
                        .catch((e) => toast.error(e.message))
                    }
                  >
                    <LogIn className="h-3.5 w-3.5" /> Login as Customer
                  </Button>
                )}
                <Button variant="outline" size="sm" className="w-full gap-2"><KeyRound className="h-3.5 w-3.5" /> Regenerate Password</Button>
                <Button variant="outline" size="sm" className="w-full gap-2"><Download className="h-3.5 w-3.5" /> Download Info</Button>
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigate("/dashboard/bw-sale/pop")}>
                  <List className="h-3.5 w-3.5" /> Go To Client List
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          <Button variant="ghost" size="sm" className="mb-3 gap-1" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <Tabs defaultValue="personal">
            <TabsList className="w-full overflow-x-auto justify-start">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="transmission">Transmission</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card>
                <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
                <CardContent>
                  <InfoRow label="Customer Name" value={customer.customer_name} />
                  <InfoRow label="Customer Code" value={customer.customer_code} />
                  <InfoRow label="Contact Person" value={customer.contact_person} />
                  <InfoRow label="Email" value={customer.email} />
                  <InfoRow label="Mobile" value={customer.mobile} />
                  <InfoRow label="Phone" value={customer.phone} />
                  <InfoRow label="POP" value={pop?.name} />
                  <InfoRow label="Reference By" value={customer.reference_by} />
                  <InfoRow label="Address" value={customer.address} />
                  <InfoRow label="Remarks" value={customer.remarks} />
                  <InfoRow label="Facebook" value={customer.facebook_url} />
                  <InfoRow label="Skype" value={customer.skype_id} />
                  <InfoRow label="Website" value={customer.website} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transmission">
              <Card>
                <CardHeader><CardTitle className="text-base">Transmission Information</CardTitle></CardHeader>
                <CardContent>
                  <InfoRow label="NTTN Info" value={customer.nttn_info} />
                  <InfoRow label="SCR / Link ID" value={customer.scr_link_id} />
                  <InfoRow label="Activation Date" value={customer.activation_date} />
                  <InfoRow label="POP Name (Last Mile)" value={customer.pop_name_last_mile} />
                  <InfoRow label="Username" value={customer.username} />
                  <div className="py-2 border-b">
                    <span className="text-sm text-muted-foreground block mb-1">VLAN Info</span>
                    {Array.isArray(customer.vlan_info) && customer.vlan_info.length > 0 ? (
                      <div className="space-y-1">{customer.vlan_info.map((v: any, i: number) => (
                        <span key={i} className="text-sm">VLAN: {v.vlan || "—"} — {v.info || "—"}</span>
                      ))}</div>
                    ) : <span className="text-sm">—</span>}
                  </div>
                  <div className="py-2">
                    <span className="text-sm text-muted-foreground block mb-1">IP Addresses</span>
                    {Array.isArray(customer.ip_addresses) && customer.ip_addresses.length > 0 ? (
                      <div className="flex flex-wrap gap-1">{customer.ip_addresses.map((ip: string, i: number) => (
                        <Badge key={i} variant="outline">{ip || "—"}</Badge>
                      ))}</div>
                    ) : <span className="text-sm">—</span>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Current Services</span>
                    {latestInvoiceNo && (
                      <span className="text-xs text-muted-foreground font-normal">
                        Source: <span className="font-mono">{latestInvoiceNo}</span>
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-10">SN</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead className="text-right">Bandwidth (Mbps)</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Monthly Amount</TableHead>
                          <TableHead>Period</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {services.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো সক্রিয় সার্ভিস পাওয়া যায়নি</TableCell></TableRow>
                        ) : services.map((s, i) => {
                          const bw = Number(s.bandwidth_mbps ?? s.quantity ?? 0);
                          const from = s.period_start || s.from_date;
                          const to = s.period_end || s.to_date;
                          return (
                            <TableRow key={s.id}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell className="font-medium">{s.service_name || s.item_name || "—"}</TableCell>
                              <TableCell className="text-right">{bw.toLocaleString()}</TableCell>
                              <TableCell className="text-right">৳{Number(s.rate || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-right font-semibold">৳{Number(s.amount || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-xs">{from || "—"} → {to || "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                        {services.length > 0 && (
                          <TableRow className="bg-muted/30 font-semibold">
                            <TableCell colSpan={2} className="text-right">Total:</TableCell>
                            <TableCell className="text-right">{services.reduce((a, s) => a + Number(s.bandwidth_mbps ?? s.quantity ?? 0), 0).toLocaleString()}</TableCell>
                            <TableCell />
                            <TableCell className="text-right">৳{services.reduce((a, s) => a + Number(s.amount || 0), 0).toLocaleString()}</TableCell>
                            <TableCell />
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <Card>
                <CardHeader><CardTitle className="text-base">Invoice Information</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-10">SN</TableHead>
                          <TableHead>Bill No</TableHead>
                          <TableHead>Bill Month</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">Discount</TableHead>
                          <TableHead className="text-right">Due</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.length === 0 ? (
                          <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No invoices</TableCell></TableRow>
                        ) : invoices.map((inv, i) => (
                          <TableRow key={inv.id}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell>
                              <button
                                type="button"
                                className="font-mono text-primary underline-offset-2 hover:underline"
                                onClick={() => setOpenInvoiceId(inv.id)}
                              >
                                {inv.invoice_no}
                              </button>
                            </TableCell>
                            <TableCell>{inv.month || "—"}</TableCell>
                            <TableCell className="text-right">৳{(inv.amount || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">৳{(inv.paid_amount || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">৳{(inv.discount || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">৳{(inv.due || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={inv.status === "paid" ? "default" : "destructive"}>{inv.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {invoices.length > 0 && (
                          <TableRow className="bg-muted/30 font-semibold">
                            <TableCell colSpan={3} className="text-right">Total:</TableCell>
                            <TableCell className="text-right">৳{totalAmount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">৳{totalPaid.toLocaleString()}</TableCell>
                            <TableCell className="text-right">৳{totalDiscount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">৳{totalDue.toLocaleString()}</TableCell>
                            <TableCell />
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <BwInvoiceDetailDialog
        open={!!openInvoiceId}
        onOpenChange={(v) => { if (!v) setOpenInvoiceId(null); }}
        invoiceId={openInvoiceId}
      />
    </div>
  );
}
