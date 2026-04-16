import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HeadphonesIcon, Plus, MessageSquare, Clock } from "lucide-react";
import { CreateTicketDialog } from "@/components/portal/CreateTicketDialog";
import { TicketConversation } from "@/components/portal/TicketConversation";

const statusColor: Record<string, string> = {
  open: "bg-sky-100 text-sky-700",
  pending: "bg-amber-100 text-amber-700",
  solved: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-700",
};

const priorityColor: Record<string, string> = {
  low: "text-slate-500",
  normal: "text-sky-600",
  high: "text-amber-600",
  urgent: "text-rose-600",
};

const PortalSupport = () => {
  const { customer } = usePortalAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [tab, setTab] = useState("open");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["portal-tickets", customer?.sub],
    queryFn: async () => {
      let q = supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
      if (customer?.type === "client") q = q.eq("client_id", customer!.sub);
      const { data } = await q;
      return data || [];
    },
    enabled: !!customer?.sub,
  });

  const openT = tickets?.filter((t) => ["open", "pending"].includes(t.status)) || [];
  const closedT = tickets?.filter((t) => ["solved", "closed"].includes(t.status)) || [];
  const list = tab === "open" ? openT : closedT;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow">
            <HeadphonesIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Support Tickets</h1>
            <p className="text-sm text-muted-foreground">Talk to our support team</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-violet-500 to-indigo-600 shadow">
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="open">Open ({openT.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closedT.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-10 text-center text-muted-foreground">Loading…</CardContent>
            </Card>
          ) : list.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-14">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No {tab} tickets</p>
                {tab === "open" && (
                  <Button onClick={() => setCreateOpen(true)} variant="outline" size="sm" className="mt-3">
                    <Plus className="h-3.5 w-3.5" /> Create one
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {list.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTicket(t)}
                  className="w-full text-left"
                >
                  <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-violet-600 shrink-0">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="font-semibold text-sm truncate">{t.subject}</div>
                            <Badge className={`${statusColor[t.status] || statusColor.open} border-0 capitalize text-[10px]`}>
                              {t.status}
                            </Badge>
                          </div>
                          {t.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                            <span className="font-mono">#{t.ticket_no}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(t.created_at).toLocaleDateString()}
                            </span>
                            <span className={`capitalize font-medium ${priorityColor[t.priority] || ""}`}>
                              {t.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TicketConversation ticket={activeTicket} onOpenChange={(v) => !v && setActiveTicket(null)} />
    </div>
  );
};

export default PortalSupport;
