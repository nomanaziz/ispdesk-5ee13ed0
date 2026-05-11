import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Server, Users, Receipt, Wallet, LifeBuoy, MessageSquare, BarChart3, Settings,
  Sparkles, UserPlus, CheckCircle2, Wifi, AlertTriangle, TrendingUp,
} from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import MetricTile from "@/components/dashboard/MetricTile";

const tk = (n: number | null | undefined) =>
  `৳ ${(Number(n) || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export default function BwPanelDashboard() {
  const { customer } = usePortalAuth();
  const { t } = useLanguage();
  const expiresAt = customer?.panel_subscription_expires_at;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000)) : 0;
  const ownerId = (customer as any)?.id;

  const { data: stats } = useQuery({
    queryKey: ["bw-panel-stats", ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      // Aggregations are placeholders — the panel-scoped tables/columns vary per
      // deployment. Real numbers are wired in once the panel schema is finalized.
      return {
        totalClients: 0,
        activeClients: 0,
        mikrotikServers: 0,
        totalBilled: 0,
        totalPaid: 0,
        totalDue: 0,
      };
    },
  });

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <Card className="bg-gradient-to-r from-emerald-600 to-primary text-primary-foreground border-0">
        <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary-foreground/80 uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              {t("আমার নিজস্ব প্যানেল", "My Independent Panel")}
            </div>
            <h1 className="text-2xl font-bold mt-1">
              {t(`স্বাগতম, ${customer?.name || ""}`, `Welcome, ${customer?.name || ""}`)}
            </h1>
            <p className="text-primary-foreground/80 text-sm mt-1 max-w-2xl">
              {t(
                "এখান থেকে নিজের MikroTik, ক্লায়েন্ট, বিলিং, কর্মচারী ও হিসাব ম্যানেজ করুন।",
                "Manage your MikroTik, clients, billing, employees and accounts from here.",
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-primary-foreground/60 text-xs uppercase">{t("ইউজার লিমিট", "User Limit")}</div>
              <div className="font-semibold">{customer?.panel_user_limit || 0}</div>
            </div>
            <div>
              <div className="text-primary-foreground/60 text-xs uppercase">{t("দিন বাকি", "Days Left")}</div>
              <div className="font-semibold">{daysLeft}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Clients" value={String(stats?.totalClients ?? 0)} icon={Users} tone="violet" caption={`Active ${stats?.activeClients ?? 0}`} />
        <KpiCard label="MikroTik Servers" value={String(stats?.mikrotikServers ?? 0)} icon={Server} tone="primary" />
        <KpiCard label="Monthly Billed" value={tk(stats?.totalBilled)} icon={Receipt} tone="primary" />
        <KpiCard label="Total Due" value={tk(stats?.totalDue)} icon={AlertTriangle} tone={(stats?.totalDue || 0) > 0 ? "warning" : "success"} />
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground mb-2">
          {t("দ্রুত শর্টকাট", "Quick Shortcuts")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <MetricTile label="MikroTik" value={String(stats?.mikrotikServers ?? 0)} icon={Server} tone="indigo" to="/bw-panel/mikrotik" hint={t("সার্ভার", "Servers")} />
          <MetricTile label="Add Client" value="+" icon={UserPlus} tone="emerald" to="/bw-panel/clients/add" />
          <MetricTile label="Billing" value={tk(stats?.totalBilled)} icon={Receipt} tone="violet" to="/bw-panel/billing" />
          <MetricTile label="Daily Collection" value={tk(stats?.totalPaid)} icon={Wallet} tone="amber" to="/bw-panel/billing/daily" />
          <MetricTile label="Online Clients" value={String(stats?.activeClients ?? 0)} icon={Wifi} tone="teal" to="/bw-panel/monitoring/online" />
          <MetricTile label="Tickets" value="—" icon={LifeBuoy} tone="rose" to="/bw-panel/tickets" />
          <MetricTile label="Send SMS" value="•" icon={MessageSquare} tone="sky" to="/bw-panel/sms/send" />
          <MetricTile label="Income" value={tk(stats?.totalPaid)} icon={TrendingUp} tone="emerald" to="/bw-panel/accounting/income" />
          <MetricTile label="Reports" value="📊" icon={BarChart3} tone="cyan" to="/bw-panel/reports/bill-collection" />
          <MetricTile label="Settings" value="⚙" icon={Settings} tone="orange" to="/bw-panel/settings" />
        </div>
      </div>

      {/* Getting started */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-base">{t("শুরু করুন", "Getting Started")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. {t("প্রথমে আপনার MikroTik সার্ভার যোগ করুন।", "Add your MikroTik server first.")}</p>
          <p>2. {t("ক্লায়েন্ট তালিকা তৈরি করুন (একক বা বাল্ক ইম্পোর্ট)।", "Create your client list (single or bulk import).")}</p>
          <p>3. {t("বিলিং তালিকা থেকে মাসিক বিল জেনারেট ও কালেকশন করুন।", "Generate monthly bills and collect from billing list.")}</p>
        </CardContent>
      </Card>

      {!customer?.panel_access_enabled && (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 border">
          {t("প্যানেল সাবস্ক্রিপশন নিষ্ক্রিয় — কিছু ফিচার সীমিত হতে পারে", "Panel subscription inactive — some features may be limited")}
        </Badge>
      )}
    </div>
  );
}
