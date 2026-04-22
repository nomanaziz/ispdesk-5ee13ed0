import { Link } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useQuery } from "@tanstack/react-query";
import { callPortal } from "@/lib/portalApi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Package, Wifi, Wallet, FileText, CreditCard, Bell, Sparkles,
  UserCog, User, Activity, Clock,
  Phone, Mail, MapPin, IdCard, Hash, KeyRound,
  Calendar, Banknote, ArrowRightLeft, MessageSquare, Smartphone, ChevronRight, Inbox,
} from "lucide-react";

const PortalDashboard = () => {
  const { customer } = usePortalAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["portal-dashboard", customer?.sub],
    queryFn: () => callPortal<any>("get_dashboard"),
    enabled: !!customer?.sub,
  });

  const isClient = customer?.type === "client";
  const clientRow = data?.client;
  const bills = data?.bills || data?.invoices || [];
  const notices = data?.notices || [];

  // Prefer DB name (so approved profile-update reflects without token refresh)
  const fullName = clientRow?.name || customer?.name || "Customer";

  const totalDue = bills.reduce((s: number, b: any) => {
    const due = b.due != null ? Number(b.due) : Number(b.amount || 0) - Number(b.paid_amount || b.paid || 0);
    return s + (isFinite(due) ? due : 0);
  }, 0);
  const lastInvoice = bills[0];
  const isOnline = clientRow?.is_online ?? false;
  const status = clientRow?.status || clientRow?.billing_status || "Active";
  const pkg = clientRow?.package;
  const pkgName = pkg?.name || "—";
  const speedStr = pkg?.bandwidth_down
    ? `${pkg.bandwidth_down}${pkg.bandwidth_up ? `/${pkg.bandwidth_up}` : ""} Mbps`
    : (clientRow?.speed || "—");
  const balance = data?.balance?.due ?? 0;
  const lastLogin = data?.last_login;

  const initials =
    fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  const chips = [
    { icon: User, label: "Username", value: clientRow?.username || customer?.username || "—", tint: "text-violet-600 bg-violet-100" },
    { icon: Package, label: "Package", value: pkgName, tint: "text-emerald-600 bg-emerald-100" },
    { icon: Gauge, label: "Speed", value: speedStr, tint: "text-sky-600 bg-sky-100" },
    { icon: Cable, label: "Connection", value: clientRow?.connection_type || "—", tint: "text-amber-600 bg-amber-100" },
    { icon: ShieldCheck, label: "Protocol", value: clientRow?.protocol_type || "—", tint: "text-indigo-600 bg-indigo-100" },
    { icon: Activity, label: "Status", value: status, tint: isOnline ? "text-green-600 bg-green-100" : "text-rose-600 bg-rose-100" },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {notices.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-amber-100 flex items-center justify-center">
            <Bell className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Notice</span>
              {notices[0].pinned && <Badge className="bg-amber-200 text-amber-900 text-[10px] h-4 px-1.5">Pinned</Badge>}
            </div>
            <div className="text-sm font-semibold text-amber-950 mt-0.5 truncate">{notices[0].title}</div>
            <div className="text-xs text-amber-900/90 line-clamp-2">{notices[0].body}</div>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-amber-900 hover:bg-amber-100 hidden sm:inline-flex">
            <Link to="/portal/notices">View all</Link>
          </Button>
        </div>
      )}

      {/* Hero */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="relative bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 text-white p-5 sm:p-7">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row gap-5 lg:items-center">
            <div className="flex items-center gap-4 min-w-0">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-4 ring-white/30 shadow-xl shrink-0">
                {clientRow?.photo_url && <img src={clientRow.photo_url} alt={fullName} className="object-cover" />}
                <AvatarFallback className="bg-white/20 backdrop-blur text-white text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-white/90 text-xs">
                  <Sparkles className="h-3 w-3" /> Welcome back
                </div>
                <h1 className="text-xl sm:text-2xl font-bold mt-0.5 truncate">{fullName}</h1>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <Badge className="bg-white/25 hover:bg-white/30 text-white border-0 text-[10px] uppercase tracking-wide">{pkgName}</Badge>
                  <Badge className={`text-[10px] uppercase border-0 ${isOnline ? "bg-emerald-400/40 text-emerald-50" : "bg-slate-400/40 text-slate-50"}`}>● {isOnline ? "Online" : "Offline"}</Badge>
                  <Badge className="bg-white/20 text-white border-0 text-[10px]">@{clientRow?.username || customer?.username}</Badge>
                </div>
              </div>
            </div>
            <div className="lg:ml-auto flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary" className="bg-white text-violet-700 hover:bg-white/90 shadow">
                <Link to={isClient ? "/portal/bills" : "/portal/invoices"}><FileText className="h-4 w-4" /> {isClient ? "মাসিক বিল" : "Invoices"}</Link>
              </Button>
              <Button asChild size="sm" variant="secondary" className="bg-white/15 text-white hover:bg-white/25 backdrop-blur border-0">
                <Link to="/portal/profile"><UserCog className="h-4 w-4" /> Profile</Link>
              </Button>
              <Button asChild size="sm" className="bg-emerald-400 hover:bg-emerald-500 text-emerald-950 font-semibold shadow">
                <Link to={isClient ? "/portal/bills" : "/portal/invoices"}><CreditCard className="h-4 w-4" /> Pay Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Compact icon-chip strip (replaces stat cards + Service Overview) */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-2 rounded-full bg-muted/40 hover:bg-muted/60 transition-colors px-2.5 py-1.5 min-w-0"
              >
                <span className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${c.tint}`}>
                  <c.icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">{c.label}</div>
                  <div className="text-xs font-semibold text-foreground truncate max-w-[140px]">{c.value}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Client Details + Activity & Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Client Details */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <IdCard className="h-4 w-4 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-foreground">Client Details</h3>
              <Button asChild size="sm" variant="ghost" className="ml-auto text-xs">
                <Link to="/portal/profile">Edit</Link>
              </Button>
            </div>
            <dl className="space-y-2.5 text-sm">
              <DetailRow icon={Hash} iconTint="text-violet-600 bg-violet-100" label="Customer Code" value={clientRow?.client_id || customer?.code || "—"} />
              <DetailRow icon={User} iconTint="text-sky-600 bg-sky-100" label="Name" value={fullName} />
              <DetailRow icon={Phone} iconTint="text-emerald-600 bg-emerald-100" label="Mobile" value={clientRow?.contact || "—"} />
              <DetailRow icon={Mail} iconTint="text-rose-600 bg-rose-100" label="Email" value={clientRow?.email || "—"} />
              <DetailRow icon={MapPin} iconTint="text-amber-600 bg-amber-100" label="Address" value={clientRow?.present_address || clientRow?.address || "—"} />
              <DetailRow icon={Wifi} iconTint="text-cyan-600 bg-cyan-100" label="Zone" value={clientRow?.zone?.name || "—"} />
              <DetailRow icon={IdCard} iconTint="text-fuchsia-600 bg-fuchsia-100" label="NID" value={clientRow?.nid_number || "—"} />
            </dl>
          </CardContent>
        </Card>

        {/* Activity & Ledger panel */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Activity className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-foreground">Activity & Ledger</h3>
            </div>

            {/* ID + Last Login */}
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2.5 mb-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Your ID</div>
                <div className="text-sm font-semibold text-foreground truncate">@{clientRow?.username || customer?.username}</div>
              </div>
              <div className="text-right min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock className="h-3 w-3" /> Last Login
                </div>
                <div className="text-xs font-medium text-foreground truncate">
                  {lastLogin ? new Date(lastLogin).toLocaleString() : "This session"}
                </div>
              </div>
            </div>

            {/* Ledger highlight */}
            <div className={`rounded-xl p-4 mb-3 ${balance > 0 ? "bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200/60" : "bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/60"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Wallet className="h-3 w-3" /> Ledger Balance
                  </div>
                  <div className={`text-2xl font-extrabold mt-1 ${balance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    ৳{Number(balance).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {balance > 0 ? `${totalDue.toLocaleString()} ৳ total due across ${bills.length} bills` : "All clear — no dues"}
                  </div>
                </div>
                {balance > 0 && (
                  <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-700 text-white shadow">
                    <Link to={isClient ? "/portal/bills" : "/portal/invoices"}>
                      <CreditCard className="h-4 w-4" /> Pay Now
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Last invoice */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-8 w-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Last Invoice</div>
                  <div className="text-sm font-semibold text-foreground truncate">
                    {lastInvoice ? `#${lastInvoice.bill_id || lastInvoice.invoice_no}` : "—"}
                    <span className="text-muted-foreground font-normal ml-1">{lastInvoice?.month || ""}</span>
                  </div>
                </div>
              </div>
              {lastInvoice && (
                <Badge className={lastInvoice.status === "paid" ? "bg-emerald-500 text-white border-0" : "bg-rose-500 text-white border-0"}>
                  {lastInvoice.status}
                </Badge>
              )}
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-3 gap-2">
              <QuickLink to="/portal/profile" icon={KeyRound} label="Password" tint="text-amber-600 bg-amber-100" />
              <QuickLink to="/portal/profile" icon={UserCog} label="Profile" tint="text-indigo-600 bg-indigo-100" />
              <QuickLink to="/portal/messages" icon={MessageSquare} label="Messages" tint="text-rose-600 bg-rose-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading && <div className="text-center text-xs text-muted-foreground">লোড হচ্ছে...</div>}
    </div>
  );
};

const DetailRow = ({
  icon: Icon, iconTint, label, value,
}: { icon: any; iconTint: string; label: string; value: React.ReactNode }) => (
  <div className="flex items-center gap-3 border-b border-dashed border-border/60 last:border-0 pb-2 last:pb-0">
    <span className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${iconTint}`}>
      <Icon className="h-3.5 w-3.5" />
    </span>
    <dt className="text-muted-foreground text-xs min-w-[90px]">{label}</dt>
    <dd className="font-semibold text-foreground text-right truncate flex-1 text-sm">{value}</dd>
  </div>
);

const QuickLink = ({
  to, icon: Icon, label, tint,
}: { to: string; icon: any; label: string; tint: string }) => (
  <Link
    to={to}
    className="flex flex-col items-center gap-1 rounded-xl border border-border/60 hover:border-border hover:bg-muted/40 transition-colors py-2.5"
  >
    <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${tint}`}>
      <Icon className="h-4 w-4" />
    </span>
    <span className="text-[11px] font-medium text-foreground">{label}</span>
  </Link>
);

export default PortalDashboard;
