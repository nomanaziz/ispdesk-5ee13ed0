import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, FileText, Calendar, CreditCard, ShoppingCart, HeadphonesIcon } from "lucide-react";

const PortalDashboard = () => {
  const { customer } = usePortalAuth();

  const { data: invoices } = useQuery({
    queryKey: ["portal-invoices", customer?.sub],
    queryFn: async () => {
      const { data } = await supabase
        .from("bw_sales_invoices")
        .select("*")
        .eq("customer_id", customer!.sub)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!customer?.sub,
  });

  const totalDue = invoices?.reduce((s, i) => s + (i.due || 0), 0) || 0;
  const lastInvoice = invoices?.[0];
  const thisMonthPaid = invoices
    ?.filter(i => i.month === new Date().toISOString().slice(0, 7))
    .reduce((s, i) => s + (i.paid_amount || 0), 0) || 0;
  const paidCount = invoices?.filter(i => i.status === "paid").length || 0;
  const dueCount = invoices?.filter(i => i.status === "due" || i.status === "unpaid").length || 0;

  const cards = [
    { title: "Balance Due", value: `৳${totalDue.toLocaleString()}`, icon: DollarSign, color: "text-red-400" },
    { title: "Last Invoice", value: lastInvoice ? `#${lastInvoice.invoice_no}` : "N/A", icon: FileText, color: "text-primary" },
    { title: "Payment Due Date", value: lastInvoice?.month || "N/A", icon: Calendar, color: "text-yellow-400" },
    { title: "This Month Paid", value: `৳${thisMonthPaid.toLocaleString()}`, icon: CreditCard, color: "text-green-400" },
    { title: "Paid Invoices", value: paidCount.toString(), icon: ShoppingCart, color: "text-blue-400" },
    { title: "Due Invoices", value: dueCount.toString(), icon: HeadphonesIcon, color: "text-orange-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <h1 className="text-xl font-bold mb-1">Welcome, {customer?.name}!</h1>
          <div className="text-sm text-muted-foreground space-y-0.5">
            <p>Username: <span className="text-foreground">{customer?.username}</span></p>
            {customer?.code && <p>Customer Code: <span className="text-foreground">{customer.code}</span></p>}
            {customer?.mobile && <p>Mobile: <span className="text-foreground">{customer.mobile}</span></p>}
            {customer?.email && <p>Email: <span className="text-foreground">{customer.email}</span></p>}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(card => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PortalDashboard;
