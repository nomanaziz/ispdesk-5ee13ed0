import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus } from "lucide-react";
import { useState } from "react";

const CustomerManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ isp_name: "", subdomain: "", owner_name: "", email: "", phone: "" });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*, packages(name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addCustomer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      toast({ title: "Customer added" });
      setOpen(false);
      setForm({ isp_name: "", subdomain: "", owner_name: "", email: "", phone: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-green-100 text-green-800";
      case "suspended": return "bg-red-100 text-red-800";
      default: return "bg-amber-100 text-amber-800";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Customer Management</h1>
            <p className="text-sm text-muted-foreground">Manage ISP customers subscribed to ISP Desk</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Customer</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>ISP Name</Label><Input value={form.isp_name} onChange={e => setForm({...form, isp_name: e.target.value})} /></div>
              <div><Label>Subdomain</Label><Input value={form.subdomain} onChange={e => setForm({...form, subdomain: e.target.value})} placeholder="myisp" /><p className="text-xs text-muted-foreground mt-1">{form.subdomain || "myisp"}.ispdesk.com</p></div>
              <div><Label>Owner Name</Label><Input value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <Button className="w-full" onClick={() => addCustomer.mutate()} disabled={!form.isp_name || !form.subdomain || !form.owner_name}>
                Add Customer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ISP Name</TableHead>
                <TableHead>Subdomain</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.isp_name}</TableCell>
                  <TableCell>{c.subdomain}.ispdesk.com</TableCell>
                  <TableCell>{c.owner_name}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{(c as any).packages?.name || "—"}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColor(c.status)}`}>{c.status}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {customers.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{isLoading ? "Loading..." : "No customers yet."}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerManagement;
