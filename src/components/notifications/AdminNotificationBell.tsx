import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ShoppingBag, UserPlus, Wallet, AlertTriangle, CalendarClock, CheckCheck, CalendarDays, UserX, ClipboardList, UserCog, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDistanceToNow } from "date-fns";

type Notif = {
  id: string;
  kind: "order" | "request" | "paid" | "low_balance" | "subscription"
      | "leave" | "advance" | "resignation" | "requisition" | "profile_change" | "conveyance";
  title: string;
  meta: string;
  href: string;
  createdAt: string; // ISO
};

const KIND_META: Record<Notif["kind"], { icon: any; tone: string }> = {
  order:          { icon: ShoppingBag,    tone: "text-pink-600 bg-pink-100 dark:bg-pink-500/15" },
  request:        { icon: UserPlus,       tone: "text-blue-600 bg-blue-100 dark:bg-blue-500/15" },
  paid:           { icon: Wallet,         tone: "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/15" },
  low_balance:    { icon: AlertTriangle,  tone: "text-amber-600 bg-amber-100 dark:bg-amber-500/15" },
  subscription:   { icon: CalendarClock,  tone: "text-violet-600 bg-violet-100 dark:bg-violet-500/15" },
  leave:          { icon: CalendarDays,   tone: "text-cyan-600 bg-cyan-100 dark:bg-cyan-500/15" },
  advance:        { icon: Wallet,         tone: "text-orange-600 bg-orange-100 dark:bg-orange-500/15" },
  resignation:    { icon: UserX,          tone: "text-red-600 bg-red-100 dark:bg-red-500/15" },
  requisition:    { icon: ClipboardList,  tone: "text-indigo-600 bg-indigo-100 dark:bg-indigo-500/15" },
  profile_change: { icon: UserCog,        tone: "text-fuchsia-600 bg-fuchsia-100 dark:bg-fuchsia-500/15" },
  conveyance:     { icon: Receipt,        tone: "text-teal-600 bg-teal-100 dark:bg-teal-500/15" },
};

const SEEN_KEY = "admin-notif-seen-ids";
const loadSeen = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); }
};
const saveSeen = (s: Set<string>) => {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-500))); } catch { /* noop */ }
};

