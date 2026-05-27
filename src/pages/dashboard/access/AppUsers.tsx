import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Pencil, Trash2, KeyRound, Plus, Power } from "lucide-react";

const EMPLOYEE_ROLE_ID = "33333333-3333-3333-3333-333333333333";


interface AppUser {
  id: string;
  username: string;
  status: string;
  employee_id: string | null;
  role_id: string | null;
  created_at: string;
  employee?: { id: string; name: string; employee_id: string | null } | null;
  role?: { id: string; name: string } | null;
  extra_roles?: { role_id: string; role: { id: string; name: string } | null }[];
}

interface Employee { id: string; name: string; employee_id: string | null; }
interface Role { id: string; name: string; is_protected: boolean; status: string; }

export default function AppUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [takenEmployeeIds, setTakenEmployeeIds] = useState<Set<string>>(new Set());
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState({
    employee_id: "",
    username: "",
    password: "",
    confirm: "",
    role_id: "",
    status: "Active",
    extra_role_ids: [] as string[],
  });

  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);


  const load = async () => {
    setLoading(true);
    const [u, e, r, x] = await Promise.all([
      supabase
        .from("app_users")
        .select("id, username, status, employee_id, role_id, created_at, employee:employees(id,name,employee_id), role:app_roles(id,name)")
        .order("created_at", { ascending: false }),
      supabase.from("employees").select("id,name,employee_id,status").ilike("status", "active").order("name"),
      supabase.from("app_roles").select("id,name,is_protected,status").eq("status", "Active").order("name"),
      supabase.from("app_user_extra_roles").select("user_id, role_id, role:app_roles(id,name)"),
    ]);
    if (u.error) toast.error(u.error.message); else {
      const list = (u.data as any[]) || [];
      const byUser: Record<string, any[]> = {};
      ((x.data as any[]) || []).forEach((er) => {
        (byUser[er.user_id] ||= []).push(er);
      });
      setUsers(list.map((row) => ({ ...row, extra_roles: byUser[row.id] || [] })));
      setTakenEmployeeIds(new Set(list.map((r2) => r2.employee_id).filter(Boolean)));
    }
    if (!e.error) setEmployees((e.data as any) || []);
    if (!r.error) setRoles((r.data as any) || []);
    setLoading(false);
  };


  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.username.toLowerCase().includes(q) ||
        u.employee?.name?.toLowerCase().includes(q) ||
        u.employee?.employee_id?.toLowerCase().includes(q) ||
        u.role?.name?.toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ employee_id: "", username: "", password: "", confirm: "", role_id: EMPLOYEE_ROLE_ID, status: "Active", extra_role_ids: [] });
    setDialogOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditing(u);
    setForm({
      employee_id: u.employee_id || "",
      username: u.username,
      password: "",
      confirm: "",
      role_id: u.role_id || "",
      status: u.status,
      extra_role_ids: (u.extra_roles || []).map((er) => er.role_id),
    });
    setDialogOpen(true);
  };


  const handleEmployeeSelect = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    setForm((f) => ({
      ...f,
      employee_id: empId,
      username: f.username || emp?.employee_id || emp?.name?.toLowerCase().replace(/\s+/g, ".") || "",
    }));
  };

  const save = async () => {
    if (!form.username.trim()) return toast.error("ইউজারনেম দিন");
    if (!form.role_id) return toast.error("রোল সিলেক্ট করুন");
    if (!editing) {
      if (!form.password) return toast.error("পাসওয়ার্ড দিন");
      if (form.password !== form.confirm) return toast.error("পাসওয়ার্ড মিলছে না");
    } else if (form.password && form.password !== form.confirm) {
      return toast.error("পাসওয়ার্ড মিলছে না");
    }

    const payload: any = {
      username: form.username.trim(),
      employee_id: form.employee_id || null,
      role_id: form.role_id,
      status: form.status,
    };
    if (!editing || form.password) payload.password = form.password;

    let userId = editing?.id as string | undefined;
    if (editing) {
      const { error } = await supabase.from("app_users").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("আপডেট হয়েছে");
    } else {
      const { data, error } = await supabase.from("app_users").insert(payload).select("id").single();
      if (error) return toast.error(error.message);
      userId = data?.id;
      toast.success("App User তৈরি হয়েছে");
    }

    // Sync extra roles (exclude primary role to avoid duplicates with trigger-attached Employee)
    if (userId) {
      await supabase.from("app_user_extra_roles").delete().eq("user_id", userId);
      const extras = form.extra_role_ids.filter((rid) => rid && rid !== form.role_id);
      // Always ensure Employee role attaches when linked to an employee (trigger covers insert; we re-add on edit)
      if (form.employee_id && form.role_id !== EMPLOYEE_ROLE_ID && !extras.includes(EMPLOYEE_ROLE_ID)) {
        extras.push(EMPLOYEE_ROLE_ID);
      }
      if (extras.length > 0) {
        await supabase
          .from("app_user_extra_roles")
          .insert(extras.map((rid) => ({ user_id: userId!, role_id: rid })));
      }
    }

    setDialogOpen(false);
    load();
  };


  const toggleStatus = async (u: AppUser) => {
    const next = u.status === "Active" ? "Inactive" : "Active";
    const { error } = await supabase.from("app_users").update({ status: next }).eq("id", u.id);
    if (error) return toast.error(error.message);
    toast.success(`স্ট্যাটাস ${next}`);
    load();
  };

  const resetPassword = async () => {
    if (!resetTarget || !resetPwd) return;
    const { error } = await supabase.from("app_users").update({ password: resetPwd }).eq("id", resetTarget.id);
    if (error) return toast.error(error.message);
    toast.success("পাসওয়ার্ড রিসেট হয়েছে");
    setResetTarget(null);
    setResetPwd("");
  };

  const remove = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("app_users").delete().eq("id", deleteTarget.id);
    if (error) return toast.error(error.message);
    toast.success("ডিলিট হয়েছে");
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">অ্যাপ ইউজার</h1>
          <p className="text-sm text-muted-foreground">এমপ্লয়িদের ERP প্যানেল লগইন অ্যাক্সেস ম্যানেজ করুন</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> নতুন App User</Button>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <Input placeholder="খুঁজুন: username, employee, role..." value={search} onChange={(e) => setSearch(e.target.value)} className="md:max-w-sm" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">কোনো App User নেই</TableCell></TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>
                    {u.employee ? (
                      <div className="text-sm">
                        <div>{u.employee.name}</div>
                        <div className="text-xs text-muted-foreground">{u.employee.employee_id}</div>
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.role?.name ? <Badge>{u.role.name}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                      {(u.extra_roles || []).map((er) => (
                        er.role ? <Badge key={er.role_id} variant="outline" className="text-xs">+{er.role.name}</Badge> : null
                      ))}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={u.status === "Active" ? "default" : "secondary"}>{u.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Reset password" onClick={() => { setResetTarget(u); setResetPwd(""); }}><KeyRound className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Toggle status" onClick={() => toggleStatus(u)}><Power className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Delete" onClick={() => setDeleteTarget(u)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "App User এডিট করুন" : "নতুন App User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee</Label>
              <Select value={form.employee_id} onValueChange={handleEmployeeSelect}>
                <SelectTrigger><SelectValue placeholder="Employee সিলেক্ট করুন" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} {e.employee_id ? `(${e.employee_id})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Username *</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{editing ? "নতুন পাসওয়ার্ড" : "পাসওয়ার্ড *"}</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "ফাঁকা = অপরিবর্তিত" : ""} />
              </div>
              <div>
                <Label>Confirm</Label>
                <Input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Role *</Label>
              <Select value={form.role_id} onValueChange={(v) => setForm({ ...form, role_id: v })}>
                <SelectTrigger><SelectValue placeholder="রোল সিলেক্ট করুন" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
            <Button onClick={save}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>পাসওয়ার্ড রিসেট — {resetTarget?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>নতুন পাসওয়ার্ড</Label>
            <Input type="password" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>বাতিল</Button>
            <Button onClick={resetPassword}>রিসেট করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ডিলিট নিশ্চিত?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.username}" ইউজারটি স্থায়ীভাবে মুছে যাবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>ডিলিট</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
