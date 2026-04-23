import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import {
  GradientHeader, PillTabs, ListRow,
} from "@/components/mobile";
import { Badge } from "@/components/ui/badge";
import { CreateTicketDialog } from "@/components/portal/CreateTicketDialog";
import { TicketConversation } from "@/components/portal/TicketConversation";
import {
  Plus, MessageSquare, ChevronLeft,
  AlertCircle, CheckCircle2, Clock,
} from "lucide-react";
import type { IconTint } from "@/components/mobile";

const statusMeta: Record<string, { tint: IconTint; label: string; badgeClass: string; icon: typeof MessageSquare }> = {
  open:    { tint: "sky",     label: "ওপেন",     badgeClass: "bg-sky-100 text-sky-700 border-0",         icon: MessageSquare },
  pending: { tint: "amber",   label: "অপেক্ষমান",  badgeClass: "bg-amber-100 text-amber-700 border-0",     icon: Clock },
  solved:  { tint: "emerald", label: "সমাধান",    badgeClass: "bg-emerald-100 text-emerald-700 border-0", icon: CheckCircle2 },
  closed:  { tint: "slate",   label: "বন্ধ",      badgeClass: "bg-slate-100 text-slate-700 border-0",     icon: CheckCircle2 },
};

const PortalSupport = () => {
  const { customer } = usePortalAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [tab, setTab] = useState<"open" | "closed">("open");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["portal-tickets", customer?.sub],
    queryFn: async () => {
      let q = supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
      if (customer?.type === "client") q = q.eq("client_id", customer!.sub);
      const { data } = await q;
      return data || [];
    },
    enabled: !!customer?.sub,
  });

  const openT = useMemo(() => tickets.filter((t) => ["open", "pending"].includes(t.status)), [tickets]);
  const closedT = useMemo(() => tickets.filter((t) => ["solved", "closed"].includes(t.status)), [tickets]);
  const list = tab === "open" ? openT : closedT;

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
          title="সাপোর্ট টিকেট"
          subtitle="সাপোর্ট টিমের সাথে যোগাযোগ"
          rightSlot={
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-9 px-3 rounded-full bg-white text-rose-600 text-xs font-bold shadow inline-flex items-center gap-1 active:scale-95 transition-transform"
            >
              <Plus className="h-3.5 w-3.5" /> নতুন
            </button>
          }
          statLabel="খোলা টিকেট"
          statValue={openT.length}
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
          fab={{ onClick: () => setCreateOpen(true), icon: Plus, label: "New Ticket" }}
        />
      }
    >
      <div className="space-y-4 pt-3">
        <PillTabs
          value={tab}
          onChange={(v) => setTab(v as any)}
          tabs={[
            { value: "open", label: "চলমান", count: openT.length },
            { value: "closed", label: "সমাধান", count: closedT.length },
          ]}
        />

        {isLoading ? (
          <div className="m-card p-10 text-center text-xs text-muted-foreground">লোড হচ্ছে...</div>
        ) : list.length === 0 ? (
          <div className="m-card p-10 text-center text-xs text-muted-foreground space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <div>কোনো টিকেট নেই</div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mx-auto px-4 py-2 rounded-full m-hero-gradient text-white text-xs font-bold inline-flex items-center gap-1.5 shadow"
            >
              <Plus className="h-3.5 w-3.5" /> নতুন টিকেট তৈরি করুন
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((t: any) => {
              const meta = statusMeta[t.status] || statusMeta.open;
              return (
                <ListRow
                  key={t.id}
                  icon={meta.icon}
                  iconTint={meta.tint}
                  title={t.subject || `Ticket #${t.id?.slice?.(0, 6)}`}
                  subtitle={
                    <>
                      {t.priority && <span className="capitalize">{t.priority} · </span>}
                      {new Date(t.created_at).toLocaleDateString()}
                    </>
                  }
                  badge={<Badge className={meta.badgeClass + " text-[10px]"}>{meta.label}</Badge>}
                  onClick={() => setActiveTicket(t)}
                />
              );
            })}
          </div>
        )}
      </div>

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} />
      {activeTicket && (
        <TicketConversation
          ticket={activeTicket}
          onOpenChange={(o) => !o && setActiveTicket(null)}
        />
      )}
    </MobileShell>
  );
};

export default PortalSupport;
