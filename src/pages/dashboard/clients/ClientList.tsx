import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, FileSpreadsheet, FileText, Users, UserPlus, RefreshCw, Gift, Eye, EyeOff, CalendarClock, Crown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import ClientActionButtons from "@/components/client-actions/ClientActionButtons";

export default function ClientList() {
  const [search, setSearch] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, zones:zone_id(name), isp_packages:package_id(name, bandwidth_down, price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateExpireMutation = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      const { error } = await supabase
        .from("clients")
        .update({ expire_date: date })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients-list"] });
      toast.success("মেয়াদ আপডেট হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const all = clients || [];
    const running = all.filter((c: any) => c.status === "active" && c.billing_status !== "Left").length;
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const newClients = all.filter((c: any) => c.created_at?.startsWith(thisMonth)).length;
    const waiver = all.filter((c: any) => c.billing_status === "Free" || c.monthly_bill === 0).length;
    return { running, newClients, renewed: 0, waiver };
  }, [clients]);

  const filtered = useMemo(() => {
    if (!search) return clients || [];
    const s = search.toLowerCase();
    return (clients || []).filter((c: any) =>
      c.name?.toLowerCase().includes(s) || c.client_id?.toLowerCase().includes(s) || c.contact?.includes(s) || c.username?.toLowerCase().includes(s)
    );
  }, [clients, search]);

  const togglePassword = (id: string) => setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map((c: any) => c.id));
  };

  const getExpireBadge = (expireDate: string | null, isVip: boolean) => {
    if (isVip) {
      return { color: "bg-purple-500/10 text-purple-600 border-purple-500/30", label: "VIP" };
    }
    if (!expireDate) {
      return { color: "bg-muted text-muted-foreground", label: "N/A" };
    }
    const now = new Date();
    const expire = parseISO(expireDate);
    const daysLeft = differenceInDays(expire, now);

    if (daysLeft < 0) {
      return { color: "bg-red-500/10 text-red-600 border-red-500/30", label: format(expire, "dd/MM") };
    } else if (daysLeft <= 7) {
      return { color: "bg-amber-500/10 text-amber-600 border-amber-500/30", label: format(expire, "dd/MM") };
    } else {
      return { color: "bg-green-500/10 text-green-600 border-green-500/30", label: format(expire, "dd/MM") };
    }
  };

  const summaryCards = [
    { label: "Running Clients", count: stats.running, desc: "Number of clients without LeftOut status", icon: Users, color: "bg-blue-600" },
    { label: "New Clients", count: stats.newClients, desc: "Monthly number of clients those are new", icon: UserPlus, color: "bg-green-600" },
    { label: "Renewed Clients", count: stats.renewed, desc: "Monthly number of newly renewed clients", icon: RefreshCw, color: "bg-purple-600" },
    { label: "Waiver Clients", count: stats.waiver, desc: "Number of clients those are free/personal", icon: Gift, color: "bg-orange-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Client List <span className="text-sm font-normal text-muted-foreground">View All Client</span></h1>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-center p-3 border rounded-lg bg-card">
        <Button variant="outline" size="sm"><FileSpreadsheet className="h-4 w-4 mr-1" /> Generate Excel</Button>
        <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" /> Generate Pdf</Button>
        <Button variant="outline" size="sm">Bulk Profile Change</Button>
        <Button variant="outline" size="sm">Bulk Package Change</Button>
        <Button variant="outline" size="sm">Bulk Status Change</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className={`${card.color} text-white border-0`}>
            <CardContent className="p-4 flex items-center gap-3">
              <card.icon className="h-10 w-10 opacity-80" />
              <div>
                <div className="font-bold text-lg">{card.label}</div>
                <div className="text-2xl font-bold">{card.count}</div>
                <div className="text-xs opacity-80">{card.desc}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">মোট: {filtered.length} ক্লায়েন্ট</div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/10">
              <TableHead className="w-8"><Checkbox checked={selectedIds.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead>
              <TableHead className="text-xs">C.Code</TableHead>
              <TableHead className="text-xs">ID/IP</TableHead>
              <TableHead className="text-xs">Password</TableHead>
              <TableHead className="text-xs">Cus. Name</TableHead>
              <TableHead className="text-xs">Mobile</TableHead>
              <TableHead className="text-xs">Zone</TableHead>
              <TableHead className="text-xs">Package/Speed</TableHead>
              <TableHead className="text-xs">M.Bill</TableHead>
              <TableHead className="text-xs">Expire</TableHead>
              <TableHead className="text-xs">B.Status</TableHead>
              <TableHead className="text-xs">M.Status</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={13} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={13} className="text-center py-8">কোনো ক্লায়েন্ট পাওয়া যায়নি</TableCell></TableRow>
            ) : (
              filtered.map((c: any) => {
                const expireBadge = getExpireBadge(c.expire_date, c.is_vip);
                return (
                  <TableRow key={c.id}>
                    <TableCell><Checkbox checked={selectedIds.includes(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></TableCell>
                    <TableCell className="text-xs font-medium">{c.client_id}</TableCell>
                    <TableCell className="text-xs">
                      <div>{c.username || c.user_id || "-"}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        <span>{showPasswords[c.id] ? (c.password || "****") : "••••"}</span>
                        <button onClick={() => togglePassword(c.id)} className="text-muted-foreground hover:text-foreground">
                          {showPasswords[c.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      <div className="flex items-center gap-1">
                        {c.is_vip && <Crown className="h-3 w-3 text-purple-500" />}
                        {c.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{c.contact}</TableCell>
                    <TableCell className="text-xs">{c.zones?.name || "-"}</TableCell>
                    <TableCell className="text-xs">
                      {c.isp_packages ? `${c.isp_packages.name}/${c.isp_packages.bandwidth_down}Mb` : "-"}
                    </TableCell>
                    <TableCell className="text-xs">{c.monthly_bill || 0}</TableCell>
                    <TableCell className="text-xs">
                      {c.is_vip ? (
                        <Badge variant="outline" className={`text-[10px] cursor-default ${expireBadge.color}`}>
                          <Crown className="h-2.5 w-2.5 mr-0.5" /> VIP
                        </Badge>
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button>
                              <Badge variant="outline" className={`text-[10px] cursor-pointer hover:opacity-80 transition-opacity ${expireBadge.color}`}>
                                <CalendarClock className="h-2.5 w-2.5 mr-0.5" />
                                {expireBadge.label}
                              </Badge>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={c.expire_date ? parseISO(c.expire_date) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  updateExpireMutation.mutate({
                                    id: c.id,
                                    date: format(date, "yyyy-MM-dd"),
                                  });
                                }
                              }}
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={c.billing_status === "Active" ? "default" : "secondary"} className="text-[10px]">
                        {c.billing_status || "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={c.mikrotik_status === "online" ? "default" : "outline"} className={`text-[10px] ${c.mikrotik_status === "online" ? "bg-green-500" : ""}`}>
                        {c.mikrotik_status || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <ClientActionButtons client={c} mode="client" invalidateKey="clients-list" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
