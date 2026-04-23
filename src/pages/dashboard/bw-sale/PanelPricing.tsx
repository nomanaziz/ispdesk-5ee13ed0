import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

interface Slab {
  id: string;
  user_limit: number;
  monthly_price: number;
  display_order: number;
  is_active: boolean;
}

const empty = { user_limit: 100, monthly_price: 500, display_order: 1, is_active: true };

export default function PanelPricing() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Slab | null>(null);
  const [form, setForm] = useState(empty);

  const { data: slabs = [], isLoading } = useQuery({
    queryKey: ["bw-panel-pricing-slabs-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bw_panel_pricing_slabs")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data || []) as Slab[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.user_limit || form.user_limit <= 0) throw new Error("User limit আবশ্যক");
      if (form.monthly_price < 0) throw new Error("Price negative হতে পারবে না");
      if (editing) {
        const { error } = await supabase
          .from("bw_panel_pricing_slabs")
          .update(form)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bw_panel_pricing_slabs").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "আপডেট হয়েছে" : "নতুন প্ল্যান যোগ হয়েছে");
      qc.invalidateQueries({ queryKey: ["bw-panel-pricing-slabs-admin"] });
      qc.invalidateQueries({ queryKey: ["bw-panel-pricing-slabs"] });
      setOpen(false);
      setEditing(null);
      setForm(empty);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (s: Slab) => {
      const { error } = await supabase
        .from("bw_panel_pricing_slabs")
        .update({ is_active: !s.is_active })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bw-panel-pricing-slabs-admin"] });
      qc.invalidateQueries({ queryKey: ["bw-panel-pricing-slabs"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bw_panel_pricing_slabs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ডিলিট হয়েছে");
      qc.invalidateQueries({ queryKey: ["bw-panel-pricing-slabs-admin"] });
      qc.invalidateQueries({ queryKey: ["bw-panel-pricing-slabs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => {
    setEditing(null);
    const nextOrder = (slabs[slabs.length - 1]?.display_order || 0) + 1;
    setForm({ ...empty, display_order: nextOrder });
    setOpen(true);
  };

  const openEdit = (s: Slab) => {
    setEditing(s);
    setForm({
      user_limit: s.user_limit,
      monthly_price: Number(s.monthly_price),
      display_order: s.display_order,
      is_active: s.is_active,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Manage Your Clients — Subscription Pricing
            </CardTitle>
            <CardDescription>
              Bandwidth POP কাস্টমারদের জন্য প্যানেল সাবস্ক্রিপশন pricing tier পরিচালনা করুন। User
              limit অনুযায়ী monthly price সেট করুন।
            </CardDescription>
          </div>
          <Button onClick={openAdd} size="sm">
            <Plus className="h-4 w-4 mr-1" /> নতুন প্ল্যান
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-muted/30 p-3 mb-4 text-sm flex items-start gap-2">
            <Users className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <strong>Free Trial:</strong> প্রতিটি কাস্টমার একবার <strong>৫০ ইউজার / ৩০ দিন</strong>{" "}
              ফ্রি ট্রায়াল পান (system-defined, এডিট প্রয়োজন নেই)। নিচের প্ল্যানগুলো paid
              subscription হিসেবে কাজ করবে।
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="text-right">User Limit</TableHead>
                  <TableHead className="text-right">Monthly Price</TableHead>
                  <TableHead className="text-right">Per User</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center w-32">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : slabs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No pricing slabs yet. Click "নতুন প্ল্যান" to add one.
                    </TableCell>
                  </TableRow>
                ) : (
                  slabs.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-muted-foreground">{s.display_order || i + 1}</TableCell>
                      <TableCell className="text-right font-medium">
                        {s.user_limit.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ৳ {Number(s.monthly_price).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ৳ {(Number(s.monthly_price) / s.user_limit).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={s.is_active}
                          onCheckedChange={() => toggleActive.mutate(s)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => {
                              if (confirm("এই প্ল্যান delete করবেন?")) remove.mutate(s.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
            <DialogTitle>{editing ? "প্ল্যান এডিট" : "নতুন প্ল্যান"}</DialogTitle>
            <DialogDescription>
              User limit ও monthly price সেট করুন। কাস্টমার এই প্ল্যান বেছে নিলে তার প্যানেলে
              এতগুলো ইউজার allow হবে।
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>User Limit</Label>
              <Input
                type="number"
                value={form.user_limit}
                onChange={(e) => setForm({ ...form, user_limit: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Monthly Price (৳)</Label>
              <Input
                type="number"
                value={form.monthly_price}
                onChange={(e) =>
                  setForm({ ...form, monthly_price: Number(e.target.value) })
                }
              />
            </div>
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
                id="is-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="is-active">Active</Label>
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
