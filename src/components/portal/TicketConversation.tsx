import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  ticket: any | null;
  onOpenChange: (v: boolean) => void;
}

const statusBadge: Record<string, string> = {
  open: "bg-sky-100 text-sky-700",
  pending: "bg-amber-100 text-amber-700",
  solved: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-700",
};

export const TicketConversation = ({ ticket, onOpenChange }: Props) => {
  const { customer } = usePortalAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["ticket-messages", ticket?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at");
      return data || [];
    },
    enabled: !!ticket?.id,
    refetchInterval: 8000,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        sender_type: "client",
        sender_id: customer?.sub,
        sender_name: customer?.name,
        message: reply,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["ticket-messages", ticket?.id] });
    },
  });

  if (!ticket) return null;

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-5 border-b bg-gradient-to-r from-violet-50 to-indigo-50 flex-row items-start justify-between space-y-0">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base">{ticket.subject}</DialogTitle>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge className={`${statusBadge[ticket.status] || statusBadge.open} border-0 capitalize`}>
                {ticket.status}
              </Badge>
              <span className="text-xs text-muted-foreground">#{ticket.ticket_no}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground capitalize">{ticket.priority} priority</span>
            </div>
          </div>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
          {messages?.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">No messages yet</div>
          )}
          {messages?.map((m) => {
            const isClient = m.sender_type === "client";
            return (
              <div key={m.id} className={cn("flex gap-2", isClient ? "justify-end" : "justify-start")}>
                {!isClient && (
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px]">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                  isClient
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-br-sm"
                    : "bg-white border rounded-bl-sm"
                )}>
                  <div className={cn("text-[10px] font-medium mb-0.5", isClient ? "text-white/70" : "text-muted-foreground")}>
                    {isClient ? "You" : (m.sender_name || "Support")}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{m.message}</div>
                  <div className={cn("text-[9px] mt-1", isClient ? "text-white/60" : "text-muted-foreground")}>
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
                {isClient && (
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-violet-100 text-violet-700 text-[10px]">
                      <User className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
        </div>

        {ticket.status !== "solved" && ticket.status !== "closed" && (
          <div className="border-t p-3 bg-white flex gap-2 items-end">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply…"
              rows={2}
              className="resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (reply.trim()) send.mutate();
                }
              }}
            />
            <Button
              size="icon"
              onClick={() => send.mutate()}
              disabled={!reply.trim() || send.isPending}
              className="bg-gradient-to-br from-violet-500 to-indigo-600 h-10 w-10 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
