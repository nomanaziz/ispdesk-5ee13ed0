import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, ArrowUpDown, Search } from "lucide-react";
import { applyBuyServiceChange } from "@/lib/bwBuyProrate";

export default function BwBuySubscriptions() {
  const [subs, setSubs] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterProvider, setFilterProvider] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    provider_id: "",
    service_id: "",
    service_name: "",
    bandwidth_mbps: 0,
    rate_per_mbps: 0,
    start_date: new Date().toISOString().slice(0, 10),
  });

  const [chgOpen, setChgOpen] = useState(false);
  const [chgTarget, setChgTarget] = useState<any>(null);
  const [chgForm, setChgForm] = useState({
    new_mbps: 0,
    new_rate: 0,
    effective_date: new Date().toISOString().slice(0, 10),
    reason: "",
  });

  const load = async () => {
    const [s, p, sv] = await Promise.all([
      supabase
        .from("bw_buy_provider_subscriptions")
        .select("*, provider:bw_providers(name)")
        .order("created_at", { ascending: false }),
      supabase.from("bw_providers").select("id, name").eq("status", "active").order("name"),
      supabase.from("bw_sale_services").select("*").order("sort_order"),
    ]);
    setSubs(s.data || []);
    setProviders(p.data || []);
    setServices(sv.data || []);
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      subs.filter((s: any) => {
        if (filterStatus !== "all" && s.status !== filterStatus) return false;
        if (filterProvider !== "all" && s.provider_id !== filterProvider) return false;
        if (search && !(s.provider?.name || "").toLowerCase().includes(search.toLowerCase()))
          return false;
        return true;
      }),
    [subs, filterStatus, filterProvider, search],
  );

  const totals = useMemo(() => {
    let totalCost = 0;
    let totalMbps = 0;
    filtered.forEach((s: any) => {
      if (s.status !== "active") return;
      totalMbps += Number(s.bandwidth_mbps);
      totalCost += Number(s.bandwidth_mbps) * Number(s.rate_per_mbps);
    });
    return { totalCost, totalMbps };
  }, [filtered]);

  const onPickService = (id: string) => {
    const sv = services.find((x) => x.id === id);
    setAddForm((f) => ({
      ...f,
      service_id: id,
      service_name: sv?.name || f.service_name,
      rate_per_mbps: Number(sv?.default_rate || f.rate_per_mbps),
    }));
  };

  const saveAdd = async () => {
    if (!addForm.provider_id) {
      toast.error("Provider required");
      return;
    }
    if (!addForm.service_name) {
      toast.error("Service name required");
      return;
    }
    const { error } = await supabase.from("bw_buy_provider_subscriptions").insert({
      provider_id: addForm.provider_id,
      service_id: addForm.service_id || null,
      service_name: addForm.service_name,
      bandwidth_mbps: Number(addForm.bandwidth_mbps),
      rate_per_mbps: Number(addForm.rate_per_mbps),
      start_date: addForm.start_date,
      status: "active",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Subscription added");
    setAddOpen(false);
    setAddForm({
      provider_id: "",
      service_id: "",
      service_name: "",
      bandwidth_mbps: 0,
      rate_per_mbps: 0,
      start_date: new Date().toISOString().slice(0, 10),
    });
    load();
  };

  const openChange = (sub: any) => {
    setChgTarget(sub);
    setChgForm({
      new_mbps: Number(sub.bandwidth_mbps),
      new_rate: Number(sub.rate_per_mbps),
      effective_date: new Date().toISOString().slice(0, 10),
      reason: "",
    });
    setChgOpen(true);
  };

  const saveChange = async () => {
    if (!chgTarget) return;
    try {
      await applyBuyServiceChange({
        providerId: chgTarget.provider_id,
        subscriptionId: chgTarget.id,
        newMbps: Number(chgForm.new_mbps),
        newRate: Number(chgForm.new_rate),
        effectiveDate: chgForm.effective_date,
        reason: chgForm.reason,
      });
      toast.success("Service change applied");
      setChgOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">প্রোভাইডার সাবস্ক্রিপশন</h1>
        <p className="text-sm text-muted-foreground">
          ব্যান্ডউইথ ক্রয় — প্রতি প্রোভাইডারের সক্রিয় সার্ভিস লাইন (Internet/NIX/FB/Akamai etc.)
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Active Subscriptions</div>
            <div className="text-2xl font-semibold">
              {filtered.filter((s: any) => s.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Mbps Purchased</div>
            <div className="text-2xl font-semibold">{totals.totalMbps}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Monthly Cost (active)</div>
            <div className="text-2xl font-semibold">
              ৳ {Math.round(totals.totalCost).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Provider Subscriptions</CardTitle>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 h-9 w-48"
                placeholder="Search provider..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterProvider} onValueChange={setFilterProvider}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All providers</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Subscription
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Mbps</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center w-32">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.provider?.name || "—"}</TableCell>
                  <TableCell>{s.service_name}</TableCell>
                  <TableCell className="text-right">{Number(s.bandwidth_mbps)}</TableCell>
                  <TableCell className="text-right">
                    ৳ {Number(s.rate_per_mbps).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ৳ {(Number(s.bandwidth_mbps) * Number(s.rate_per_mbps)).toLocaleString()}
                  </TableCell>
                  <TableCell>{s.start_date}</TableCell>
                  <TableCell>{s.end_date || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "active" ? "default" : "secondary"}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {s.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => openChange(s)}>
                        <ArrowUpDown className="h-3.5 w-3.5 mr-1" /> Change
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    কোনো সাবস্ক্রিপশন নেই
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add subscription */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Provider Subscription</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Provider *</Label>
              <Select
                value={addForm.provider_id}
                onValueChange={(v) => setAddForm({ ...addForm, provider_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Service Catalog (optional)</Label>
              <Select value={addForm.service_id} onValueChange={onPickService}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick from catalog" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Service Name *</Label>
              <Input
                value={addForm.service_name}
                placeholder="Internet / NIX / FB-Cache / Akamai..."
                onChange={(e) => setAddForm({ ...addForm, service_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Bandwidth (Mbps)</Label>
              <Input
                type="number"
                value={addForm.bandwidth_mbps}
                onChange={(e) =>
                  setAddForm({ ...addForm, bandwidth_mbps: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Rate per Mbps / month</Label>
              <Input
                type="number"
                value={addForm.rate_per_mbps}
                onChange={(e) =>
                  setAddForm({ ...addForm, rate_per_mbps: Number(e.target.value) })
                }
              />
            </div>
            <div className="col-span-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={addForm.start_date}
                onChange={(e) => setAddForm({ ...addForm, start_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveAdd}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service change */}
      <Dialog open={chgOpen} onOpenChange={setChgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade / Downgrade — {chgTarget?.service_name}</DialogTitle>
          </DialogHeader>
          {chgTarget && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Current: <b>{chgTarget.bandwidth_mbps} Mbps</b> @ ৳{chgTarget.rate_per_mbps}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>New Bandwidth (Mbps)</Label>
                  <Input
                    type="number"
                    value={chgForm.new_mbps}
                    onChange={(e) =>
                      setChgForm({ ...chgForm, new_mbps: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>New Rate</Label>
                  <Input
                    type="number"
                    value={chgForm.new_rate}
                    onChange={(e) =>
                      setChgForm({ ...chgForm, new_rate: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>Effective Date</Label>
                  <Input
                    type="date"
                    value={chgForm.effective_date}
                    onChange={(e) =>
                      setChgForm({ ...chgForm, effective_date: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>Reason</Label>
                  <Input
                    value={chgForm.reason}
                    onChange={(e) => setChgForm({ ...chgForm, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Old subscription will end on{" "}
                {new Date(new Date(chgForm.effective_date).getTime() - 86400000)
                  .toISOString()
                  .slice(0, 10)}
                ; new starts on {chgForm.effective_date}. Next bill will be pro-rated automatically.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={saveChange}>Apply Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
