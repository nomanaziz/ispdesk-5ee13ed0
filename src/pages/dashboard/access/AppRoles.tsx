import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Trash2, Lock, Save } from "lucide-react";

interface Role {
  id: string;
  name: string;
  status: string;
  redirect_url: string | null;
  is_protected: boolean;
  is_default: boolean;
}

interface Module {
  id: string;
  role_id: string;
  module_group: string;
  module_name: string;
  enabled: boolean;
  permission: string;
}

const PERMISSION_LEVELS = ["view", "edit", "delete"] as const;

export default function AppRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPerms, setSavingPerms] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", redirect_url: "/dashboard", status: "Active" });
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const loadRoles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("app_roles").select("*").order("is_protected", { ascending: false }).order("name");
    if (error) toast.error(error.message);
    else {
      setRoles((data as any) || []);
      if (!selectedId && data && data.length > 0) setSelectedId((data[0] as any).id);
    }
    setLoading(false);
  };

  const loadModules = async (roleId: string) => {
    const { data, error } = await supabase.from("app_role_modules").select("*").eq("role_id", roleId).order("module_group").order("module_name");
    if (error) toast.error(error.message);
    else setModules((data as any) || []);
  };

  useEffect(() => { loadRoles(); }, []);
  useEffect(() => { if (selectedId) loadModules(selectedId); }, [selectedId]);

  const selected = roles.find((r) => r.id === selectedId) || null;
  const isReadOnly = selected?.is_protected && selected.name === "Super Admin";

  const grouped = useMemo(() => {
    const map = new Map<string, Module[]>();
    for (const m of modules) {
      if (!map.has(m.module_group)) map.set(m.module_group, []);
      map.get(m.module_group)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [modules]);

  const updateModule = (id: string, patch: Partial<Module>) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const savePermissions = async () => {
    if (!selected || isReadOnly) return;
    setSavingPerms(true);
    const updates = modules.map((m) =>
      supabase.from("app_role_modules").update({ enabled: m.enabled, permission: m.permission }).eq("id", m.id)
    );
    const results = await Promise.all(updates);
    const err = results.find((r) => r.error);
    setSavingPerms(false);
    if (err?.error) toast.error(err.error.message);
    else toast.success("পারমিশন সংরক্ষণ হয়েছে");
  };

  const createRole = async () => {
    if (!newRole.name.trim()) return toast.error("নাম দিন");
    const { data, error } = await supabase.from("app_roles").insert({
      name: newRole.name.trim(),
      redirect_url: newRole.redirect_url || null,
      status: newRole.status,
      is_protected: false,
      is_default: false,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("রোল তৈরি হয়েছে");
    setCreateOpen(false);
    setNewRole({ name: "", redirect_url: "/dashboard", status: "Active" });
    await loadRoles();
    if (data) setSelectedId((data as any).id);
  };

  const deleteRole = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.is_protected) {
      toast.error("Protected রোল ডিলিট করা যাবে না");
      setDeleteTarget(null);
      return;
    }
    const { error } = await supabase.from("app_roles").delete().eq("id", deleteTarget.id);
    if (error) return toast.error(error.message);
    toast.success("ডিলিট হয়েছে");
    if (selectedId === deleteTarget.id) setSelectedId(null);
    setDeleteTarget(null);
    loadRoles();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">রোল ও পারমিশন</h1>
        <p className="text-sm text-muted-foreground">রোল তৈরি করুন এবং কোন মডিউলে কী অ্যাক্সেস পাবে নির্ধারণ করুন</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <Card className="p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">রোল তালিকা</h3>
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}><Plus className="h-3 w-3" /> নতুন</Button>
          </div>
          <div className="space-y-1">
            {loading ? (
              <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>
            ) : roles.length === 0 ? (
              <p className="text-xs text-muted-foreground">কোনো রোল নেই</p>
            ) : (
              roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between gap-2 ${
                    selectedId === r.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <span className="truncate">{r.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {r.is_protected && <Lock className="h-3 w-3 opacity-60" />}
                    {r.is_default && <Badge variant="secondary" className="text-[10px] py-0 px-1">Default</Badge>}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          {!selected ? (
            <p className="text-muted-foreground text-sm">একটি রোল সিলেক্ট করুন</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{selected.name}</h2>
                    {selected.is_protected && <Badge variant="outline">Protected</Badge>}
                    <Badge variant={selected.status === "Active" ? "default" : "secondary"}>{selected.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Redirect: {selected.redirect_url || "/dashboard"}</p>
                </div>
                <div className="flex gap-2">
                  {!selected.is_protected && (
                    <Button variant="outline" size="sm" onClick={() => setDeleteTarget(selected)}>
                      <Trash2 className="h-4 w-4 text-destructive" /> ডিলিট
                    </Button>
                  )}
                  <Button size="sm" disabled={isReadOnly || savingPerms} onClick={savePermissions}>
                    <Save className="h-4 w-4" /> {savingPerms ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}
                  </Button>
                </div>
              </div>

              {isReadOnly && (
                <div className="mb-3 p-3 rounded-md bg-muted text-sm text-muted-foreground">
                  Super Admin রোল-এর সব অ্যাক্সেস আছে — এডিট করা যাবে না।
                </div>
              )}

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {grouped.length === 0 ? (
                  <p className="text-sm text-muted-foreground">এই রোল-এর জন্য কোনো মডিউল কনফিগ নেই</p>
                ) : (
                  grouped.map(([group, items]) => (
                    <div key={group}>
                      <div className="flex items-center justify-between mb-2 sticky top-0 bg-background py-1">
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{group}</h3>
                        <span className="text-xs text-muted-foreground">{items.filter(i => i.enabled).length}/{items.length}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {items.map((m) => (
                          <div key={m.id} className="flex items-center justify-between gap-3 border rounded-md p-2">
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                              <Checkbox
                                checked={m.enabled}
                                disabled={isReadOnly}
                                onCheckedChange={(c) => updateModule(m.id, { enabled: !!c })}
                              />
                              <span className="text-sm truncate">{m.module_name}</span>
                            </label>
                            <select
                              disabled={isReadOnly || !m.enabled}
                              value={m.permission}
                              onChange={(e) => updateModule(m.id, { permission: e.target.value })}
                              className="text-xs border rounded px-2 py-1 bg-background disabled:opacity-50"
                            >
                              {PERMISSION_LEVELS.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>নতুন রোল</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>নাম *</Label>
              <Input value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} placeholder="যেমন: Accountant" />
            </div>
            <div>
              <Label>Default Redirect URL</Label>
              <Input value={newRole.redirect_url} onChange={(e) => setNewRole({ ...newRole, redirect_url: e.target.value })} placeholder="/dashboard" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>বাতিল</Button>
            <Button onClick={createRole}>তৈরি করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>রোল ডিলিট?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" রোল মুছে যাবে। এই রোলে অ্যাসাইনড App User-দের রোল null হয়ে যাবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRole}>ডিলিট</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
