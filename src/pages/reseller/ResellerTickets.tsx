import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { callPortal } from "@/lib/portalApi";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPopScope } from "@/lib/popScope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  LifeBuoy, Plus, Search, Send, ShieldCheck, User as UserIcon, MessageSquare, Check, ChevronsUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusBadge: Record<string, string> = {
  open: "bg-sky-100 text-sky-700",
  pending: "bg-amber-100 text-amber-700",
  solved: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-700",
};

const priorityBadge: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  normal: "bg-sky-100 text-sky-700",
  medium: "bg-sky-100 text-sky-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-rose-100 text-rose-700",
};

const ResellerTickets = () => {
  const { customer } = usePortalAuth();
  const { branchId } = getPopScope(customer);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);

  // POP-scoped client list (portal API — RLS-safe)
  const { data: clients = [] } = useQuery({
    queryKey: ["pop-ticket-clients", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const res = await callPortal<{ clients: any[] }>("pop_ticket_clients");
      return res.clients || [];
    },
  });

  const clientIdSet = useMemo(() => new Set(clients.map((c: any) => c.id)), [clients]);
  const clientsById = useMemo(() => {
    const m: Record<string, any> = {};
    clients.forEach((c: any) => (m[c.id] = c));
    return m;
  }, [clients]);

  const { data: tickets = [] } = useQuery({
    queryKey: ["pop-support-tickets", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const res = await callPortal<{ tickets: any[] }>("portal_list_tickets");
      return res.tickets || [];
    },
  });

  const filtered = useMemo(() => {
    return tickets.filter((t: any) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!search) return true;
      const c = clientsById[t.client_id];
      const blob = `${t.ticket_no} ${t.subject} ${c?.name || ""} ${c?.client_id || ""} ${c?.contact || ""}`.toLowerCase();
      return blob.includes(search.toLowerCase());
    });
  }, [tickets, statusFilter, search, clientsById]);

  const counts = useMemo(() => {
    const c = { all: tickets.length, open: 0, pending: 0, solved: 0, closed: 0 };
    tickets.forEach((t: any) => { (c as any)[t.status] = ((c as any)[t.status] || 0) + 1; });
    return c;
  }, [tickets]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Client Support Tickets</h1>
            <p className="text-sm text-muted-foreground">Tickets opened by your clients · {counts.all} total</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-violet-500 to-indigo-600 shadow">
          <Plus className="h-4 w-4 mr-1" /> New Ticket
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">All Tickets</CardTitle>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ticket, client…"
                  className="pl-8 h-9 w-56"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({counts.all})</SelectItem>
                  <SelectItem value="open">Open ({counts.open || 0})</SelectItem>
                  <SelectItem value="pending">Pending ({counts.pending || 0})</SelectItem>
                  <SelectItem value="solved">Solved ({counts.solved || 0})</SelectItem>
                  <SelectItem value="closed">Closed ({counts.closed || 0})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Ticket No</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                      No tickets found
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((t: any, i: number) => {
                  const c = clientsById[t.client_id];
                  return (
                    <TableRow key={t.id} className="hover:bg-muted/40">
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{t.ticket_no}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{c?.name || "—"}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {c?.client_id} {c?.contact && `· ${c.contact}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate text-sm">{t.subject}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${priorityBadge[t.priority] || priorityBadge.normal} border-0 capitalize`}>
                          {t.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusBadge[t.status] || statusBadge.open} border-0 capitalize`}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(t.created_at), "dd MMM yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setActiveTicket(t)}>
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PopCreateTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clients={clients}
        onCreated={() => qc.invalidateQueries({ queryKey: ["pop-support-tickets"] })}
      />
      <PopTicketConversation
        ticket={activeTicket}
        client={activeTicket ? clientsById[activeTicket.client_id] : null}
        onOpenChange={(v) => !v && setActiveTicket(null)}
      />
    </div>
  );
};

export default ResellerTickets;

/* ----------------------------- Create dialog ---------------------------- */

const PopCreateTicketDialog = ({
  open, onOpenChange, clients, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clients: any[];
  onCreated: () => void;
}) => {
  const [clientId, setClientId] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["pop-ticket-categories"],
    enabled: open,
    queryFn: async () => {
      const res = await callPortal<{ categories: any[] }>("pop_ticket_categories");
      return res.categories || [];
    },
  });

  const selectedClient = useMemo(
    () => clients.find((c: any) => c.id === clientId),
    [clients, clientId],
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Please select a client");
      if (!subject.trim()) throw new Error("Subject is required");
      await callPortal("pop_create_ticket", {
        client_id: clientId,
        category_id: categoryId || null,
        subject,
        description,
        priority,
      });
    },
    onSuccess: () => {
      toast.success("Ticket created");
      onCreated();
      onOpenChange(false);
      setClientId(undefined); setCategoryId(undefined);
      setSubject(""); setDescription(""); setPriority("normal");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Open Ticket for Client</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Client *</Label>
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {selectedClient ? (
                    <span className="truncate">
                      {selectedClient.name}
                      {selectedClient.client_id && (
                        <span className="text-muted-foreground"> · {selectedClient.client_id}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select client…</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command
                  filter={(value, search) => {
                    return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                  }}
                >
                  <CommandInput placeholder="Search by name, ID, contact…" />
                  <CommandList>
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((c: any) => {
                        const haystack = `${c.name || ""} ${c.client_id || ""} ${c.username || ""} ${c.contact || ""} ${c.mobile || ""}`;
                        return (
                          <CommandItem
                            key={c.id}
                            value={haystack}
                            onSelect={() => {
                              setClientId(c.id);
                              setClientPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                clientId === c.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm">{c.name}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {c.client_id} {c.contact && `· ${c.contact}`}
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select issue" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Subject *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Briefly describe the issue" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Details…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="bg-gradient-to-r from-violet-500 to-indigo-600"
          >
            {create.isPending ? "Submitting…" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ---------------------- Conversation / reply panel ---------------------- */

const PopTicketConversation = ({
  ticket, client, onOpenChange,
}: {
  ticket: any | null;
  client: any | null;
  onOpenChange: (v: boolean) => void;
}) => {
  const { customer } = usePortalAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["pop-ticket-messages", ticket?.id],
    enabled: !!ticket?.id,
    refetchInterval: 8000,
    queryFn: async () => {
      const { data } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at");
      return data || [];
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useMutation({
    mutationFn: async () => {
      await callPortal("pop_reply_ticket", { ticket_id: ticket.id, message: reply });
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["pop-ticket-messages", ticket?.id] });
      qc.invalidateQueries({ queryKey: ["pop-support-tickets"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      await callPortal("pop_set_ticket_status", { ticket_id: ticket.id, status });
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["pop-support-tickets"] });
      onOpenChange(false);
    },
  });

  if (!ticket) return null;

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-5 border-b bg-gradient-to-r from-violet-50 to-indigo-50 space-y-0">
          <DialogTitle className="text-base">{ticket.subject}</DialogTitle>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge className={`${statusBadge[ticket.status] || statusBadge.open} border-0 capitalize`}>{ticket.status}</Badge>
            <span className="text-xs text-muted-foreground">#{ticket.ticket_no}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{client?.name || "Unknown client"}</span>
            {client?.contact && <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{client.contact}</span>
            </>}
          </div>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
          {messages?.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">No messages yet</div>
          )}
          {messages?.map((m: any) => {
            const isAgent = m.sender_type === "agent";
            return (
              <div key={m.id} className={cn("flex gap-2", isAgent ? "justify-end" : "justify-start")}>
                {!isAgent && (
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-violet-100 text-violet-700 text-[10px]">
                      <UserIcon className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                  isAgent
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm"
                    : "bg-white border rounded-bl-sm"
                )}>
                  <div className={cn("text-[10px] font-medium mb-0.5", isAgent ? "text-white/70" : "text-muted-foreground")}>
                    {isAgent ? (m.sender_name || "Support") : (m.sender_name || client?.name || "Client")}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{m.message}</div>
                  <div className={cn("text-[9px] mt-1", isAgent ? "text-white/60" : "text-muted-foreground")}>
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
                {isAgent && (
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px]">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t bg-white">
          {ticket.status !== "solved" && ticket.status !== "closed" ? (
            <>
              <div className="p-3 flex gap-2 items-end">
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
                  className="bg-gradient-to-br from-emerald-500 to-teal-600 h-10 w-10 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="px-3 pb-3 flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate("solved")}>
                  Mark Solved
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStatus.mutate("closed")}>
                  Close
                </Button>
              </div>
            </>
          ) : (
            <div className="p-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setStatus.mutate("open")}>
                Re-open
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
