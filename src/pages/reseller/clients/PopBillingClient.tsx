import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { callPortal } from "@/lib/portalApi";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Search, DollarSign } from "lucide-react";
import { toast } from "sonner";
import RemainingDaysCell from "@/components/billing/RemainingDaysCell";
import BulkClientRechargeDialog from "@/components/reseller/BulkClientRechargeDialog";

function calcRemaining(expire?: string | null): number {
  if (!expire) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const exp = new Date(expire); exp.setHours(0,0,0,0);
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
}

export default function PopBillingClient() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "expired" | "active">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const { data: popInfo } = useQuery({
    queryKey: ["pop-balance-info"],
    queryFn: async () => await callPortal<{ pop: any }>("get_pop_balance_info"),
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["pop-billing-clients"],
    queryFn: async () => {
      const r = await callPortal<{ clients: any[] }>("list_pop_billing_clients", { month: new Date().toISOString().slice(0, 7) });
      return r.clients || [];
    },
  });

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const r = calcRemaining(c.expire_date);
      if (filter === "expired" && r > 0) return false;
      if (filter === "active" && r <= 0) return false;
      const q = search.toLowerCase();
      if (q && ![c.name, c.username, c.contact, c.client_id].some((v: any) => String(v || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [clients, filter, search]);

  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const next = status === "disabled" ? "active" : "disabled";
      const { error } = await supabase.from("clients").update({ mikrotik_status: next }).eq("id", id);
      if (error) throw error;
      return next;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pop-billing-clients"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(filtered.map((c) => c.id)));
    else setSelected(new Set());
  };
  const toggleOne = (id: string, checked: boolean) => {
    const s = new Set(selected);
    if (checked) s.add(id); else s.delete(id);
    setSelected(s);
  };

  const selectedClients = useMemo(
    () => filtered.filter((c) => selected.has(c.id)).map((c) => ({ id: c.id, name: c.name, monthly_bill: Number(c.monthly_bill || 0) })),
    [filtered, selected],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Billing Clients</h1>
          <p className="text-sm text-muted-foreground">R.Days, MikroTik status এবং recharge — এক জায়গায়।</p>
        </div>
        <div className="flex items-center gap-3">
          <Card className="px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-bold">৳ {Number(popInfo?.pop?.balance || 0).toFixed(2)}</span>
            </div>
          </Card>
          <Button onClick={() => setBulkOpen(true)} disabled={selected.size === 0} className="gap-2">
            <DollarSign className="h-4 w-4" /> Bulk Client Recharge ({selected.size})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-base">Clients</CardTitle>
            <Badge variant="secondary">{filtered.length}</Badge>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-8 h-9 w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="expired">Zero / Expired</SelectItem>
                  <SelectItem value="active">Active (R.Days &gt; 0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">কোনো client পাওয়া যায়নি</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-2 w-8">
                      <Checkbox
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onCheckedChange={(c) => toggleAll(!!c)}
                      />
                    </th>
                    <th className="text-left px-2 py-2">C.Code</th>
                    <th className="text-left px-2 py-2">Username</th>
                    <th className="text-left px-2 py-2">Name</th>
                    <th className="text-left px-2 py-2">Mobile</th>
                    <th className="text-left px-2 py-2">M.Bill</th>
                    <th className="text-left px-2 py-2">R.Days</th>
                    <th className="text-left px-2 py-2">Expire</th>
                    <th className="text-left px-2 py-2">MikroTik</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.id} className={i % 2 ? "bg-muted/20" : ""}>
                      <td className="px-2 py-2">
                        <Checkbox checked={selected.has(c.id)} onCheckedChange={(v) => toggleOne(c.id, !!v)} />
                      </td>
                      <td className="px-2 py-2 font-mono text-xs">{c.client_id}</td>
                      <td className="px-2 py-2">{c.username}</td>
                      <td className="px-2 py-2">{c.name}</td>
                      <td className="px-2 py-2">{c.contact}</td>
                      <td className="px-2 py-2">৳ {Number(c.monthly_bill || 0)}</td>
                      <td className="px-2 py-2"><RemainingDaysCell client={c} invalidateKey="pop-billing-clients" /></td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">{c.expire_date || "—"}</td>
                      <td className="px-2 py-2">
                        <Switch
                          checked={c.mikrotik_status !== "disabled"}
                          onCheckedChange={() => toggle.mutate({ id: c.id, status: c.mikrotik_status })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <BulkClientRechargeDialog open={bulkOpen} onOpenChange={setBulkOpen} clients={selectedClients} />
    </div>
  );
}