async function fetchNotifications(): Promise<Notif[]> {
  const sevenAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const next7 = new Date(Date.now() + 7 * 86400_000).toISOString();
  const out: Notif[] = [];

  const [orders, requests, paid, lowBal, subs, leaves, advances, resigs, reqs, profCh, conv] = await Promise.all([
    supabase.from("shop_orders")
      .select("id, order_no, customer_name, total, created_at, order_status")
      .gte("created_at", sevenAgo)
      .in("order_status", ["pending", "processing"])
      .order("created_at", { ascending: false }).limit(20),
    supabase.from("client_requests")
      .select("id, name, contact, created_at, status")
      .gte("created_at", sevenAgo)
      .in("status", ["pending", "new", "open"])
      .order("created_at", { ascending: false }).limit(20),
    supabase.from("reseller_pgw_payments")
      .select("id, status, created_at")
      .gte("created_at", sevenAgo)
      .eq("status", "settled")
      .order("created_at", { ascending: false }).limit(10),
    supabase.from("branch_managers")
      .select("id, name, balance, created_at")
      .lt("balance", 500)
      .order("balance", { ascending: true }).limit(15),
    supabase.from("bw_sale_customers")
      .select("id, customer_name, panel_subscription_expires_at, active_client_count, panel_user_limit, created_at")
      .not("panel_subscription_expires_at", "is", null)
      .lte("panel_subscription_expires_at", next7)
      .order("panel_subscription_expires_at", { ascending: true }).limit(15),
    supabase.from("leave_applications")
      .select("id, start_date, end_date, days, status, created_at, employees(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }).limit(20),
    supabase.from("salary_advance_requests" as any)
      .select("id, amount, status, created_at, employees(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }).limit(20),
    supabase.from("resignation_requests" as any)
      .select("id, effective_date, status, created_at, employees(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }).limit(20),
    supabase.from("requisitions" as any)
      .select("id, item_name, quantity, status, created_at, request_type, employees(name)")
      .eq("status", "pending")
      .eq("request_type", "employee")
      .order("created_at", { ascending: false }).limit(20),
    supabase.from("profile_change_requests" as any)
      .select("id, status, created_at, employees(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }).limit(20),
    supabase.from("conveyance_bills" as any)
      .select("id, bill_date, fare_amount, other_amount, status, created_at, employees(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }).limit(20),
  ]);

  (orders.data || []).forEach((o: any) => out.push({
    id: `order:${o.id}`, kind: "order",
    title: `নতুন অর্ডার ${o.order_no || ""}`.trim(),
    meta: `${o.customer_name || "Customer"} · ৳${o.total || 0}`,
    href: `/dashboard/shop/orders`, createdAt: o.created_at,
  }));
  (requests.data || []).forEach((r: any) => out.push({
    id: `req:${r.id}`, kind: "request",
    title: `নতুন কানেকশন রিকোয়েস্ট`,
    meta: `${r.name || "—"} · ${r.contact || ""}`,
    href: `/dashboard/clients/new-request`, createdAt: r.created_at,
  }));
  (paid.data || []).forEach((p: any) => out.push({
    id: `paid:${p.id}`, kind: "paid",
    title: `পেমেন্ট সেটেলড`,
    meta: `Reseller PGW payment received`,
    href: `/dashboard/branches/pgw-transactions`, createdAt: p.created_at,
  }));
  (lowBal.data || []).forEach((b: any) => out.push({
    id: `low:${b.id}`, kind: "low_balance",
    title: `${b.name || "POP"} — Low Balance`,
    meta: `Balance: ৳${Number(b.balance || 0).toFixed(2)}`,
    href: `/dashboard/branches/funding`, createdAt: b.created_at || new Date().toISOString(),
  }));
  (subs.data || []).forEach((s: any) => {
    const exp = new Date(s.panel_subscription_expires_at);
    const expired = exp.getTime() < Date.now();
    out.push({
      id: `sub:${s.id}`, kind: "subscription",
      title: expired ? `${s.customer_name} — Subscription Expired` : `${s.customer_name} — Expiring Soon`,
      meta: `${s.active_client_count || 0}/${s.panel_user_limit || 0} users · ${exp.toLocaleDateString()}`,
      href: `/dashboard/bw-sale/panel-pricing`, createdAt: s.panel_subscription_expires_at,
    });
  });
  (leaves.data || []).forEach((l: any) => out.push({
    id: `leave:${l.id}`, kind: "leave",
    title: `ছুটির আবেদন — ${l.employees?.name || "কর্মী"}`,
    meta: `${l.start_date} → ${l.end_date} · ${l.days || 0} দিন`,
    href: `/dashboard/hr/employee-hub?tab=leave`, createdAt: l.created_at,
  }));
  (advances.data || []).forEach((a: any) => out.push({
    id: `adv:${a.id}`, kind: "advance",
    title: `অগ্রিম বেতন — ${a.employees?.name || "কর্মী"}`,
    meta: `৳${Number(a.amount || 0).toLocaleString()}`,
    href: `/dashboard/hr/employee-hub?tab=advance`, createdAt: a.created_at,
  }));
  (resigs.data || []).forEach((r: any) => out.push({
    id: `resig:${r.id}`, kind: "resignation",
    title: `পদত্যাগ — ${r.employees?.name || "কর্মী"}`,
    meta: `কার্যকর: ${r.effective_date || "—"}`,
    href: `/dashboard/hr/employee-hub?tab=resignation`, createdAt: r.created_at,
  }));
  (reqs.data || []).forEach((r: any) => out.push({
    id: `rq:${r.id}`, kind: "requisition",
    title: `রিকুইজিশন — ${r.employees?.name || "কর্মী"}`,
    meta: `${r.item_name || "—"} × ${r.quantity || 1}`,
    href: `/dashboard/hr/employee-hub?tab=requisition`, createdAt: r.created_at,
  }));
  (profCh.data || []).forEach((p: any) => out.push({
    id: `pc:${p.id}`, kind: "profile_change",
    title: `প্রোফাইল পরিবর্তন — ${p.employees?.name || "কর্মী"}`,
    meta: `Approval pending`,
    href: `/dashboard/hr/employee-hub?tab=profile`, createdAt: p.created_at,
  }));
  (conv.data || []).forEach((c: any) => out.push({
    id: `conv:${c.id}`, kind: "conveyance",
    title: `কনভেয়েন্স বিল — ${c.employees?.name || "কর্মী"}`,
    meta: `${c.bill_date} · ৳${Number((c.fare_amount || 0) + (c.other_amount || 0)).toLocaleString()}`,
    href: `/dashboard/hr/employee-hub?tab=conveyance`, createdAt: c.created_at,
  }));

  out.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return out;
}

export function AdminNotificationBell() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => loadSeen());

  const { data: items = [] } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Realtime: refetch on key table changes
  useEffect(() => {
    const channel = supabase
      .channel("admin-notif")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "shop_orders" },
        () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "client_requests" },
        () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const unread = useMemo(() => items.filter(n => !seen.has(n.id)).length, [items, seen]);

  const markAll = () => {
    const next = new Set(seen);
    items.forEach(n => next.add(n.id));
    setSeen(next);
    saveSeen(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground relative"
          title={t("নোটিফিকেশন", "Notifications")}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-sm font-semibold">{t("নোটিফিকেশন", "Notifications")}</div>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={markAll} disabled={!unread}>
            <CheckCheck className="h-3.5 w-3.5" />
            {t("সব পঠিত", "Mark all read")}
          </Button>
        </div>
        <ScrollArea className="max-h-[460px]">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t("কোন নতুন নোটিফিকেশন নেই", "No new notifications")}
            </div>
          ) : (
            <ul className="divide-y">
              {items.map(n => {
                const cfg = KIND_META[n.kind];
                const Icon = cfg.icon;
                const isUnread = !seen.has(n.id);
                return (
                  <li key={n.id}>
                    <Link
                      to={n.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex gap-3 px-3 py-2.5 hover:bg-accent transition-colors",
                        isUnread && "bg-primary/5",
                      )}
                    >
                      <span className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", cfg.tone)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium truncate">{n.title}</div>
                        <div className="text-[11.5px] text-muted-foreground truncate">{n.meta}</div>
                        <div className="text-[10.5px] text-muted-foreground/80 mt-0.5">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                      {isUnread && <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
