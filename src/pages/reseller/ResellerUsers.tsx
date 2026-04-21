import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth, type ResellerPermissions } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, LogIn } from "lucide-react";
import { toast } from "sonner";
import PermissionTree from "@/components/reseller/PermissionTree";
import { useAuth } from "@/contexts/AuthContext";
import { loginAsUser } from "@/lib/impersonate";

const defaultPerms: ResellerPermissions = {
  dashboard: true,
  invoices: true,
  purchases: true,
  tickets: true,
  users: false,
  settings: false,
};

const ResellerUsers = () => {
  const { customer } = usePortalAuth();
  const { isAdmin } = useAuth();
  const resellerId = customer?.parent_reseller_id || customer?.sub;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    email: "",
    mobile: "",
    status: "active",
    permissions: defaultPerms,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["reseller-users", resellerId],
    enabled: !!resellerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bw_reseller_users")
        .select("*")
        .eq("reseller_id", resellerId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const reset = () => {
    setEditing(null);
    setForm({ name: "", username: "", password: "", email: "", mobile: "", status: "active", permissions: defaultPerms });
  };

  const openNew = () => {
    reset();
    setOpen(true);
  };

  const openEdit = (u: any) => {
    setEditing(u);
    setForm({
      name: u.name,
      username: u.username,
      password: "",
      email: u.email || "",
      mobile: u.mobile || "",
      status: u.status,
      permissions: { ...defaultPerms, ...(u.permissions || {}) },
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!resellerId) throw new Error("No reseller");
      if (!form.name || !form.username) throw new Error("Name & username required");
      if (!editing && !form.password) throw new Error("Password required");
      const payload: any = {
        reseller_id: resellerId,
        name: form.name,
        username: form.username,
        email: form.email || null,
        mobile: form.mobile || null,
        status: form.status,
        permissions: form.permissions as any,
      };
      if (form.password) payload.password = form.password;
      if (editing) {
        const { error } = await supabase.from("bw_reseller_users").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bw_reseller_users").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "User updated" : "User created");
      qc.invalidateQueries({ queryKey: ["reseller-users"] });
      setOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bw_reseller_users").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["reseller-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Sub-users cannot edit users page (route already gated). Reseller cannot delete itself (it's not in this list anyway).
  const isSub = customer?.type === "reseller_sub";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">User Management</CardTitle>
          {!isSub && (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Add User
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No sub-users
                  </TableCell>
                </TableRow>
              )}
              {users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell className="font-mono text-sm">{u.username}</TableCell>
                  <TableCell>{u.email || "—"}</TableCell>
                  <TableCell>{u.mobile || "—"}</TableCell>
                  <TableCell><Badge variant={u.status === "active" ? "default" : "secondary"}>{u.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          title="Admin: Login as this sub-user"
                          onClick={() =>
                            loginAsUser("reseller_sub", u.id)
                              .then(() => toast.success("নতুন ট্যাবে লগইন হচ্ছে"))
                              .catch((e) => toast.error(e.message))
                          }
                        >
                          <LogIn className="h-4 w-4" />
                        </Button>
                      )}
                      {!isSub && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => confirm("Delete this user?") && del.mutate(u.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
              <div className="sm:col-span-2">
                <Label>Password {editing && <span className="text-xs text-muted-foreground">(leave blank to keep)</span>}</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Permissions</Label>
              <p className="text-xs text-muted-foreground mb-2">Select which menus this sub-user can access</p>
              <PermissionTree value={form.permissions} onChange={(p) => setForm({ ...form, permissions: p })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResellerUsers;
