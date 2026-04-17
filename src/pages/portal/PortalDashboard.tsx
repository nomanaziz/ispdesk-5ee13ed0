import { Link } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DollarSign, Package, Calendar, Wifi, Wallet,
  FileText, HeadphonesIcon, CreditCard, Bell, Sparkles,
} from "lucide-react";

const PortalDashboard = () => {
  const { customer } = usePortalAuth();

  const { data: invoices } = useQuery({
    queryKey: ["portal-bills-dash", customer?.sub, customer?.type],
    queryFn: async () => {
      // Clients use the monthly `billing` table; B2B (bw_customer) uses bw_sales_invoices
      if (customer?.type === "client") {
        const { data } = await supabase
          .from("billing")
          .select("id, bill_id as invoice_no, month, amount, paid, due, status, created_at, discount")
          .eq("client_id", customer!.sub)
          .order("month", { ascending: false });
        return (data || []).map((b: any) => ({ ...b, paid_amount: b.paid }));
      }
      const { data } = await supabase
        .from("bw_sales_invoices")
        .select("*")
        .eq("customer_id", customer!.sub)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!customer?.sub,
  });

  const { data: clientRow } = useQuery({
    queryKey: ["portal-client", customer?.sub],
    queryFn: async () => {
      if (customer?.type !== "client") return null;
      const { data } = await supabase
        .from("clients")
        .select("*, isp_packages(name, price), zones(name)")
        .eq("id", customer!.sub)
        .maybeSingle();
      return data;
    },
    enabled: !!customer?.sub && customer?.type === "client",
  });

  const { data: notices } = useQuery({
    queryKey: ["portal-notices-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_notices")
        .select("*")
        .eq("active", true)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  const totalDue = invoices?.reduce((s, i) => s + (i.due || 0), 0) || 0;
  const lastInvoice = invoices?.[0];
  const paidCount = invoices?.filter((i) => i.status === "paid").length || 0;
  const isOnline = clientRow?.is_online ?? false;
  const status = clientRow?.status || "Active";
  const pkgName = clientRow?.isp_packages?.name || "—";
  const monthlyBill = clientRow?.monthly_bill || customer?.monthly_bill || 0;
  const balance = customer?.balance ?? 0;

  const initials =
    customer?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  const stats = [
    { label: "Monthly Bill", value: `৳${Number(monthlyBill).toLocaleString()}`, icon: DollarSign, tint: "from-violet-500 to-indigo-500" },
    { label: "Service", value: clientRow?.connection_type || "Internet", icon: Wifi, tint: "from-sky-500 to-cyan-500" },
    { label: "Package", value: pkgName, icon: Package, tint: "from-emerald-500 to-teal-500" },
    { label: "Join Date", value: clientRow?.joining_date ? new Date(clientRow.joining_date).toLocaleDateString() : "—", icon: Calendar, tint: "from-amber-500 to-orange-500" },
    { label: "Ledger Balance", value: `৳${Number(balance).toLocaleString()}`, icon: Wallet, tint: "from-rose-500 to-pink-500", badge: totalDue === 0 ? "Paid" : "Due" },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Notice banner */}
      {notices && notices.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-amber-100 flex items-center justify-center">
            <Bell className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Notice</span>
              {notices[0].pinned && <Badge className="bg-amber-200 text-amber-900 text-[10px] h-4 px-1.5">Pinned</Badge>}
            </div>
            <div className="text-sm font-medium text-amber-950 mt-0.5 truncate">{notices[0].title}</div>
            <div className="text-xs text-amber-800/80 line-clamp-2">{notices[0].body}</div>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-amber-900 hover:bg-amber-100 hidden sm:inline-flex">
            <Link to="/portal/notices">View all</Link>
          </Button>
        </div>
      )}

      {/* Hero card */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="relative bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-600 text-white p-5 sm:p-7">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row gap-5 lg:items-center">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-4 ring-white/30 shadow-xl">
                <AvatarFallback className="bg-white/20 backdrop-blur text-white text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-white/80 text-xs">
                  <Sparkles className="h-3 w-3" /> Welcome back
                </div>
                <h1 className="text-xl sm:text-2xl font-bold mt-0.5 truncate">{customer?.name}</h1>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <Badge className="bg-white/20 hover:bg-white/25 text-white border-0 text-[10px] uppercase tracking-wide">
                    {pkgName}
                  </Badge>
                  <Badge className={`text-[10px] uppercase border-0 ${status === "Active" ? "bg-emerald-400/30 text-emerald-50" : "bg-rose-400/30 text-rose-50"}`}>
                    {status}
                  </Badge>
                  <Badge className={`text-[10px] uppercase border-0 ${isOnline ? "bg-green-400/30 text-green-50" : "bg-slate-400/30 text-slate-50"}`}>
                    ● {isOnline ? "Online" : "Offline"}
                  </Badge>
                  <Badge className="bg-white/15 text-white border-0 text-[10px]">
                    @{customer?.username}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="lg:ml-auto flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary" className="bg-white text-violet-700 hover:bg-white/90 shadow">
                <Link to={customer?.type === "client" ? "/portal/bills" : "/portal/invoices"}><FileText className="h-4 w-4" /> {customer?.type === "client" ? "মাসিক বিল" : "Invoices"}</Link>
              </Button>
              <Button asChild size="sm" variant="secondary" className="bg-white/15 text-white hover:bg-white/25 backdrop-blur border-0">
                <Link to="/portal/support"><HeadphonesIcon className="h-4 w-4" /> Support</Link>
              </Button>
              <Button asChild size="sm" className="bg-emerald-400 hover:bg-emerald-500 text-emerald-950 font-semibold shadow">
                <Link to={customer?.type === "client" ? "/portal/bills" : "/portal/invoices"}><CreditCard className="h-4 w-4" /> Pay Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${s.tint} flex items-center justify-center text-white shadow`}>
                  <s.icon className="h-4 w-4" />
                </div>
                {s.badge && (
                  <Badge className={s.badge === "Paid" ? "bg-emerald-100 text-emerald-700 border-0" : "bg-rose-100 text-rose-700 border-0"}>
                    {s.badge}
                  </Badge>
                )}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">{s.label}</div>
              <div className="text-base font-bold truncate">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Service & Client details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <Wifi className="h-4 w-4 text-violet-600" />
              </div>
              <h3 className="font-semibold">Service Overview</h3>
            </div>
            <dl className="space-y-2.5 text-sm">
              <Row label="Username" value={customer?.username || "—"} />
              <Row label="Package" value={pkgName} />
              <Row label="Speed" value={clientRow?.speed || "—"} />
              <Row label="Connection" value={clientRow?.connection_type || "—"} />
              <Row label="Protocol" value={clientRow?.protocol_type || "—"} />
              <Row label="Status" value={
                <Badge className={status === "Active" ? "bg-emerald-100 text-emerald-700 border-0" : "bg-rose-100 text-rose-700 border-0"}>
                  {status}
                </Badge>
              } />
            </dl>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Package className="h-4 w-4 text-indigo-600" />
              </div>
              <h3 className="font-semibold">Client Details</h3>
            </div>
            <dl className="space-y-2.5 text-sm">
              <Row label="Customer Code" value={customer?.code || "—"} />
              <Row label="Mobile" value={customer?.mobile || clientRow?.contact || "—"} />
              <Row label="Email" value={customer?.email || clientRow?.email || "—"} />
              <Row label="Address" value={customer?.address || clientRow?.address || "—"} />
              <Row label="Zone" value={clientRow?.zones?.name || "—"} />
              <Row label="NID" value={clientRow?.nid_number || "—"} />
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Billing Info Strip */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-blue-50/40">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Monthly Bill</div>
              <div className="text-lg font-bold text-slate-900">৳{Number(monthlyBill).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Last Invoice</div>
              <div className="text-lg font-bold text-slate-900">
                {lastInvoice ? `#${lastInvoice.invoice_no}` : "—"}
              </div>
              <div className="text-xs text-muted-foreground">{lastInvoice?.month || ""}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Payment Status</div>
              <div className="flex items-center gap-2 mt-1">
                {totalDue === 0 ? (
                  <Badge className="bg-emerald-500 text-white">All Clear</Badge>
                ) : (
                  <Badge className="bg-rose-500 text-white">৳{totalDue.toLocaleString()} Due</Badge>
                )}
                <span className="text-xs text-muted-foreground">{paidCount} paid</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-2 border-b border-dashed border-border/60 last:border-0 pb-2 last:pb-0">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="font-medium text-right truncate max-w-[60%]">{value}</dd>
  </div>
);

export default PortalDashboard;
