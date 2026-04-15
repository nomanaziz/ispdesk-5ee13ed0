import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Users as UsersIcon, Plus, Search, Eye, EyeOff, Trash2, Shield, Lock, Edit, User, Briefcase, ChevronRight } from "lucide-react";
import { toast } from "sonner";

// Module permissions structure matching Galaxy Net
const MODULE_GROUPS = [
  { group: "CONFIGURATION", modules: ["Zone", "Sub Zone", "Box", "Connection Type", "Client Type", "Protocol Type", "Billing Status", "Package", "District", "Upazila"] },
  { group: "VAS", modules: ["VAS Config", "VAS Subscription", "VAS Transaction"] },
  { group: "CLIENT", modules: ["Client List", "Add Client", "New Request", "Change Request", "Left Clients", "Portal Manage", "Scheduler"] },
  { group: "BILLING", modules: ["Billing List", "Daily Collection", "Client Profile"] },
  { group: "MIKROTIK SERVER", modules: ["Servers", "Import", "Bulk Import", "Backup"] },
  { group: "HR & PAYROLL", modules: ["Employees", "Add Employee", "Departments", "Positions", "Attendance", "Attendance Rules", "Shift Management", "Leave", "Payroll", "Salary Sheet", "Payslip", "Payheads", "Resignations", "ZKTeco Devices"] },
  { group: "OLT MANAGEMENT", modules: ["OLT Devices", "ONU List", "OLT Users", "OLT Sharing", "Fiber Down Finder", "User Down Count"] },
  { group: "NETWORK DIAGRAM", modules: ["Diagram", "Network POP", "Connections", "Distributed Items", "Network Clients", "Map"] },
  { group: "MONITORING", modules: ["Switch List", "Add Switch", "POP Devices", "POP IP", "POP Log", "POP DASS", "Ping Tools"] },
  { group: "BRANCH OFFICE", modules: ["Managers", "Add Manager", "Branch Packages", "Tariff", "Funding", "PGW Payments", "PGW Settlement", "POP Notice"] },
  { group: "LEAVE MANAGEMENT", modules: ["Apply", "Approval", "Categories", "Setup"] },
  { group: "SUPPORT & TICKETING", modules: ["Tickets", "History", "Support Categories"] },
  { group: "TASK MANAGEMENT", modules: ["Tasks", "Task History", "Task Categories"] },
  { group: "BANDWIDTH BUY", modules: ["Providers", "Items", "Categories", "Bills", "Bill Form", "Bill View"] },
  { group: "BANDWIDTH SALE", modules: ["POP", "Invoices", "Collection", "Recurring"] },
  { group: "PURCHASE", modules: ["Vendors", "Requisitions", "Purchase Bills", "Purchases"] },
  { group: "SALES & SERVICE", modules: ["Service Invoice", "Product Invoice", "Installation Fee"] },
  { group: "INVENTORY", modules: ["Items", "Categories", "Locations", "Units", "Stock"] },
  { group: "ASSETS", modules: ["Asset List", "Destroyed"] },
  { group: "ACCOUNTING", modules: ["Dashboard", "Chart of Accounts", "Journal", "Transactions", "Income", "Expense", "Cash Book", "Trial Balance", "Profit & Loss", "Balance Sheet", "Balances", "Compare P&L"] },
  { group: "REPORT", modules: ["Bill Collection", "Customer", "Financial", "Discount", "BTRC", "Due SMS", "Processing Fee", "Messages"] },
  { group: "SMS", modules: ["Send", "Individual", "Groups", "Templates", "Gateway"] },
  { group: "EVENTS & HOLIDAYS", modules: ["Events"] },
  { group: "WEBSITE", modules: ["Dashboard", "Homepage", "Menu", "Pages", "About", "Services", "Features", "Offers", "Partners", "Testimonials", "Media", "Notices", "Festivals", "Settings"] },
  { group: "SYSTEM", modules: ["Company", "Setup", "Invoice", "Periods", "Email", "Payment Gateways", "Processing Fee", "App Users", "Roles", "System Log", "OLT Permissions"] },
];

