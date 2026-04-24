import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Pencil, Sparkles, Users, TrendingUp, Gift } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Tier {
  id: string;
  tier_name: string | null;
  min_users: number;
  max_users: number | null;
  billing_mode: "flat" | "per_user" | "free";
  flat_price: number | null;
  per_user_rate: number | null;
  display_order: number;
  is_active: boolean;
}

interface CustomerUsage {
  id: string;
  customer_name: string;
  active_client_count: number;
  current_tier_id: string | null;
  next_month_estimated_bill: number;
  panel_access_enabled: boolean;
}

const tierIcon = (mode: string) =>
  mode === "flat" ? Users : mode === "per_user" ? TrendingUp : Gift;

const tierAccent: Record<string, string> = {
  flat: "from-primary/15 to-primary/5 border-primary/30",
  per_user: "from-amber-500/15 to-amber-500/5 border-amber-500/30",
  free: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30",
};

const formatRange = (t: Tier) =>
  t.max_users == null
    ? `${t.min_users.toLocaleString()}+ users`
    : `${t.min_users.toLocaleString()}–${t.max_users.toLocaleString()} users`;

const formatPrice = (t: Tier) => {
  if (t.billing_mode === "free") return "FREE";
  if (t.billing_mode === "flat") return `৳${Number(t.flat_price ?? 0).toLocaleString()}/মাস`;
  return `৳${Number(t.per_user_rate ?? 0).toLocaleString()} × user/মাস`;
};

export default function PanelPricing() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tier | null>(null);
  const [form, setForm] = useState({
    tier_name: "",
    min_users: 0,
    max_users: 0 as number | null,
    billing_mode: "flat" as "flat" | "per_user" | "free",
    flat_price: 0 as number | null,
    per_user_rate: 0 as number | null,
    display_order: 1,
    is_active: true,
  });

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ["bw-panel-tiers-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bw_panel_pricing_slabs")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data || []) as unknown as Tier[];
    },
  });

  const { data: usage = [] } = useQuery({
    queryKey: ["bw-panel-customer-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bw_sale_customers")
        .select(
          "id, customer_name, active_client_count, current_tier_id, next_month_estimated_bill, panel_access_enabled, panel_branch_id",
        )
        .not("panel_branch_id", "is", null)
        .order("active_client_count", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CustomerUsage[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        tier_name: form.tier_name || null,
        min_users: form.min_users,
        max_users: form.max_users,
        billing_mode: form.billing_mode,
        flat_price: form.billing_mode === "flat" ? form.flat_price : null,
        per_user_rate: form.billing_mode === "per_user" ? form.per_user_rate : null,
        display_order: form.display_order,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase
          .from("bw_panel_pricing_slabs")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bw_panel_pricing_slabs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "টিয়ার আপডেট হয়েছে" : "নতুন টিয়ার যোগ হয়েছে");
      qc.invalidateQueries({ queryKey: ["bw-panel-tiers-admin"] });
      qc.invalidateQueries({ queryKey: ["bw-panel-pricing-slabs"] });
      qc.invalidateQueries({ queryKey: ["bw-panel-customer-usage"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (t: Tier) => {
      const { error } = await supabase
        .from("bw_panel_pricing_slabs")
        .update({ is_active: !t.is_active })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bw-panel-tiers-admin"] });
      qc.invalidateQueries({ queryKey: ["bw-panel-pricing-slabs"] });
    },
  });

  const openEdit = (t: Tier) => {
    setEditing(t);
    setForm({
      tier_name: t.tier_name || "",
      min_users: t.min_users,
      max_users: t.max_users,
      billing_mode: t.billing_mode,
      flat_price: t.flat_price,
      per_user_rate: t.per_user_rate,
      display_order: t.display_order,
      is_active: t.is_active,
    });
    setOpen(true);
  };

  const tierName = (id: string | null) =>
    tiers.find((t) => t.id === id)?.tier_name || "—";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Manage Your Clients — Tiered Subscription
          </CardTitle>
          <CardDescription>
            ৩টি simple tier — user count অনুযায়ী auto-bill। Client বাড়লে BW customer পরের মাসে
            উচ্চতর tier-এ চলে যাবে; ৩,০০০-এর বেশি হলে FREE।
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : (
            tiers.map((t) => {
              const Icon = tierIcon(t.billing_mode);
              return (
                <div
                  key={t.id}
                  className={cn(
                    "rounded-lg border bg-gradient-to-r p-4 flex items-center gap-4",
                    tierAccent[t.billing_mode],
                  )}
                >
                  <div className="rounded-lg bg-background p-2 shadow-sm">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base">
                        P#{t.display_order} — {t.tier_name || "—"}
                      </span>
                      {t.billing_mode === "free" && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">FREE 🎉</Badge>
                      )}
                      {!t.is_active && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">{formatRange(t)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatPrice(t)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={t.is_active}
                      onCheckedChange={() => toggleActive.mutate(t)}
                    />
                    <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Customer Usage</CardTitle>
          <CardDescription>
            প্রতিটি BW customer-এর active client count, current tier এবং পরের মাসের estimated bill।
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Customer Name</TableHead>
                  <TableHead className="text-right">Active Clients</TableHead>
                  <TableHead>Current Tier</TableHead>
                  <TableHead className="text-right">Next Month Bill</TableHead>
                  <TableHead className="text-center">Panel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      কোনো panel-active customer নেই।
                    </TableCell>
                  </TableRow>
                ) : (
                  usage.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.customer_name}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {u.active_client_count.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{tierName(u.current_tier_id)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {Number(u.next_month_estimated_bill) === 0 ? (
                          <span className="text-emerald-600">FREE</span>
                        ) : (
                          <>৳ {Number(u.next_month_estimated_bill).toLocaleString()}</>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {u.panel_access_enabled ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "টিয়ার এডিট" : "নতুন টিয়ার"}</DialogTitle>
            <DialogDescription>
              User range ও billing mode সেট করুন। Customer-এর active client count এই range-এ পড়লে
              তাকে এই tier-এ assign করা হবে।
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Tier Name</Label>
              <Input
                placeholder="e.g. Starter"
                value={form.tier_name}
                onChange={(e) => setForm({ ...form, tier_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Min Users</Label>
              <Input
                type="number"
                value={form.min_users}
                onChange={(e) => setForm({ ...form, min_users: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Max Users (খালি = ∞)</Label>
              <Input
                type="number"
                value={form.max_users ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    max_users: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="col-span-2">
              <Label>Billing Mode</Label>
              <Select
                value={form.billing_mode}
                onValueChange={(v: any) => setForm({ ...form, billing_mode: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat — fixed monthly price</SelectItem>
                  <SelectItem value="per_user">Per User — rate × active users</SelectItem>
                  <SelectItem value="free">Free — no charge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.billing_mode === "flat" && (
              <div className="col-span-2">
                <Label>Flat Price (৳/মাস)</Label>
                <Input
                  type="number"
                  value={form.flat_price ?? 0}
                  onChange={(e) => setForm({ ...form, flat_price: Number(e.target.value) })}
                />
              </div>
            )}
            {form.billing_mode === "per_user" && (
              <div className="col-span-2">
                <Label>Per-User Rate (৳/user/মাস)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.per_user_rate ?? 0}
                  onChange={(e) =>
                    setForm({ ...form, per_user_rate: Number(e.target.value) })
                  }
                />
              </div>
            )}
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) =>
                  setForm({ ...form, display_order: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex items-end gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              বাতিল
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              সংরক্ষণ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
