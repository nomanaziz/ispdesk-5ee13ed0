import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users as UsersIcon, Edit, Eye, Key, ArrowLeft, Shield } from "lucide-react";
import { toast } from "sonner";

export default function UserReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editStep, setEditStep] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { data: user, isLoading } = useQuery({
    queryKey: ["app_user_detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_users")
        .select("*, employees(id, name, employee_id), app_roles(id, name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees_for_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, employee_id")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: appRoles = [] } = useQuery({
    queryKey: ["app_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_roles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: roleModules = [] } = useQuery({
    queryKey: ["app_role_modules", user?.role_id],
    queryFn: async () => {
      if (!user?.role_id) return [];
      const { data, error } = await supabase
        .from("app_role_modules")
        .select("*")
        .eq("role_id", user.role_id)
        .eq("enabled", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.role_id,
  });

  const updateUser = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("app_users").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_user_detail", id] });
      queryClient.invalidateQueries({ queryKey: ["app_users"] });
      setEditStep(null);
      toast.success("আপডেট হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = () => {
    const newStatus = user?.status === "Active" ? "InActive" : "Active";
    updateUser.mutate({ status: newStatus });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <div className="p-8 text-center text-muted-foreground">ইউজার পাওয়া যায়নি</div>;

  const assignedModuleGroups = [...new Set(roleModules.filter((m: any) => m.module_group !== "COMMON_PERMISSIONS").map((m: any) => m.module_group))];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/system/users")} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="p-2 rounded-lg bg-primary/10">
          <UsersIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">App Users <span className="text-sm font-normal text-muted-foreground">User Review</span></h1>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">সিস্টেম &gt; App Users &gt; User Review</div>
      </div>

      {/* User Basic Information */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2">
          <UsersIcon className="h-4 w-4" /> User Basic Information
        </div>
        <div className="bg-card divide-y">
          {/* Step 1 - User Information */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">Step 1- User Information</span>
              <span className="text-muted-foreground">:</span>
              <span className="text-sm">{user.username}</span>
              <Badge className={`text-[10px] ml-2 ${user.status === "Active" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}>
                {user.status}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1 h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => {
                setEditForm({ username: user.username, password: user.password });
                setEditStep(1);
              }}>
                <Edit className="h-3 w-3" /> Edit
              </Button>
              <Button size="sm" variant={user.status === "Active" ? "destructive" : "default"} className="gap-1 h-7 text-xs" onClick={toggleStatus}>
                <Key className="h-3 w-3" /> {user.status === "Active" ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>

          {/* Step 2 - Employee Assign */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">Step 2- Employee Assign</span>
              <span className="text-muted-foreground">:</span>
              <span className="text-sm">{user.employees?.name || <span className="text-muted-foreground italic">Not Assigned</span>}</span>
            </div>
            <Button size="sm" className="gap-1 h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => {
              setEditForm({ employee_id: user.employee_id || "" });
              setEditStep(2);
            }}>
              <Edit className="h-3 w-3" /> Edit
            </Button>
          </div>

          {/* Step 3 - User Role Information */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">Step 3- User Role Information</span>
              <span className="text-muted-foreground">:</span>
              <span className="text-sm">{user.app_roles?.name || <span className="text-muted-foreground italic">Not Assigned</span>}</span>
            </div>
            <Button size="sm" className="gap-1 h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => {
              setEditForm({ role_id: user.role_id || "" });
              setEditStep(3);
            }}>
              <Edit className="h-3 w-3" /> Edit
            </Button>
          </div>

          {/* Step 4 - Module Assign (View only) */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">Step 4- Module Assign</span>
              <span className="text-muted-foreground">:</span>
              <span className="text-sm text-muted-foreground">
                {assignedModuleGroups.length > 0 ? assignedModuleGroups.join(", ") : "No modules assigned"}
              </span>
            </div>
            <Button size="sm" className="gap-1 h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => setEditStep(4)}>
              <Eye className="h-3 w-3" /> View
            </Button>
          </div>
        </div>
      </div>

      {/* User Login History (placeholder) */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" /> User Login History
        </div>
        <div className="p-4 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">SHOW</span>
              <Select defaultValue="100">
                <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="100">100</SelectItem></SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">ENTRIES</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">SEARCH:</span>
              <Input className="h-8 w-48 text-xs" />
            </div>
          </div>
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#2c5f6e]">
                  <TableHead className="text-xs text-white text-center w-14">Sr.No</TableHead>
                  <TableHead className="text-xs text-white text-center">IP Address</TableHead>
                  <TableHead className="text-xs text-white text-center">Country</TableHead>
                  <TableHead className="text-xs text-white text-center">Region</TableHead>
                  <TableHead className="text-xs text-white text-center">City/Town</TableHead>
                  <TableHead className="text-xs text-white text-center">Organization</TableHead>
                  <TableHead className="text-xs text-white text-center">Status</TableHead>
                  <TableHead className="text-xs text-white text-center">LoggedIn On</TableHead>
                  <TableHead className="text-xs text-white text-center">LoggedOut On</TableHead>
                  <TableHead className="text-xs text-white text-center">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-6 text-xs">
                    লগইন হিস্ট্রি পরবর্তীতে যোগ হবে
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="text-xs text-muted-foreground">Showing 0 to 0 of 0 entries</div>
        </div>
      </div>

      {/* ==================== EDIT STEP 1 DIALOG ==================== */}
      <Dialog open={editStep === 1} onOpenChange={() => setEditStep(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Edit User Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">USER NAME <span className="text-destructive">*</span></Label>
              <Input value={editForm.username || ""} onChange={e => setEditForm((p: any) => ({ ...p, username: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">PASSWORD <span className="text-destructive">*</span></Label>
              <Input value={editForm.password || ""} onChange={e => setEditForm((p: any) => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditStep(null)} className="flex-1 border-red-400 text-red-500">Close</Button>
              <Button onClick={() => updateUser.mutate({ username: editForm.username, password: editForm.password })} disabled={updateUser.isPending} className="flex-1 bg-green-600 hover:bg-green-700">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== EDIT STEP 2 DIALOG ==================== */}
      <Dialog open={editStep === 2} onOpenChange={() => setEditStep(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Employee Assign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">EMPLOYEE</Label>
              <Select value={editForm.employee_id || ""} onValueChange={v => setEditForm((p: any) => ({ ...p, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Without Employee</SelectItem>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditStep(null)} className="flex-1 border-red-400 text-red-500">Close</Button>
              <Button onClick={() => updateUser.mutate({ employee_id: editForm.employee_id || null })} disabled={updateUser.isPending} className="flex-1 bg-green-600 hover:bg-green-700">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== EDIT STEP 3 DIALOG ==================== */}
      <Dialog open={editStep === 3} onOpenChange={() => setEditStep(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">User Role Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">USER ROLE</Label>
              <Select value={editForm.role_id || ""} onValueChange={v => setEditForm((p: any) => ({ ...p, role_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                <SelectContent>
                  {appRoles.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditStep(null)} className="flex-1 border-red-400 text-red-500">Close</Button>
              <Button onClick={() => updateUser.mutate({ role_id: editForm.role_id || null })} disabled={updateUser.isPending} className="flex-1 bg-green-600 hover:bg-green-700">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== VIEW STEP 4 DIALOG ==================== */}
      <Dialog open={editStep === 4} onOpenChange={() => setEditStep(null)}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Assigned Modules</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {assignedModuleGroups.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">কোনো মডিউল অ্যাসাইন করা হয়নি</p>
            ) : (
              assignedModuleGroups.map(group => {
                const mods = roleModules.filter((m: any) => m.module_group === group);
                return (
                  <div key={group} className="border rounded-md overflow-hidden">
                    <div className="bg-muted/50 px-3 py-1.5 font-semibold text-xs uppercase">{group}</div>
                    <div className="divide-y">
                      {mods.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between px-4 py-1.5">
                          <span className="text-xs">{m.module_name}</span>
                          <Badge variant="outline" className="text-[10px]">{m.permission}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setEditStep(null)} className="h-8 text-xs">Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
