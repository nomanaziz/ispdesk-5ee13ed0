import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPopScope } from "@/lib/popScope";
import { getBillingCustomerId } from "@/lib/portalIdentity";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Icons8Icon, hasIcons8Icon } from "@/components/icons/Icons8Icon";
import {
  Receipt, CheckCircle2, UserPlus, LifeBuoy, Wallet, History,
  TrendingUp, ArrowDownCircle, AlertTriangle, Gift, Users, Banknote,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";

const tk = (n: number | null | undefined) =>
  `৳ ${(Number(n) || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

interface Shortcut {
  to: string;
  icon: any;
  bn: string;
  en: string;
  tone: string;
  icons8?: string;
}

const shortcuts: Shortcut[] = [
  { to: "/pop-admin/billing/list", icon: Receipt, bn: "বিল রিসিভ", en: "Bill Receive", tone: "bg-blue-500/10 text-blue-600", icons8: "documents" },
  { to: "/pop-admin/billing/list?tab=approval", icon: CheckCircle2, bn: "বিল অনুমোদন", en: "Bill Approval", tone: "bg-emerald-500/10 text-emerald-600", icons8: "checked" },
  { to: "/pop-admin/clients/add", icon: UserPlus, bn: "ক্লায়েন্ট যোগ", en: "Add Client", tone: "bg-violet-500/10 text-violet-600", icons8: "add-user-male" },
  
  { to: "/pop-admin/fund-history/credit?action=recharge", icon: Wallet, bn: "ফান্ড রিচার্জ", en: "Fund Recharge", tone: "bg-pink-500/10 text-pink-600", icons8: "wallet" },
  { to: "/pop-admin/fund-history/debit", icon: ArrowDownCircle, bn: "ডেবিট হিস্ট্রি", en: "Debit History", tone: "bg-rose-500/10 text-rose-600", icons8: "data-transfer" },
  { to: "/pop-admin/fund-history/credit", icon: History, bn: "রিচার্জ লগ", en: "Recharge Log", tone: "bg-cyan-500/10 text-cyan-600", icons8: "coins" },
  { to: "/pop-admin/monitoring/online", icon: TrendingUp, bn: "মনিটরিং", en: "Monitoring", tone: "bg-amber-500/10 text-amber-700", icons8: "wi-fi-connected" },
];

export default function PopMobileHome() {
  const { customer } = usePortalAuth();
  const { lang, t } = useLanguage();
  const { popId, branchId } = getPopScope(customer);
  const billingId = getBillingCustomerId(customer);

  const { data: company } = useQuery({
    queryKey: ["pop-mobile-company", popId, billingId],
    enabled: !!popId,
    queryFn: async () => {
      const [pop, lastInvs] = await Promise.all([
        supabase.from("branch_managers").select("balance").eq("id", popId!).maybeSingle(),
        billingId
          ? supabase.from("bw_sales_invoices")
              .select("amount, paid_amount, due, discount, created_at")
              .eq("customer_id", billingId).order("created_at", { ascending: false }).limit(20)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const totalDue = (lastInvs.data || []).reduce((s, r: any) => s + Number(r.due || 0), 0);
      return { balance: Number(pop.data?.balance || 0), totalDue };
    },
  });

  const { data: internal } = useQuery({
    queryKey: ["pop-mobile-internal", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthIso = monthStart.toISOString();

      const [allClients, billing, collections, zonesQ, tickets] = await Promise.all([
        supabase.from("clients").select("id, status, monthly_bill, zone_id").eq("branch_id", branchId!),
        supabase.from("billing").select("amount, paid, due, discount, client_id").eq("branch_id", branchId!).gte("created_at", monthIso),
        supabase.from("bill_collections").select("amount").gte("created_at", monthIso),
        supabase.from("zones").select("id, name").eq("status", "active"),
        supabase.from("support_tickets").select("status").order("created_at", { ascending: false }).limit(100),
      ]);

      const clients = allClients.data || [];
      const monthlyBillSum = clients.reduce((s, c: any) => s + Number(c.monthly_bill || 0), 0);
      const billed = (billing.data || []).reduce((s, b: any) => s + Number(b.amount || 0), 0);
      const collected = (billing.data || []).reduce((s, b: any) => s + Number(b.paid || 0), 0)
        + (collections.data || []).reduce((s, c: any) => s + Number(c.amount || 0), 0);
      const totalDue = (billing.data || []).reduce((s, b: any) => s + Number(b.due || 0), 0);
      const totalDiscount = (billing.data || []).reduce((s, b: any) => s + Number(b.discount || 0), 0);

      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const remainingDays = daysInMonth - today.getDate() + 1;
      const dailyCharged = monthlyBillSum / daysInMonth;
      const approxRechargeable = dailyCharged * remainingDays;

      const zoneMap: Record<string, { name: string; paid: number; unpaid: number }> = {};
      (zonesQ.data || []).forEach((z: any) => (zoneMap[z.id] = { name: z.name, paid: 0, unpaid: 0 }));
      (billing.data || []).forEach((b: any) => {
        const c = clients.find((x: any) => x.id === b.client_id);
        if (!c?.zone_id || !zoneMap[c.zone_id]) return;
        zoneMap[c.zone_id].paid += Number(b.paid || 0);
        zoneMap[c.zone_id].unpaid += Number(b.due || 0);
      });
      const zoneChart = Object.values(zoneMap).filter((z) => z.paid + z.unpaid > 0).slice(0, 6);

      const ticketRows = tickets.data || [];
      const ticketsTotal = ticketRows.length;
      const pending = ticketRows.filter((t: any) => t.status === "open" || t.status === "pending").length;
      const processing = ticketRows.filter((t: any) => t.status === "processing" || t.status === "in_progress").length;

      return {
        totalClients: clients.length,
        activeClients: clients.filter((c: any) => c.status === "Active").length,
        monthlyBillSum, billed, collected, totalDue, totalDiscount,
        dailyCharged, approxRechargeable, zoneChart,
        ticketsTotal, pending, processing,
        cashOnHand: collected,
      };
    },
  });

  return (
    <div className="space-y-4">
      {/* Profile summary */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary-foreground/20 flex items-center justify-center text-lg font-bold">
              {customer?.name?.[0]?.toUpperCase() || "P"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold truncate">{customer?.name}</div>
              <div className="text-[11px] opacity-80 truncate">
                {t("ব্যবহারকারী", "User")}: {customer?.username}
              </div>
              <Badge className="mt-1 bg-primary-foreground/20 text-primary-foreground border-0 text-[10px] h-4 px-1.5">
                {customer?.type === "reseller_sub" ? "Sub-user" : "POP Admin"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shortcut grid */}
      <div className="grid grid-cols-4 gap-2">
        {shortcuts.map((s) => {
          const Icon = s.icon;
          const useIcons8 = hasIcons8Icon(s.icons8);
          return (
            <Link
              key={s.to}
              to={s.to}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-card border border-border/60 active:scale-95 transition-transform min-h-[80px]"
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${useIcons8 ? "bg-muted/40" : s.tone}`}>
                {useIcons8 ? <Icons8Icon name={s.icons8!} size={30} /> : <Icon className="h-5 w-5" />}
              </div>
              <span className="text-[10px] font-medium text-center leading-tight line-clamp-2">
                {lang === "bn" ? s.bn : s.en}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Summary 2×2 */}
      <Card>
        <CardContent className="p-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t("এই মাসের সারাংশ", "This Month")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat icon={<Receipt className="h-4 w-4" />} label={t("মাসিক বিল", "Monthly Bill")} value={tk(internal?.monthlyBillSum)} />
            <MiniStat icon={<CheckCircle2 className="h-4 w-4" />} label={t("সংগৃহীত", "Collected")} value={tk(internal?.collected)} tone="success" />
            <MiniStat icon={<AlertTriangle className="h-4 w-4" />} label={t("বকেয়া", "Due")} value={tk(internal?.totalDue)} tone="warning" />
            <MiniStat icon={<Gift className="h-4 w-4" />} label={t("ছাড়", "Discount")} value={tk(internal?.totalDiscount)} />
          </div>
        </CardContent>
      </Card>

      {/* Tickets */}
      <Card>
        <CardContent className="p-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t("টিকেট", "Tickets")}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <TicketStat label={t("মোট", "Total")} value={internal?.ticketsTotal ?? 0} tone="text-foreground" />
            <TicketStat label={t("পেন্ডিং", "Pending")} value={internal?.pending ?? 0} tone="text-orange-600" />
            <TicketStat label={t("প্রসেস", "Process")} value={internal?.processing ?? 0} tone="text-blue-600" />
          </div>
        </CardContent>
      </Card>

      {/* Zone chart */}
      <Card>
        <CardContent className="p-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t("জোন অনুযায়ী পরিশোধ", "Zone-wise Payment")}
          </div>
          {!(internal?.zoneChart || []).length ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={internal?.zoneChart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <Bar dataKey="paid" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Paid" />
                <Bar dataKey="unpaid" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Unpaid" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bottom finance card */}
      <Card>
        <CardContent className="p-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t("আর্থিক অবস্থা", "Finance")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat icon={<Users className="h-4 w-4" />} label={t("মোট ক্লায়েন্ট", "Clients")} value={String(internal?.totalClients ?? 0)} />
            <MiniStat icon={<Wallet className="h-4 w-4" />} label={t("ব্যালেন্স", "Balance")} value={tk(company?.balance)} tone="primary" />
            <MiniStat icon={<Banknote className="h-4 w-4" />} label={t("ক্যাশ ইন হ্যান্ড", "Cash on Hand")} value={tk(internal?.cashOnHand)} />
            <MiniStat icon={<TrendingUp className="h-4 w-4" />} label={t("আনুমানিক রিচার্জ", "Approx Recharge")} value={tk(internal?.approxRechargeable)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "warning" | "success" | "primary";
}) {
  const toneClass =
    tone === "warning" ? "bg-orange-500/10 text-orange-600"
      : tone === "success" ? "bg-green-500/10 text-green-600"
      : tone === "primary" ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
      <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${toneClass}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}

function TicketStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="p-2 rounded-lg bg-muted/30">
      <div className={`text-xl font-bold ${tone}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
