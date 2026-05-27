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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Pencil, Trash2, KeyRound, Plus, Power, ShieldCheck, ChevronDown, Globe, Wrench, User as UserIcon } from "lucide-react";
import ExternalUserDialog from "@/components/access/ExternalUserDialog";

const EMPLOYEE_ROLE_ID = "33333333-3333-3333-3333-333333333333";

type UserType = "internal" | "external" | "remote_support";

interface AppUser {
  id: string;
  username: string;
  status: string;
  employee_id: string | null;
  role_id: string | null;
  created_at: string;
  user_type: UserType;
  access_expires_at: string | null;
  purpose: string | null;
  full_name: string | null;
  email: string | null;
  employee?: { id: string; name: string; employee_id: string | null } | null;
  role?: { id: string; name: string } | null;
  extra_roles?: { role_id: string; role: { id: string; name: string } | null }[];
}

interface Employee { id: string; name: string; employee_id: string | null; }
interface Role { id: string; name: string; is_protected: boolean; status: string; }

const formatExpiry = (iso: string | null) => {
  if (!iso) return { text: "Permanent", expired: false, soon: false };
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { text: "Expired", expired: true, soon: false };
  const hrs = Math.floor(ms / 3600000);
  if (hrs < 24) return { text: `${hrs}ঘ বাকি`, expired: false, soon: true };
  const days = Math.floor(hrs / 24);
  return { text: `${days} দিন বাকি`, expired: false, soon: days < 3 };
};

