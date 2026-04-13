import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

const PackageManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", price: 0, price_label: "", olt_range: "", is_popular: false, features: "" });

  const { data: packages = [] } = useQuery({
    queryKey: ["admin-packages"],
    queryFn: async () => {
      const { data } = await supabase.from("packages").select("*").order("sort_order");
      return data || [];
    },
  });

  const addPkg = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("packages").insert({
        name: form.name,
        price: form.price,
        price_label: form.price_label,
        olt_range: form.olt_range || null,
        is_popular: form.is_popular,
        features: form.features.split("\n").filter(Boolean),
        sort_order: packages.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      toast({ title: "Package added" });
      setOpen(false);
      setForm({ name: "", price: 0, price_label: "", olt_range: "", is_popular: false, features: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePkg = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      toast({ title: "Package deleted" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-500 flex items-center justify-center">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Package Manager</h1>
            <p className="text-sm text-muted-foreground">Manage SaaS pricing packages</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Package</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Package</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Price</Label><Input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} /></div>
              <div><Label>Price Label</Label><Input value={form.price_label} onChange={e => setForm({...form, price_label: e.target.value})} placeholder="৳2,000/mo" /></div>
              <div><Label>OLT Range</Label><Input value={form.olt_range} onChange={e => setForm({...form, olt_range: e.target.value})} placeholder="1-3 OLTs" /></div>
              <div><Label>Features (one per line)</Label><textarea className="w-full min-h-[80px] border rounded-md p-2 text-sm" value={form.features} onChange={e => setForm({...form, features: e.target.value})} /></div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.is_popular} onCheckedChange={c => setForm({...form, is_popular: c === true})} />
                <Label>Mark as Popular</Label>
              </div>
              <Button className="w-full" onClick={() => addPkg.mutate()} disabled={!form.name || !form.price_label}>Add Package</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>OLT Range</TableHead>
                <TableHead>Popular</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>৳{p.price}</TableCell>
                  <TableCell>{p.price_label}</TableCell>
                  <TableCell>{p.olt_range || "—"}</TableCell>
                  <TableCell>{p.is_popular ? "⭐" : "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">{(p.features || []).join(", ")}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deletePkg.mutate(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PackageManager;
