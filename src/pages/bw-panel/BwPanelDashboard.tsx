import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Server, Users, Receipt, Wallet, LifeBuoy, MessageSquare, BarChart3, Settings,
  Sparkles, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const tiles = [
  { to: "/bw-panel/mikrotik",        bn: "MikroTik সার্ভার",  en: "MikroTik Servers", icon: Server },
  { to: "/bw-panel/clients",         bn: "ক্লায়েন্ট তালিকা",   en: "Clients",          icon: Users },
  { to: "/bw-panel/billing",         bn: "বিলিং তালিকা",      en: "Billing",          icon: Receipt },
  { to: "/bw-panel/billing/daily",   bn: "দৈনিক সংগ্রহ",       en: "Daily Collection", icon: Wallet },
  { to: "/bw-panel/tickets",         bn: "সাপোর্ট টিকেট",      en: "Support Tickets",  icon: LifeBuoy },
  { to: "/bw-panel/sms/send",        bn: "এসএমএস পাঠান",      en: "Send SMS",         icon: MessageSquare },
  { to: "/bw-panel/employees",       bn: "কর্মচারী",           en: "Employees",        icon: Users },
  { to: "/bw-panel/accounting/income", bn: "হিসাব",            en: "Accounting",       icon: Wallet },
  { to: "/bw-panel/reports/bill-collection", bn: "রিপোর্ট",   en: "Reports",          icon: BarChart3 },
  { to: "/bw-panel/settings",        bn: "সেটিংস",            en: "Settings",         icon: Settings },
];

export default function BwPanelDashboard() {
  const { customer } = usePortalAuth();
  const { t, lang } = useLanguage();
  const expiresAt = customer?.panel_subscription_expires_at;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000)) : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-gradient-to-br from-emerald-500/10 via-primary/5 to-transparent p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
              {t("আমার নিজস্ব প্যানেল", "My Independent Panel")}
            </div>
            <h1 className="text-2xl font-bold mt-1">
              {t(`স্বাগতম, ${customer?.name || ""}`, `Welcome, ${customer?.name || ""}`)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {t(
                "এখান থেকে আপনি নিজের MikroTik, ক্লায়েন্ট, বিলিং, কর্মচারী এবং হিসাব ম্যানেজ করতে পারবেন। এটি অ্যাডমিন থেকে সম্পূর্ণ স্বাধীন।",
                "Manage your own MikroTik servers, clients, billing, employees and accounting from here. Fully independent from admin.",
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 border">
              {customer?.panel_user_limit || 0} {t("ইউজার লিমিট", "user limit")}
            </Badge>
            <span className="text-xs text-muted-foreground">{daysLeft} {t("দিন বাকি", "days left")}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.to}
              to={tile.to}
              className="group rounded-lg border bg-card p-4 hover:bg-accent hover:border-primary/40 transition-all hover:shadow-md"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-sm font-semibold">{lang === "bn" ? tile.bn : tile.en}</div>
              <div className="mt-2 inline-flex items-center text-xs text-muted-foreground group-hover:text-primary">
                {t("খুলুন", "Open")} <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("শুরু করুন", "Getting Started")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. {t("প্রথমে আপনার MikroTik সার্ভার যোগ করুন।", "Add your MikroTik server first.")}</p>
          <p>2. {t("ক্লায়েন্ট তালিকা তৈরি করুন (একক বা বাল্ক ইম্পোর্ট)।", "Create your client list (single or bulk import).")}</p>
          <p>3. {t("বিলিং তালিকা থেকে মাসিক বিল জেনারেট ও কালেকশন করুন।", "Generate monthly bills and collect from billing list.")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
