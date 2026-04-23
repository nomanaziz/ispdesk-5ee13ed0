import { Link } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useQuery } from "@tanstack/react-query";
import { callPortal } from "@/lib/portalApi";
import {
  MobileShell, GradientHeader, IconCard, IconGrid, StatCardPair, ListRow, BottomNav,
} from "@/components/mobile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Bell, Settings, Receipt, CreditCard, HeadphonesIcon, Activity, Package,
  UserCog, MessageSquare, Megaphone, Wallet, Rocket, ShoppingBag, BookOpen,
  Home, FileText, Plus, Wifi, TrendingUp, TrendingDown,
} from "lucide-react";

const PortalDashboardMobile = () => {
  const { customer } = usePortalAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["portal-dashboard", customer?.sub],
    queryFn: () => callPortal<any>("get_dashboard"),
    enabled: !!customer?.sub,
  });

  const clientRow = data?.client;
  const bills = data?.bills || data?.invoices || [];
  const fullName = clientRow?.name || customer?.name || "Customer";
  const balance = data?.balance?.due ?? 0;
  const isOnline = clientRow?.is_online ?? false;
  const pkg = clientRow?.package;
  const pkgName = pkg?.name || "—";
  const monthlyBill = clientRow?.monthly_bill ?? pkg?.price ?? 0;
  const paidThisMonth = bills
    .filter((b: any) => b.status === "paid")
    .reduce((s: number, b: any) => s + Number(b.paid || b.amount || 0), 0);

  const initials = fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  const recentBills = bills.slice(0, 4);

  return (
    <MobileShell
      scope="portal"
      header={
        <GradientHeader
          variant="rose"
          leftSlot={
            <Link to="/portal/profile" className="shrink-0">
              <Avatar className="h-10 w-10 ring-2 ring-white/40">
                <AvatarFallback className="bg-white/20 text-white font-bold text-sm">{initials}</AvatarFallback>
              </Avatar>
            </Link>
          }
          title={fullName}
          subtitle={
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-300 animate-pulse" : "bg-slate-300"}`} />
              {isOnline ? "অনলাইন" : "অফলাইন"} · {pkgName}
            </span>
          }
          rightSlot={
            <>
              <Link to="/portal/notices" className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
                <Bell className="h-4 w-4" />
              </Link>
              <Link to="/portal/profile" className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
                <Settings className="h-4 w-4" />
              </Link>
            </>
          }
          statLabel="বকেয়া বিল"
          statValue={`৳ ${Number(balance).toLocaleString()}`}
        >
          <div className="flex justify-center gap-2 mt-3">
            <Link
              to="/portal/bills"
              className="px-4 py-2 rounded-full bg-white text-rose-600 text-xs font-bold shadow active:scale-95 transition-transform inline-flex items-center gap-1.5"
            >
              <CreditCard className="h-3.5 w-3.5" /> পরিশোধ করুন
            </Link>
            <Link
              to="/portal/live-usage"
              className="px-4 py-2 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur active:scale-95 transition-transform inline-flex items-center gap-1.5"
            >
              <Activity className="h-3.5 w-3.5" /> ব্যবহার
            </Link>
          </div>
        </GradientHeader>
      }
      bottomNav={
        <BottomNav
          items={[
            { to: "/portal/dashboard", label: "হোম", icon: Home },
            { to: "/portal/bills", label: "বিল", icon: Receipt, matchPrefix: "/portal/bills" },
            { to: "/portal/support", label: "সাপোর্ট", icon: HeadphonesIcon },
            { to: "/portal/profile", label: "প্রোফাইল", icon: UserCog },
          ]}
          fab={{ to: "/portal/bills", icon: Plus, label: "Pay Bill" }}
        />
      }
    >
      <div className="space-y-5 pt-3">
        {/* Stat pair */}
        <StatCardPair
          left={{
            label: "এই মাসের বিল",
            value: `৳${Number(monthlyBill).toLocaleString()}`,
            icon: TrendingUp,
            tone: "info",
            hint: pkg?.bandwidth_down ? `${pkg.bandwidth_down} Mbps` : undefined,
          }}
          right={{
            label: "পরিশোধিত",
            value: `৳${paidThisMonth.toLocaleString()}`,
            icon: TrendingDown,
            tone: "success",
            hint: `${bills.length} বিল`,
          }}
        />

        {/* Quick Actions */}
        <IconGrid title="দ্রুত অ্যাকশন" cols={4}>
          <IconCard to="/portal/bills"      icon={Receipt}        label="মাসিক বিল" tint="emerald" />
          <IconCard to="/portal/invoices"   icon={FileText}       label="ইনভয়েস" tint="teal" />
          <IconCard to="/portal/ledger"     icon={BookOpen}       label="লেজার" tint="cyan" />
          <IconCard to="/portal/live-usage" icon={Activity}       label="ব্যবহার" tint="emerald" />
          <IconCard to="/portal/speed-test" icon={Rocket}         label="স্পিড টেস্ট" tint="rose" />
          <IconCard to="/portal/profile"    icon={Package}        label="প্যাকেজ" tint="violet" />
          <IconCard to="/portal/messages"   icon={MessageSquare}  label="মেসেজ" tint="violet" />
          <IconCard to="/portal/support"    icon={HeadphonesIcon} label="সাপোর্ট" tint="rose" />
          <IconCard to="/portal/notices"    icon={Megaphone}      label="নোটিশ" tint="amber" />
          <IconCard to="/portal/shop"       icon={ShoppingBag}    label="শপ" tint="pink" />
          <IconCard to="/portal/media"      icon={Wifi}           label="মিডিয়া" tint="indigo" />
          <IconCard to="/portal/profile"    icon={UserCog}        label="প্রোফাইল" tint="sky" />
        </IconGrid>

        {/* Recent Bills */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-foreground">সাম্প্রতিক বিল</h3>
            <Link to="/portal/bills" className="text-xs font-semibold text-rose-600">সব দেখুন →</Link>
          </div>

          {isLoading ? (
            <div className="m-card p-6 text-center text-xs text-muted-foreground">লোড হচ্ছে...</div>
          ) : recentBills.length === 0 ? (
            <div className="m-card p-6 text-center text-xs text-muted-foreground">কোনো বিল নেই</div>
          ) : (
            <div className="space-y-2">
              {recentBills.map((b: any) => {
                const due = Number(b.due ?? (Number(b.amount || 0) - Number(b.paid || 0)));
                const paid = b.status === "paid";
                return (
                  <ListRow
                    key={b.id}
                    icon={paid ? Wallet : Receipt}
                    iconTint={paid ? "emerald" : "rose"}
                    title={`#${b.bill_id}`}
                    subtitle={b.month}
                    badge={
                      <Badge className={paid ? "bg-emerald-100 text-emerald-700 border-0 text-[10px]" : "bg-rose-100 text-rose-700 border-0 text-[10px]"}>
                        {paid ? "পরিশোধিত" : "বকেয়া"}
                      </Badge>
                    }
                    amount={`৳${Number(b.amount || 0).toLocaleString()}`}
                    amountTone={paid ? "success" : "danger"}
                    to={`/portal/bills/${b.id}`}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </MobileShell>
  );
};

export default PortalDashboardMobile;