export default function AppUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [takenEmployeeIds, setTakenEmployeeIds] = useState<Set<string>>(new Set());
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeTab, setTypeTab] = useState<"all" | UserType>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [extOpen, setExtOpen] = useState<null | "external" | "remote_support">(null);
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
        .select("id, username, status, employee_id, role_id, created_at, user_type, access_expires_at, purpose, full_name, email, employee:employees(id,name,employee_id), role:app_roles(id,name)")
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

  const counts = useMemo(() => {
    const c = { all: users.length, internal: 0, external: 0, remote_support: 0 };
    users.forEach((u) => { c[u.user_type] = (c[u.user_type] || 0) + 1; });
    return c;
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (typeTab !== "all" && u.user_type !== typeTab) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.username.toLowerCase().includes(q) ||
        u.employee?.name?.toLowerCase().includes(q) ||
        u.employee?.employee_id?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.role?.name?.toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter, typeTab]);

  const openCreateInternal = () => {
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
      role_id: EMPLOYEE_ROLE_ID, // force Employee when linking an employee
      username: f.username || emp?.employee_id || emp?.name?.toLowerCase().replace(/\s+/g, ".") || "",
    }));
  };

  const isInternalEmployee = !!form.employee_id;

  const save = async () => {
    if (!form.username.trim()) return toast.error("ইউজারনেম দিন");
    const effectiveRoleId = isInternalEmployee ? EMPLOYEE_ROLE_ID : form.role_id;
    if (!effectiveRoleId) return toast.error("রোল সিলেক্ট করুন");
    if (!editing) {
      if (!form.password) return toast.error("পাসওয়ার্ড দিন");
      if (form.password !== form.confirm) return toast.error("পাসওয়ার্ড মিলছে না");
    } else if (form.password && form.password !== form.confirm) {
      return toast.error("পাসওয়ার্ড মিলছে না");
    }

    const payload: any = {
      username: form.username.trim(),
      employee_id: form.employee_id || null,
      role_id: effectiveRoleId,
      status: form.status,
    };
    if (!editing) payload.user_type = "internal";
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

    if (userId) {
      await supabase.from("app_user_extra_roles").delete().eq("user_id", userId);
      const extras = form.extra_role_ids.filter((rid) => rid && rid !== effectiveRoleId);
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

  const typeBadge = (t: UserType) => {
    if (t === "internal") return <Badge variant="secondary" className="text-xs"><UserIcon className="h-3 w-3 mr-1" />Internal</Badge>;
    if (t === "external") return <Badge variant="outline" className="text-xs"><Globe className="h-3 w-3 mr-1" />External</Badge>;
    return <Badge variant="outline" className="text-xs border-orange-500 text-orange-600"><Wrench className="h-3 w-3 mr-1" />Remote</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">অ্যাপ ইউজার</h1>
          <p className="text-sm text-muted-foreground">Internal employee, external partner ও remote support access ম্যানেজ করুন</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button><Plus className="h-4 w-4" /> নতুন App User <ChevronDown className="h-4 w-4 ml-1" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openCreateInternal}>
              <UserIcon className="h-4 w-4 mr-2" /> Employee থেকে বানান
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExtOpen("external")}>
              <Globe className="h-4 w-4 mr-2" /> External User যোগ করুন
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExtOpen("remote_support")}>
              <Wrench className="h-4 w-4 mr-2" /> Remote Support Access
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs value={typeTab} onValueChange={(v) => setTypeTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="internal">Internal ({counts.internal || 0})</TabsTrigger>
          <TabsTrigger value="external">External ({counts.external || 0})</TabsTrigger>
          <TabsTrigger value="remote_support">Remote ({counts.remote_support || 0})</TabsTrigger>
        </TabsList>
      </Tabs>

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
              <TableHead>Type</TableHead>
              <TableHead>Employee / Name</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">কোনো App User নেই</TableCell></TableRow>
            ) : (
              filtered.map((u) => {
                const exp = formatExpiry(u.access_expires_at);
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell>{typeBadge(u.user_type)}</TableCell>
                    <TableCell>
                      {u.employee ? (
                        <div className="text-sm">
                          <div>{u.employee.name}</div>
                          <div className="text-xs text-muted-foreground">{u.employee.employee_id}</div>
                        </div>
                      ) : u.full_name ? (
                        <div className="text-sm">
                          <div>{u.full_name}</div>
                          {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                        </div>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.role?.name ? (
                          u.user_type === "internal" && u.employee_id ? (
                            <Badge className="gap-1"><ShieldCheck className="h-3 w-3" />{u.role.name}</Badge>
                          ) : (
                            <Badge>{u.role.name}</Badge>
                          )
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                        {(u.extra_roles || []).map((er) => (
                          er.role ? <Badge key={er.role_id} variant="outline" className="text-xs">+{er.role.name}</Badge> : null
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={exp.expired ? "destructive" : exp.soon ? "outline" : "secondary"}
                        className={exp.soon && !exp.expired ? "border-orange-500 text-orange-600" : ""}
                      >
                        {exp.text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === "Active" ? "default" : "secondary"}>{u.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title="Reset password" onClick={() => { setResetTarget(u); setResetPwd(""); }}><KeyRound className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title="Toggle status" onClick={() => toggleStatus(u)}><Power className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title="Delete" onClick={() => setDeleteTarget(u)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "App User এডিট করুন" : "Employee থেকে App User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee</Label>
              <Select value={form.employee_id} onValueChange={handleEmployeeSelect}>
                <SelectTrigger><SelectValue placeholder="Employee সিলেক্ট করুন" /></SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e) => !takenEmployeeIds.has(e.id) || e.id === editing?.employee_id)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name} {e.employee_id ? `(${e.employee_id})` : ""}</SelectItem>
                    ))}
                  {employees.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">কোনো active employee নেই</div>
                  )}
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

            {isInternalEmployee ? (
              <div>
                <Label>Primary Role</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="font-medium">Employee</span>
                  <Badge variant="outline" className="ml-auto text-xs">🔒 Fixed</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Employee-র জন্য primary role সবসময় "Employee" — পরিবর্তনযোগ্য না।
                </p>
              </div>
            ) : (
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
            )}

            <div>
              <Label>অতিরিক্ত Role (Department-ভিত্তিক)</Label>
              <div className="rounded-md border p-2 grid grid-cols-2 gap-2 max-h-40 overflow-auto">
                {roles
                  .filter((r) => r.id !== EMPLOYEE_ROLE_ID && (!isInternalEmployee || r.id !== form.role_id))
                  .map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.extra_role_ids.includes(r.id)}
                        onCheckedChange={() =>
                          setForm((f) => ({
                            ...f,
                            extra_role_ids: f.extra_role_ids.includes(r.id)
                              ? f.extra_role_ids.filter((x) => x !== r.id)
                              : [...f.extra_role_ids, r.id],
                          }))
                        }
                      />
                      {r.name}
                    </label>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Billing, HR, Accounts ইত্যাদি বাড়তি permission।
              </p>
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

      <ExternalUserDialog
        open={extOpen !== null}
        mode={(extOpen || "external") as any}
        onOpenChange={(o) => !o && setExtOpen(null)}
        onCreated={load}
      />

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