const COMMON_PERMISSIONS = [
  "Change Contact & Personal Remarks Info", "Change MikroTik Status", "Customer Assign to Employees",
  "Client Info Pass to MikroTik", "Customer Details", "Customer Edit", "Register New Client",
  "Remove Assigned Customer (From Employee)", "Status Change Scheduler", "Package Change Scheduler",
  "Send Individual SMS", "Enable Selected Clients", "Disable Selected Clients", "Log In As Client",
  "Change Log In As Client Access", "Receive Bill History Cancel", "Generated Invoice Edit",
  "Password Regenerate", "Client Delete", "Bulk Status Change",
  "Allow Discount Edit (Receive Bill)", "Allow VAT Apply (Receive Bill)",
];

type PermissionLevel = "full" | "write" | "read";
interface ModulePermission { enabled: boolean; permission: PermissionLevel; }
interface RoleModuleState { role_id: string; modules: Record<string, Record<string, ModulePermission>>; commonPermissions: Record<string, boolean>; }

export default function Users() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState("100");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Wizard
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newUser, setNewUser] = useState({ username: "", password: "", confirm_password: "", status: "Active", employee_id: "", role_id: "" });

  // Other dialogs
  const [showNewRoleDialog, setShowNewRoleDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [newRole, setNewRole] = useState({ name: "", status: "Active", redirect_url: "" });
  const [permState, setPermState] = useState<RoleModuleState>({ role_id: "", modules: {}, commonPermissions: {} });

  // Queries
  const { data: appUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["app_users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_users").select("*, employees(name), app_roles(name)").order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: appRoles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["app_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_roles").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: roleModules = [] } = useQuery({
    queryKey: ["app_role_modules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_role_modules").select("*, app_roles(name)").order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees_for_users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id, name, employee_id").eq("status", "active").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Mutations
  const createUser = useMutation({
    mutationFn: async (user: typeof newUser) => {
      const { error } = await supabase.from("app_users").insert({ username: user.username, password: user.password, status: user.status, employee_id: user.employee_id || null, role_id: user.role_id || null });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["app_users"] }); setShowNewUserDialog(false); setWizardStep(1); setNewUser({ username: "", password: "", confirm_password: "", status: "Active", employee_id: "", role_id: "" }); toast.success("ইউজার তৈরি হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("app_users").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["app_users"] }); toast.success("ইউজার মুছে ফেলা হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const createRole = useMutation({
    mutationFn: async (role: typeof newRole) => { const { error } = await supabase.from("app_roles").insert(role); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["app_roles"] }); setShowNewRoleDialog(false); setNewRole({ name: "", status: "Active", redirect_url: "" }); toast.success("রোল তৈরি হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRole = useMutation({
    mutationFn: async (role: any) => { const { error } = await supabase.from("app_roles").update({ name: role.name, status: role.status, redirect_url: role.redirect_url }).eq("id", role.id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["app_roles"] }); setEditingRole(null); toast.success("রোল আপডেট হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRole = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("app_roles").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["app_roles"] }); toast.success("রোল মুছে ফেলা হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const savePermissions = useMutation({
    mutationFn: async (state: RoleModuleState) => {
      await supabase.from("app_role_modules").delete().eq("role_id", state.role_id);
      const rows: any[] = [];
      for (const [group, modules] of Object.entries(state.modules)) {
        for (const [mod, perm] of Object.entries(modules)) {
          if (perm.enabled) rows.push({ role_id: state.role_id, module_group: group, module_name: mod, enabled: true, permission: perm.permission });
        }
      }
      for (const [perm, enabled] of Object.entries(state.commonPermissions)) {
        if (enabled) rows.push({ role_id: state.role_id, module_group: "COMMON_PERMISSIONS", module_name: perm, enabled: true, permission: "full" });
      }
      if (rows.length > 0) { const { error } = await supabase.from("app_role_modules").insert(rows); if (error) throw error; }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["app_role_modules"] }); setShowPermissionDialog(false); toast.success("পার্মিশন সংরক্ষিত হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openPermissionDialog = (roleId?: string) => {
    const modules: Record<string, Record<string, ModulePermission>> = {};
    MODULE_GROUPS.forEach(g => { modules[g.group] = {}; g.modules.forEach(m => { modules[g.group][m] = { enabled: false, permission: "read" }; }); });
    const commonPerms: Record<string, boolean> = {};
    COMMON_PERMISSIONS.forEach(p => { commonPerms[p] = false; });
    if (roleId) {
      const existing = roleModules.filter((rm: any) => rm.role_id === roleId);
      existing.forEach((rm: any) => {
        if (rm.module_group === "COMMON_PERMISSIONS") commonPerms[rm.module_name] = true;
        else if (modules[rm.module_group]?.[rm.module_name]) modules[rm.module_group][rm.module_name] = { enabled: rm.enabled, permission: rm.permission as PermissionLevel };
      });
    }
    setPermState({ role_id: roleId || "", modules, commonPermissions: commonPerms });
    setShowPermissionDialog(true);
  };

  const toggleGroupAll = (group: string) => {
    setPermState(prev => {
      const mods = { ...prev.modules }; const g = { ...mods[group] };
      const allEnabled = Object.values(g).every(m => m.enabled);
      for (const key in g) g[key] = { ...g[key], enabled: !allEnabled };
      mods[group] = g; return { ...prev, modules: mods };
    });
  };
  const toggleModule = (group: string, mod: string) => {
    setPermState(prev => { const mods = { ...prev.modules }; const g = { ...mods[group] }; g[mod] = { ...g[mod], enabled: !g[mod].enabled }; mods[group] = g; return { ...prev, modules: mods }; });
  };
  const setModulePermission = (group: string, mod: string, perm: PermissionLevel) => {
    setPermState(prev => { const mods = { ...prev.modules }; const g = { ...mods[group] }; g[mod] = { ...g[mod], permission: perm, enabled: true }; mods[group] = g; return { ...prev, modules: mods }; });
  };

  const togglePassword = (id: string) => setShowPasswords(p => ({ ...p, [id]: !p[id] }));

  const filteredUsers = appUsers.filter((u: any) => {
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (roleFilter !== "all" && u.role_id !== roleFilter) return false;
    if (employeeFilter !== "all") { if (employeeFilter === "none" && u.employee_id) return false; if (employeeFilter !== "none" && u.employee_id !== employeeFilter) return false; }
    if (search) { const s = search.toLowerCase(); return u.username?.toLowerCase().includes(s) || (u.employees?.name || "").toLowerCase().includes(s); }
    return true;
  });

  const getAssignedModules = (roleId: string | null) => {
    if (!roleId) return "";
    const mods = roleModules.filter((rm: any) => rm.role_id === roleId && rm.module_group !== "COMMON_PERMISSIONS" && rm.enabled);
    const groups = [...new Set(mods.map((m: any) => m.module_group))];
    return groups.slice(0, 3).join(", ") + (groups.length > 3 ? "..." : "");
  };

  const getRoleModuleSummary = () => {
    const grouped: Record<string, { role: any; modules: string[] }> = {};
    roleModules.forEach((rm: any) => {
      if (rm.module_group === "COMMON_PERMISSIONS") return;
      if (!grouped[rm.role_id]) grouped[rm.role_id] = { role: appRoles.find((r: any) => r.id === rm.role_id), modules: [] };
      if (rm.enabled && !grouped[rm.role_id].modules.includes(rm.module_group)) grouped[rm.role_id].modules.push(rm.module_group);
    });
    return Object.entries(grouped).map(([roleId, data]) => ({
      roleId, roleName: data.role?.name || "—", status: data.role?.status || "Active",
      modules: data.modules.join(", "), createdBy: data.role?.created_by || "",
      createdOn: data.role?.created_at ? new Date(data.role.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "",
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><UsersIcon className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-lg font-bold text-foreground">App Users</h1>
            <p className="text-xs text-muted-foreground">All Users of Application</p>
          </div>
        </div>
        <div className="sm:ml-auto text-xs text-muted-foreground">সিস্টেম &gt; App Users</div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-muted/50 w-full sm:w-auto flex overflow-x-auto">
          <TabsTrigger value="users" className="gap-1.5 text-xs flex-1 sm:flex-none"><UsersIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Application</span> Users</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 text-xs flex-1 sm:flex-none"><Shield className="h-3.5 w-3.5" /> Roles</TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5 text-xs flex-1 sm:flex-none"><Lock className="h-3.5 w-3.5" /> Permissions</TabsTrigger>
        </TabsList>

        {/* ======== APPLICATION USERS TAB ======== */}
        <TabsContent value="users">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2"><UsersIcon className="h-4 w-4" /> Application Users</span>
              <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => { setShowNewUserDialog(true); setWizardStep(1); }}>
                <Plus className="h-3 w-3" /> New User
              </Button>
            </div>
            <div className="p-4 bg-card space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><Label className="text-xs mb-1 block">USER STATUS</Label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="all">সকল</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="InActive">InActive</SelectItem></SelectContent></Select></div>
                <div><Label className="text-xs mb-1 block">EMPLOYEE</Label><Select value={employeeFilter} onValueChange={setEmployeeFilter}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="all">সকল</SelectItem><SelectItem value="none">Without Employee</SelectItem>{employees.map((e: any) => (<SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>))}</SelectContent></Select></div>
                <div><Label className="text-xs mb-1 block">USER ROLE</Label><Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="all">সকল</SelectItem>{appRoles.map((r: any) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent></Select></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">SHOW</span><Select value={entriesPerPage} onValueChange={setEntriesPerPage}><SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent></Select><span className="text-xs text-muted-foreground">ENTRIES</span></div>
                <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">SEARCH:</span><Input value={search} onChange={e => setSearch(e.target.value)} className="h-8 w-48 text-xs" /></div>
              </div>
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#2c5f6e]">
                      <TableHead className="text-xs text-white w-16 text-center">Sr.No.</TableHead>
                      <TableHead className="text-xs text-white text-center">User Name</TableHead>
                      <TableHead className="text-xs text-white text-center">Password</TableHead>
                      <TableHead className="text-xs text-white text-center">Status</TableHead>
                      <TableHead className="text-xs text-white text-center">Employee</TableHead>
                      <TableHead className="text-xs text-white text-center">Role/Group</TableHead>
                      <TableHead className="text-xs text-white text-center">Assigned Module</TableHead>
                      <TableHead className="text-xs text-white text-center w-24">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingUsers ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">লোড হচ্ছে...</TableCell></TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">কোনো ইউজার নেই</TableCell></TableRow>
                    ) : (
                      filteredUsers.slice(0, parseInt(entriesPerPage)).map((u: any, i: number) => (
                        <TableRow key={u.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs text-center text-blue-600 font-medium">{i + 1}</TableCell>
                          <TableCell className="text-xs text-center font-medium">{u.username}</TableCell>
                          <TableCell className="text-xs text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-mono">{showPasswords[u.id] ? u.password : "••••••••••"}</span>
                              <button onClick={() => togglePassword(u.id)} className="text-blue-500 hover:text-blue-700">
                                {showPasswords[u.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-[10px] ${u.status === "Active" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}>{u.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-center">{u.employees?.name || ""}</TableCell>
                          <TableCell className="text-xs text-center">{u.app_roles?.name || ""}</TableCell>
                          <TableCell className="text-xs text-center">{getAssignedModules(u.role_id)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => navigate(`/dashboard/system/users/${u.id}`)} className="text-green-600 hover:text-green-800"><Eye className="h-4 w-4" /></button>
                              <button onClick={() => deleteUser.mutate(u.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="text-xs text-muted-foreground">Showing 1 to {Math.min(parseInt(entriesPerPage), filteredUsers.length)} of {filteredUsers.length} entries</div>
            </div>
          </div>
        </TabsContent>

        {/* ======== USER ROLES TAB ======== */}
        <TabsContent value="roles">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> User Roles(Groups)</span>
              <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => setShowNewRoleDialog(true)}><Plus className="h-3 w-3" /> New Role(Group)</Button>
            </div>
            <div className="p-4 bg-card space-y-4">
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#2c5f6e]">
                      <TableHead className="text-xs text-white w-16 text-center">Sr.No.</TableHead>
                      <TableHead className="text-xs text-white text-center">Name</TableHead>
                      <TableHead className="text-xs text-white text-center">Status</TableHead>
                      <TableHead className="text-xs text-white text-center">Redirect URL</TableHead>
                      <TableHead className="text-xs text-white text-center">CreatedBy</TableHead>
                      <TableHead className="text-xs text-white text-center">CreatedOn</TableHead>
                      <TableHead className="text-xs text-white text-center w-24">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingRoles ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">লোড হচ্ছে...</TableCell></TableRow>
                    ) : appRoles.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">কোনো রোল নেই</TableCell></TableRow>
                    ) : (
                      appRoles.map((r: any, i: number) => (
                        <TableRow key={r.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs text-center">{i + 1}</TableCell>
                          <TableCell className="text-xs text-center font-medium text-blue-600">{r.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-[10px] ${r.status === "Active" ? "bg-green-500 hover:bg-green-600" : r.status === "Not Assigned" ? "bg-orange-500 hover:bg-orange-600" : "bg-red-500 hover:bg-red-600"}`}>{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-center font-mono text-muted-foreground">{r.redirect_url || ""}</TableCell>
                          <TableCell className="text-xs text-center">{r.created_by || ""}</TableCell>
                          <TableCell className="text-xs text-center">{r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => setEditingRole({ ...r })} className="text-blue-500 hover:text-blue-700"><Edit className="h-4 w-4" /></button>
                              <button onClick={() => deleteRole.mutate(r.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="text-xs text-muted-foreground">Showing 1 to {appRoles.length} of {appRoles.length} entries</div>
            </div>
          </div>
        </TabsContent>

        {/* ======== ROLE MODULES TAB ======== */}
        <TabsContent value="permissions">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Role Modules(Permissions)</span>
              <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => openPermissionDialog()}><Plus className="h-3 w-3" /> New Role Module(Permission)</Button>
            </div>
            <div className="p-4 bg-card space-y-4">
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#2c5f6e]">
                      <TableHead className="text-xs text-white w-16 text-center">Sr.No.</TableHead>
                      <TableHead className="text-xs text-white text-center">Role</TableHead>
                      <TableHead className="text-xs text-white text-center">Status</TableHead>
                      <TableHead className="text-xs text-white text-center">Modules</TableHead>
                      <TableHead className="text-xs text-white text-center">CreatedBy</TableHead>
                      <TableHead className="text-xs text-white text-center">CreatedOn</TableHead>
                      <TableHead className="text-xs text-white text-center w-24">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getRoleModuleSummary().length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">কোনো রোল মডিউল নেই</TableCell></TableRow>
                    ) : (
                      getRoleModuleSummary().map((item, i) => (
                        <TableRow key={item.roleId} className="hover:bg-muted/30">
                          <TableCell className="text-xs text-center">{i + 1}</TableCell>
                          <TableCell className="text-xs text-center font-medium">{item.roleName}</TableCell>
                          <TableCell className="text-center"><Badge className={`text-[10px] ${item.status === "Active" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}>{item.status}</Badge></TableCell>
                          <TableCell className="text-xs text-center max-w-xs truncate">{item.modules}</TableCell>
                          <TableCell className="text-xs text-center">{item.createdBy}</TableCell>
                          <TableCell className="text-xs text-center">{item.createdOn}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => openPermissionDialog(item.roleId)} className="text-blue-500 hover:text-blue-700"><Edit className="h-4 w-4" /></button>
                              <button onClick={() => { supabase.from("app_role_modules").delete().eq("role_id", item.roleId).then(() => { queryClient.invalidateQueries({ queryKey: ["app_role_modules"] }); toast.success("মুছে ফেলা হয়েছে"); }); }} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ======== NEW USER WIZARD ======== */}
      <Dialog open={showNewUserDialog} onOpenChange={(v) => { setShowNewUserDialog(v); if (!v) setWizardStep(1); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-center text-lg">Create New User</DialogTitle></DialogHeader>
          <div className="flex items-center justify-center gap-6 py-2">
            {[{ step: 1, icon: User, label: "User Info" }, { step: 2, icon: Briefcase, label: "Employee Assign" }, { step: 3, icon: Shield, label: "User Role(Group)" }].map(({ step, icon: Icon, label }) => (
              <div key={step} className="flex flex-col items-center gap-1">
                <div className={`rounded-full p-2 ${wizardStep === step ? "bg-[#2c5f6e] text-white" : wizardStep > step ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}><Icon className="h-5 w-5" /></div>
                <span className={`text-[10px] ${wizardStep === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
              </div>
            ))}
          </div>
          <Progress value={(wizardStep / 3) * 100} className="h-1.5" />
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between"><span className="text-sm font-medium">{wizardStep === 1 ? "User Information" : wizardStep === 2 ? "Employee Assign" : "User Role(Group)"}</span><span className="text-xs text-muted-foreground">Step {wizardStep} - 3</span></div>
            {wizardStep === 1 && (<>
              <div><Label className="text-xs">USER NAME: <span className="text-destructive">*</span></Label><Input value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} /></div>
              <div><Label className="text-xs">PASSWORD: <span className="text-destructive">*</span></Label><Input type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} /></div>
              <div><Label className="text-xs">CONFIRM PASSWORD: <span className="text-destructive">*</span></Label><Input type="password" value={newUser.confirm_password} onChange={e => setNewUser(p => ({ ...p, confirm_password: e.target.value }))} /></div>
              <div><Label className="text-xs">ACTIVITY STATUS:</Label><Select value={newUser.status} onValueChange={v => setNewUser(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="InActive">InActive</SelectItem></SelectContent></Select></div>
            </>)}
            {wizardStep === 2 && (
              <div><Label className="text-xs">EMPLOYEE (Optional):</Label><Select value={newUser.employee_id} onValueChange={v => setNewUser(p => ({ ...p, employee_id: v }))}><SelectTrigger><SelectValue placeholder="Without Employee" /></SelectTrigger><SelectContent><SelectItem value="">Without Employee</SelectItem>{employees.map((e: any) => (<SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_id})</SelectItem>))}</SelectContent></Select><p className="text-xs text-muted-foreground mt-2">ইউজার কোনো কর্মচারীর সাথে যুক্ত না হলে "Without Employee" সিলেক্ট করুন।</p></div>
            )}
            {wizardStep === 3 && (
              <div><Label className="text-xs">USER ROLE(GROUP):</Label><Select value={newUser.role_id} onValueChange={v => setNewUser(p => ({ ...p, role_id: v }))}><SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger><SelectContent>{appRoles.map((r: any) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent></Select></div>
            )}
            <div className="flex gap-3 pt-2">
              {wizardStep > 1 && <Button variant="outline" onClick={() => setWizardStep(s => s - 1)} className="flex-1">Previous</Button>}
              {wizardStep < 3 ? (
                <Button onClick={() => { if (wizardStep === 1) { if (!newUser.username) { toast.error("ইউজারনেম দিন"); return; } if (!newUser.password) { toast.error("পাসওয়ার্ড দিন"); return; } if (newUser.password !== newUser.confirm_password) { toast.error("পাসওয়ার্ড মিলছে না"); return; } } setWizardStep(s => s + 1); }} className="flex-1 bg-[#2c5f6e] hover:bg-[#245069] gap-1">Next <ChevronRight className="h-4 w-4" /></Button>
              ) : (
                <Button onClick={() => createUser.mutate(newUser)} disabled={createUser.isPending} className="flex-1 bg-green-600 hover:bg-green-700">Save & Exit</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======== NEW ROLE DIALOG ======== */}
      <Dialog open={showNewRoleDialog} onOpenChange={setShowNewRoleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-center text-lg">Create New Role</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">ROLE NAME <span className="text-destructive">*</span></Label><Input value={newRole.name} onChange={e => setNewRole(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label className="text-xs">ROLE STATUS</Label><Select value={newRole.status} onValueChange={v => setNewRole(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="InActive">InActive</SelectItem><SelectItem value="Not Assigned">Not Assigned</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">REDIRECT URL</Label><Input value={newRole.redirect_url} onChange={e => setNewRole(p => ({ ...p, redirect_url: e.target.value }))} placeholder="/dashboard" /></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowNewRoleDialog(false)} className="flex-1 border-red-400 text-red-500">Reset/Clear</Button>
              <Button onClick={() => createRole.mutate(newRole)} disabled={!newRole.name || createRole.isPending} className="flex-1 bg-[#2c5f6e] hover:bg-[#245069]">Save & Exit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======== EDIT ROLE DIALOG ======== */}
      <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-center text-lg">Edit Role</DialogTitle></DialogHeader>
          {editingRole && (
            <div className="space-y-4">
              <div><Label className="text-xs">ROLE NAME <span className="text-destructive">*</span></Label><Input value={editingRole.name} onChange={e => setEditingRole((p: any) => ({ ...p, name: e.target.value }))} /></div>
              <div><Label className="text-xs">ROLE STATUS</Label><Select value={editingRole.status} onValueChange={v => setEditingRole((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="InActive">InActive</SelectItem><SelectItem value="Not Assigned">Not Assigned</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs">REDIRECT URL</Label><Input value={editingRole.redirect_url || ""} onChange={e => setEditingRole((p: any) => ({ ...p, redirect_url: e.target.value }))} /></div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setEditingRole(null)} className="flex-1 border-red-400 text-red-500">Close</Button>
                <Button onClick={() => updateRole.mutate(editingRole)} disabled={updateRole.isPending} className="flex-1 bg-[#2c5f6e] hover:bg-[#245069]">Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ======== PERMISSION DIALOG ======== */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle className="text-center text-lg">{permState.role_id ? "Edit" : "Create New"} Role Module(Permission)</DialogTitle></DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div><Label className="text-xs">USER ROLE(GROUP) <span className="text-destructive">*</span></Label><Select value={permState.role_id} onValueChange={v => setPermState(p => ({ ...p, role_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{appRoles.map((r: any) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent></Select></div>
            <div>
              <Label className="text-xs font-semibold">MODULE PERMISSIONS <span className="text-destructive">*</span></Label>
              <div className="mt-2 space-y-1 border rounded-md overflow-hidden">
                {MODULE_GROUPS.map(g => {
                  const groupMods = permState.modules[g.group] || {};
                  const allEnabled = Object.values(groupMods).every(m => m.enabled);
                  return (
                    <div key={g.group}>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b">
                        <Checkbox checked={allEnabled} onCheckedChange={() => toggleGroupAll(g.group)} />
                        <span className="text-xs font-semibold uppercase">{g.group}</span>
                      </div>
                      {g.modules.map(mod => {
                        const mp = groupMods[mod] || { enabled: false, permission: "read" };
                        return (
                          <div key={mod} className="flex items-center gap-3 px-6 py-1 border-b last:border-0 hover:bg-muted/20">
                            <Checkbox checked={mp.enabled} onCheckedChange={() => toggleModule(g.group, mod)} />
                            <span className="text-xs flex-1 min-w-[140px]">{mod}</span>
                            <RadioGroup value={mp.permission} onValueChange={(v) => setModulePermission(g.group, mod, v as PermissionLevel)} className="flex gap-4">
                              <div className="flex items-center gap-1"><RadioGroupItem value="full" id={`${g.group}-${mod}-full`} className="h-3.5 w-3.5" /><Label htmlFor={`${g.group}-${mod}-full`} className="text-[10px] font-normal text-blue-600">Full</Label></div>
                              <div className="flex items-center gap-1"><RadioGroupItem value="write" id={`${g.group}-${mod}-write`} className="h-3.5 w-3.5" /><Label htmlFor={`${g.group}-${mod}-write`} className="text-[10px] font-normal">Write</Label></div>
                              <div className="flex items-center gap-1"><RadioGroupItem value="read" id={`${g.group}-${mod}-read`} className="h-3.5 w-3.5" /><Label htmlFor={`${g.group}-${mod}-read`} className="text-[10px] font-normal">Read</Label></div>
                            </RadioGroup>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox checked={Object.values(permState.commonPermissions).every(v => v)} onCheckedChange={(checked) => { setPermState(prev => { const cp = { ...prev.commonPermissions }; for (const k in cp) cp[k] = !!checked; return { ...prev, commonPermissions: cp }; }); }} />
                <Label className="text-xs font-semibold">COMMON PERMISSIONS</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMMON_PERMISSIONS.map(perm => (
                  <div key={perm} className="flex items-center gap-1.5 border rounded px-2 py-1 bg-muted/20">
                    <Checkbox checked={permState.commonPermissions[perm] || false} onCheckedChange={() => { setPermState(prev => ({ ...prev, commonPermissions: { ...prev.commonPermissions, [perm]: !prev.commonPermissions[perm] } })); }} />
                    <span className="text-[10px] whitespace-nowrap">{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { const modules: Record<string, Record<string, ModulePermission>> = {}; MODULE_GROUPS.forEach(g => { modules[g.group] = {}; g.modules.forEach(m => { modules[g.group][m] = { enabled: false, permission: "read" }; }); }); const cp: Record<string, boolean> = {}; COMMON_PERMISSIONS.forEach(p => { cp[p] = false; }); setPermState(prev => ({ ...prev, modules, commonPermissions: cp })); }} className="flex-1 border-red-400 text-red-500">Reset/Clear</Button>
            <Button onClick={() => savePermissions.mutate(permState)} disabled={!permState.role_id || savePermissions.isPending} className="flex-1 bg-[#2c5f6e] hover:bg-[#245069]">Save & Exit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
