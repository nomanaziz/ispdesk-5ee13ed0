import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Server, RefreshCw, Trash2, Wifi, WifiOff, Cloud, Users, DownloadCloud, UploadCloud, Link2, Unlink2, Search, X, UserPlus } from "lucide-react";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ADMS_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/zkteco-adms`;

type FormState = {
  name: string;
  connection_type: "tcp_ip" | "adms_push";
  ip_address: string;
  port: number;
  comm_key: number;
  serial_number: string;
  location: string;
  status: string;
};

const blankForm: FormState = {
  name: "", connection_type: "tcp_ip", ip_address: "", port: 4370,
  comm_key: 0, serial_number: "", location: "", status: "active",
};

export default function ZktecoDevices() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [activeDeviceId, setActiveDeviceId] = useState<string>("");
  const [lastPullDebug, setLastPullDebug] = useState<{ log?: string[]; warning?: string; pulled_count?: number; device_user_count?: number | null } | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const { data: devices, isLoading } = useQuery({
    queryKey: ["zkteco-devices"],
    queryFn: async () => {
      const { data } = await supabase.from("zkteco_devices").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Device Users tab
  const selectedDeviceId = activeDeviceId || devices?.[0]?.id || "";

  const { data: deviceUsers, refetch: refetchDeviceUsers } = useQuery({
    queryKey: ["zkteco-device-users", selectedDeviceId],
    queryFn: async () => {
      if (!selectedDeviceId) return [];
      const { data } = await supabase.from("zkteco_device_users")
        .select("*, employee:mapped_employee_id(id, name, employee_id)")
        .eq("device_id", selectedDeviceId)
        .order("device_user_id");
      return data || [];
    },
    enabled: !!selectedDeviceId,
  });

  const { data: employees } = useQuery({
    queryKey: ["all-employees-mini"],
    queryFn: async () => {
      const { data } = await supabase.from("employees")
        .select("id, employee_id, name, device_user_id")
        .order("name");
      return data || [];
    },
  });

  const unmappedEmployees = (employees || []).filter((e: any) => !e.device_user_id);

  const saveMutation = useMutation({
    mutationFn: async (values: FormState) => {
      const isAdms = values.connection_type === "adms_push";
      if (isAdms && !values.serial_number.trim()) throw new Error("ADMS Push mode-এ Serial Number আবশ্যক");
      if (!isAdms && !values.ip_address.trim()) throw new Error("TCP/IP mode-এ IP Address আবশ্যক");
      const payload: any = {
        name: values.name,
        connection_type: values.connection_type,
        ip_address: isAdms ? null : values.ip_address.trim(),
        port: isAdms ? null : Number(values.port),
        comm_key: isAdms ? 0 : Number(values.comm_key) || 0,
        serial_number: values.serial_number.trim() || null,
        location: values.location || null,
        status: values.status,
      };
      if (editId) {
        const { error } = await supabase.from("zkteco_devices").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("zkteco_devices").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["zkteco-devices"] });
      toast.success(editId ? "ডিভাইস আপডেট হয়েছে" : "ডিভাইস যোগ হয়েছে");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("zkteco_devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["zkteco-devices"] });
      toast.success("ডিভাইস মুছে ফেলা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const { data, error } = await supabase.functions.invoke("sync-zkteco-data", { body: { device_id: deviceId } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["zkteco-devices"] });
      if (data?.ok === false) {
        toast.error(data.error || "ডিভাইস reachable না", {
          description: data.code === "DEVICE_UNREACHABLE" ? "Port forwarding / firewall / device online status চেক করুন।" : undefined,
        });
        return;
      }
      toast.success(`অ্যাটেনডেন্স সিঙ্ক সফল! ${data?.synced_count || 0} রেকর্ড`);
    },
    onError: (e: any) => toast.error(`সিঙ্ক ব্যর্থ: ${e.message}`),
  });

  const pullUsersMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const { data, error } = await supabase.functions.invoke("zkteco-user-pull", { body: { device_id: deviceId } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      setLastPullDebug(data);
      if (data?.ok === false) {
        toast.error(data.error || "User pull ব্যর্থ");
        setShowDebug(true);
        return;
      }
      const n = data?.pulled_count || 0;
      if (n === 0) {
        toast.warning(data?.warning || "0 user pull হয়েছে — debug log দেখুন");
        setShowDebug(true);
      } else {
        toast.success(`${n} জন user pull হয়েছে`);
      }
      refetchDeviceUsers();
    },
    onError: (e: any) => toast.error(`Pull ব্যর্থ: ${e.message}`),
  });

  const pushEmployeesMutation = useMutation({
    mutationFn: async ({ deviceId, employeeIds, action }: { deviceId: string; employeeIds: string[]; action: "push" | "delete" }) => {
      const { data, error } = await supabase.functions.invoke("zkteco-user-push", {
        body: { device_id: deviceId, employee_ids: employeeIds, action },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.ok === false) {
        toast.error(data.error || "Push ব্যর্থ");
        return;
      }
      toast.success(`${data?.success || 0}/${data?.total || 0} সফল`);
      refetchDeviceUsers();
      qc.invalidateQueries({ queryKey: ["all-employees-mini"] });
      setSelectedEmpIds([]);
    },
    onError: (e: any) => toast.error(`Push ব্যর্থ: ${e.message}`),
  });

  const mapMutation = useMutation({
    mutationFn: async ({ deviceUserRowId, employeeId, deviceUserId }: { deviceUserRowId: string; employeeId: string; deviceUserId: string }) => {
      const { error: e1 } = await supabase.from("zkteco_device_users")
        .update({ mapped_employee_id: employeeId }).eq("id", deviceUserRowId);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("employees")
        .update({ device_user_id: deviceUserId, zkteco_device_id: selectedDeviceId })
        .eq("id", employeeId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Mapping save হয়েছে");
      refetchDeviceUsers();
      qc.invalidateQueries({ queryKey: ["all-employees-mini"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const unlinkMutation = useMutation({
    mutationFn: async ({ deviceUserRowId, employeeId }: { deviceUserRowId: string; employeeId?: string }) => {
      const { error: e1 } = await supabase.from("zkteco_device_users")
        .update({ mapped_employee_id: null }).eq("id", deviceUserRowId);
      if (e1) throw e1;
      if (employeeId) {
        const { error: e2 } = await supabase.from("employees")
          .update({ device_user_id: null, zkteco_device_id: null })
          .eq("id", employeeId);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success("Unlink সম্পন্ন");
      refetchDeviceUsers();
      qc.invalidateQueries({ queryKey: ["all-employees-mini"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => { setOpen(false); setEditId(null); setForm(blankForm); };
  const openEdit = (d: any) => {
    setEditId(d.id);
    setForm({
      name: d.name, connection_type: (d.connection_type as any) || "tcp_ip",
      ip_address: d.ip_address || "", port: d.port || 4370, comm_key: d.comm_key || 0,
      serial_number: d.serial_number || "", location: d.location || "", status: d.status,
    });
    setOpen(true);
  };
  const isAdms = form.connection_type === "adms_push";

  // Push panel selection
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const toggleEmp = (id: string) => setSelectedEmpIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const [duSearch, setDuSearch] = useState("");
  const [empSearch, setEmpSearch] = useState("");

  const filteredDeviceUsers = (deviceUsers || []).filter((u: any) => {
    if (!duSearch.trim()) return true;
    const q = duSearch.toLowerCase();
    return String(u.device_user_id || "").toLowerCase().includes(q)
      || String(u.name || "").toLowerCase().includes(q)
      || String(u.card_no || "").toLowerCase().includes(q)
      || String(u.employee?.name || "").toLowerCase().includes(q)
      || String(u.employee?.employee_id || "").toLowerCase().includes(q);
  });
  const filteredUnmapped = unmappedEmployees.filter((e: any) => {
    if (!empSearch.trim()) return true;
    const q = empSearch.toLowerCase();
    return String(e.name || "").toLowerCase().includes(q)
      || String(e.employee_id || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ZKTeco ডিভাইস ও Users</h1>
          <p className="text-sm text-muted-foreground">HR & Payroll — অ্যাটেনডেন্স ডিভাইস ম্যানেজমেন্ট</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> ডিভাইস যোগ করুন</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "ডিভাইস সম্পাদনা" : "নতুন ZKTeco ডিভাইস"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Connection Type *</Label>
                <Select value={form.connection_type} onValueChange={(v) => setForm({ ...form, connection_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tcp_ip">TCP/IP (LAN)</SelectItem>
                    <SelectItem value="adms_push">ADMS Push (Cloud)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ডিভাইস নাম *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Gate Device" />
              </div>
              {!isAdms ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>IP Address *</Label>
                      <Input value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="192.168.1.201" />
                    </div>
                    <div>
                      <Label>Port</Label>
                      <Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div>
                    <Label>Comm Key</Label>
                    <Input type="number" value={form.comm_key} onChange={(e) => setForm({ ...form, comm_key: Number(e.target.value) })} placeholder="0 (default)" />
                  </div>
                </>
              ) : (
                <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium"><Cloud className="h-4 w-4" /> ADMS Push Setup</div>
                  <p className="text-xs text-muted-foreground">Device-এর Menu → Comm → Cloud Server-এ এই URL দিন:</p>
                  <code className="block text-xs bg-background p-2 rounded border break-all">{ADMS_URL}</code>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Serial Number{isAdms ? " *" : ""}</Label>
                  <Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>স্ট্যাটাস</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name}>
                {editId ? "আপডেট" : "সংরক্ষণ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices"><Server className="h-4 w-4 mr-1" /> ডিভাইস</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Device Users</TabsTrigger>
        </TabsList>

        <TabsContent value="devices">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><Server className="h-5 w-5" /> সংযুক্ত ডিভাইসের তালিকা</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>নাম</TableHead><TableHead>Connection</TableHead>
                        <TableHead>Serial</TableHead><TableHead>Location</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead><TableHead>শেষ সিঙ্ক</TableHead>
                        <TableHead>অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(devices || []).length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো ডিভাইস নেই</TableCell></TableRow>
                      )}
                      {(devices || []).map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.name}</TableCell>
                          <TableCell className="text-sm">
                            {d.connection_type === "adms_push" ? (
                              <Badge variant="outline" className="gap-1"><Cloud className="h-3 w-3" /> ADMS Push</Badge>
                            ) : (<span className="font-mono">{d.ip_address}:{d.port}</span>)}
                          </TableCell>
                          <TableCell>{d.serial_number || "—"}</TableCell>
                          <TableCell>{d.location || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={d.status === "active" ? "default" : "secondary"} className="gap-1">
                              {d.status === "active" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                              {d.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{d.last_sync_at ? new Date(d.last_sync_at).toLocaleString("bn-BD") : "কখনো না"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => syncMutation.mutate(d.id)} disabled={syncMutation.isPending}>
                                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`} /> Attendance
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setActiveDeviceId(d.id); pullUsersMutation.mutate(d.id); }} disabled={pullUsersMutation.isPending}>
                                <DownloadCloud className={`h-3.5 w-3.5 mr-1 ${pullUsersMutation.isPending ? "animate-spin" : ""}`} /> Pull Users
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openEdit(d)}>সম্পাদনা</Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm">ডিভাইস:</Label>
            <Select value={selectedDeviceId} onValueChange={setActiveDeviceId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select device" /></SelectTrigger>
              <SelectContent>
                {(devices || []).map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => selectedDeviceId && pullUsersMutation.mutate(selectedDeviceId)} disabled={!selectedDeviceId || pullUsersMutation.isPending}>
              <DownloadCloud className={`h-4 w-4 mr-1 ${pullUsersMutation.isPending ? "animate-spin" : ""}`} /> Device থেকে Pull
            </Button>
          </div>

          {lastPullDebug && (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">শেষ Pull-এর Debug Log {typeof lastPullDebug.device_user_count === "number" ? `(device user count: ${lastPullDebug.device_user_count})` : ""}</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setShowDebug((v) => !v)}>{showDebug ? "Hide" : "Show"}</Button>
              </CardHeader>
              {showDebug && (
                <CardContent>
                  {lastPullDebug.warning && (
                    <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{lastPullDebug.warning}</div>
                  )}
                  <pre className="text-xs bg-muted/40 rounded p-2 overflow-x-auto max-h-64 whitespace-pre-wrap">{(lastPullDebug.log || []).join("\n") || "(empty)"}</pre>
                </CardContent>
              )}
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Device Users list */}
            <Card>
              <CardHeader className="pb-3 space-y-2">
                <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Device-এর Users ({filteredDeviceUsers.length}/{deviceUsers?.length || 0})</CardTitle>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-8 pl-8 pr-8 text-xs"
                    placeholder="Code / নাম / কার্ড / mapped employee সার্চ..."
                    value={duSearch}
                    onChange={(e) => setDuSearch(e.target.value)}
                  />
                  {duSearch && (
                    <button onClick={() => setDuSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead><TableHead>Name</TableHead>
                        <TableHead>Card</TableHead><TableHead>Mapped Employee</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeviceUsers.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">{(deviceUsers || []).length === 0 ? `কোনো user নেই — "Pull Users" করুন` : "সার্চে কোনো match নেই"}</TableCell></TableRow>
                      )}
                      {filteredDeviceUsers.map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-mono text-sm">{u.device_user_id}</TableCell>
                          <TableCell className="text-sm">{u.name || "—"}</TableCell>
                          <TableCell className="text-sm">{u.card_no || "—"}</TableCell>
                          <TableCell>
                            {u.employee ? (
                              <div className="flex items-center gap-1">
                                <Badge variant="default" className="gap-1"><Link2 className="h-3 w-3" />{u.employee.name}</Badge>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  title="Unlink"
                                  onClick={() => {
                                    if (confirm(`"${u.employee.name}" থেকে এই device user (${u.device_user_id}) unlink করবেন?`)) {
                                      unlinkMutation.mutate({ deviceUserRowId: u.id, employeeId: u.employee.id });
                                    }
                                  }}
                                  disabled={unlinkMutation.isPending}
                                >
                                  <Unlink2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <EmployeeMapPicker
                                  employees={employees || []}
                                  onSelect={(empId) => mapMutation.mutate({ deviceUserRowId: u.id, employeeId: empId, deviceUserId: u.device_user_id })}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-xs"
                                  title="এই device user থেকে নতুন Employee তৈরি করুন"
                                  onClick={() => {
                                    const params = new URLSearchParams({
                                      from_device_user: u.id,
                                      device_user_id: u.device_user_id || "",
                                      device_id: u.device_id || "",
                                      name: u.name || "",
                                      card: u.card_no || "",
                                    });
                                    navigate(`/dashboard/hr/employees/add?${params.toString()}`);
                                  }}
                                >
                                  <UserPlus className="h-3.5 w-3.5" /> Employee বানাও
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Push employees */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><UploadCloud className="h-4 w-4" /> Employee → Device-এ Push</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">যেসব employee এখনো device-এ নেই তাদের select করে Push করুন। তারপর machine-এ গিয়ে fingerprint/card enroll করবেন।</p>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-8 pl-8 pr-8 text-xs"
                    placeholder="নাম / employee code সার্চ..."
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                  />
                  {empSearch && (
                    <button onClick={() => setEmpSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="border rounded max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Employee</TableHead><TableHead>Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUnmapped.length === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">{unmappedEmployees.length === 0 ? "সব employee already device-এ আছে" : "সার্চে কোনো match নেই"}</TableCell></TableRow>
                      )}
                      {filteredUnmapped.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell><Checkbox checked={selectedEmpIds.includes(e.id)} onCheckedChange={() => toggleEmp(e.id)} /></TableCell>
                          <TableCell className="text-sm">{e.name}</TableCell>
                          <TableCell className="text-xs font-mono">{e.employee_id || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={!selectedDeviceId || selectedEmpIds.length === 0 || pushEmployeesMutation.isPending}
                    onClick={() => pushEmployeesMutation.mutate({ deviceId: selectedDeviceId, employeeIds: selectedEmpIds, action: "push" })}
                  >
                    <UploadCloud className={`h-4 w-4 mr-1 ${pushEmployeesMutation.isPending ? "animate-spin" : ""}`} />
                    {selectedEmpIds.length} জনকে Push করুন
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmployeeMapPicker({ employees, onSelect }: { employees: any[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs w-full justify-start font-normal">
          <Search className="h-3 w-3 mr-1 opacity-60" /> Map to employee...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-72" align="start">
        <Command>
          <CommandInput placeholder="নাম / code সার্চ..." className="h-9" />
          <CommandList>
            <CommandEmpty>কোনো employee নেই</CommandEmpty>
            <CommandGroup>
              {employees.map((e: any) => (
                <CommandItem
                  key={e.id}
                  value={`${e.name} ${e.employee_id || ""}`}
                  onSelect={() => { onSelect(e.id); setOpen(false); }}
                >
                  <span className="text-sm">{e.name}</span>
                  {e.employee_id && <span className="ml-2 text-xs text-muted-foreground font-mono">({e.employee_id})</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
