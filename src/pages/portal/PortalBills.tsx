import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useQuery } from "@tanstack/react-query";
import { callPortal } from "@/lib/portalApi";
import {
  MobileShell, GradientHeader, PillTabs, ListRow, BottomNav, StatCardPair,
} from "@/components/mobile";
import { Badge } from "@/components/ui/badge";
import {
  Receipt, Wallet, ChevronLeft, FileText, CreditCard, TrendingUp, TrendingDown,
  Home, HeadphonesIcon, UserCog, Plus,
} from "lucide-react";

const PortalBills = () => {
  const { customer } = usePortalAuth();
  const [tab, setTab] = useState<"all" | "due" | "paid">("all");

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["portal-bills", customer?.sub],
    queryFn: async () => {
      const res = await callPortal<any>("get_bills");
      return (res.bills || []) as any[];
    },
    enabled: !!customer?.sub && customer?.type === "client",
  });

  const totals = useMemo(() => {
    const amount = bills.reduce((s, b) => s + Number(b.amount || 0), 0);
    const paid = bills.reduce((s, b) => s + Number(b.paid || 0), 0);
    const due = bills.reduce((s, b) => s + Number(b.due || 0), 0);
    const dueCount = bills.filter((b) => Number(b.due || 0) > 0).length;
    const paidCount = bills.filter((b) => b.status === "paid").length;
    return { amount, paid, due, dueCount, paidCount };
  }, [bills]);

  const filtered = useMemo(() => {
    if (tab === "due") return bills.filter((b) => Number(b.due || 0) > 0);
    if (tab === "paid") return bills.filter((b) => b.status === "paid");
    return bills;
  }, [bills, tab]);

  return (
    <MobileShell
      scope="portal"
      header={
        <GradientHeader
          variant="rose"
          leftSlot={
            <Link to="/portal/dashboard" className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          }
          title="মাসিক বিল"
          subtitle="আপনার সকল বিল ও পেমেন্ট"
          statLabel="মোট বকেয়া"
          statValue={`৳ ${totals.due.toLocaleString()}`}
        />
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
      <div className="space-y-4 pt-3">
        <StatCardPair
          left={{ label: "মোট বিল", value: `৳${totals.amount.toLocaleString()}`, icon: TrendingUp, tone: "info" }}
          right={{ label: "পরিশোধিত", value: `৳${totals.paid.toLocaleString()}`, icon: TrendingDown, tone: "success", hint: `${totals.paidCount} টি` }}
        />

        <PillTabs
          value={tab}
          onChange={(v) => setTab(v as any)}
          tabs={[
            { value: "all", label: "সব", count: bills.length },
            { value: "due", label: "বকেয়া", count: totals.dueCount },
            { value: "paid", label: "পরিশোধিত", count: totals.paidCount },
          ]}
        />

        {isLoading ? (
          <div className="m-card p-10 text-center text-xs text-muted-foreground">লোড হচ্ছে...</div>
        ) : filtered.length === 0 ? (
          <div className="m-card p-10 text-center text-xs text-muted-foreground">কোনো বিল পাওয়া যায়নি</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((b) => {
              const isDue = Number(b.due || 0) > 0;
              const paid = b.status === "paid";
              return (
                <ListRow
                  key={b.id}
                  icon={paid ? Wallet : isDue ? CreditCard : Receipt}
                  iconTint={paid ? "emerald" : isDue ? "rose" : "amber"}
                  title={`#${b.bill_id}`}
                  subtitle={
                    <>
                      {b.month}
                      {Number(b.paid || 0) > 0 && ` · পরিশোধ ৳${Number(b.paid).toLocaleString()}`}
                    </>
                  }
                  badge={
                    <Badge className={
                      paid
                        ? "bg-emerald-100 text-emerald-700 border-0 text-[10px]"
                        : b.status === "partial"
                        ? "bg-amber-100 text-amber-700 border-0 text-[10px]"
                        : "bg-rose-100 text-rose-700 border-0 text-[10px]"
                    }>
                      {paid ? "পরিশোধিত" : b.status === "partial" ? "আংশিক" : "বকেয়া"}
                    </Badge>
                  }
                  amount={
                    <div>
                      <div>৳{Number(b.amount || 0).toLocaleString()}</div>
                      {isDue && <div className="text-[10px] text-rose-500 font-semibold">বকেয়া ৳{Number(b.due).toLocaleString()}</div>}
                    </div>
                  }
                  amountTone={isDue ? "danger" : paid ? "success" : "neutral"}
                  to={`/portal/bills/${b.id}`}
                  rightExtra={<FileText className="h-3.5 w-3.5 text-muted-foreground/60" />}
                />
              );
            })}
          </div>
        )}
      </div>
    </MobileShell>
  );
};

export default PortalBills;
