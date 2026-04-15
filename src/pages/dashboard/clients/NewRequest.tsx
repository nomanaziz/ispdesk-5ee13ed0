import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Edit, Trash2, MoreVertical, Phone, UserPlus, CheckCircle, ArrowRightCircle } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STEPS = ["ব্যক্তিগত তথ্য", "যোগাযোগ তথ্য", "নেটওয়ার্ক ও পণ্য তথ্য", "সেবা তথ্য"];

const defaultForm = {
  name: "", contact: "", email: "", address: "", zone_id: "", subzone_id: "",
  customer_type: "", connection_type_id: "", package_id: "", monthly_bill: 0,
  billing_date: 1, otc_charge: 0, notes: "", schedule_date: "",
  gender: "", father_name: "", nid_number: "",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  Pending: { label: "Pending", className: "border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950" },
  Contacted: { label: "Contacted", className: "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950" },
  Processing: { label: "Processing", className: "border-purple-400 text-purple-600 bg-purple-50 dark:bg-purple-950" },
  Completed: { label: "Completed", className: "border-green-400 text-green-600 bg-green-50 dark:bg-green-950" },
};

const PHY_CONFIG: Record<string, { label: string; className: string }> = {
  Pending: { label: "Pending", className: "border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950" },
  "In Progress": { label: "In Progress", className: "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950" },
  Done: { label: "Done", className: "border-green-400 text-green-600 bg-green-50 dark:bg-green-950" },
};

export default function NewRequest() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...defaultForm });
  const [editId, setEditId] = useState<string | null>(null);
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterSetupStatus, setFilterSetupStatus] = useState("all");

  // Assign employee dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignRequestId, setAssignRequestId] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["client-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_requests")
        .select("*, zones:zone_id(name), sub_zones:subzone_id(name), isp_packages:package_id(name, price, bandwidth_down), connection_types_config:connection_type_id(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["client-request-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_request_assignments")
        .select("*, employees:employee_id(id, name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: zones } = useQuery({
    queryKey: ["zones-active"],
    queryFn: async () => {
      const { data } = await supabase.from("zones").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const { data: subZones } = useQuery({
    queryKey: ["sub-zones-active"],
    queryFn: async () => {
      const { data } = await supabase.from("sub_zones").select("id, name, zone_id").eq("status", "active");
      return data || [];
    },
  });

  const { data: packages } = useQuery({
    queryKey: ["isp-packages-active"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("id, name, price, bandwidth_down").eq("status", "active");
      return data || [];
    },
  });

  const { data: connectionTypes } = useQuery({
    queryKey: ["connection-types-active"],
    queryFn: async () => {
      const { data } = await supabase.from("connection_types_config").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const filteredSubZones = useMemo(() =>
    form.zone_id ? subZones?.filter(s => s.zone_id === form.zone_id) : subZones,
    [form.zone_id, subZones]
  );

  const getAssignedEmployees = (requestId: string) => {
    return assignments?.filter(a => a.request_id === requestId) || [];
  };

  // --- Mutations ---
  const upsertMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload: any = {
        name: values.name, contact: values.contact, email: values.email,
        address: values.address, zone_id: values.zone_id || null,
        subzone_id: values.subzone_id || null, customer_type: values.customer_type || null,
        connection_type_id: values.connection_type_id || null, package_id: values.package_id || null,
        monthly_bill: values.monthly_bill || 0, billing_date: values.billing_date || 1,
        otc_charge: values.otc_charge || 0, notes: values.notes || null,
        schedule_date: values.schedule_date || null,
      };
      if (editId) {
        const { error } = await supabase.from("client_requests").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_requests").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-requests"] });
      toast.success(editId ? "রিকোয়েস্ট আপডেট হয়েছে" : "নতুন রিকোয়েস্ট যোগ হয়েছে");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-requests"] });
      toast.success("রিকোয়েস্ট মুছে ফেলা হয়েছে");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("client_requests").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-requests"] });
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ requestId, employeeIds }: { requestId: string; employeeIds: string[] }) => {
      // Delete existing assignments first
      await supabase.from("client_request_assignments").delete().eq("request_id", requestId);
      // Insert new
      if (employeeIds.length > 0) {
        const rows = employeeIds.map(eid => ({ request_id: requestId, employee_id: eid }));
        const { error } = await supabase.from("client_request_assignments").insert(rows);
        if (error) throw error;
      }
      // Update status to Processing and phy to In Progress
      const { error: upErr } = await supabase.from("client_requests")
        .update({ setup_status: "Processing", physical_connectivity: "In Progress" })
        .eq("id", requestId);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-requests"] });
      queryClient.invalidateQueries({ queryKey: ["client-request-assignments"] });
      toast.success("কর্মী অ্যাসাইন হয়েছে");
      setAssignDialogOpen(false);
      setAssignRequestId(null);
      setSelectedEmployees([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // --- Handlers ---
  const closeDialog = () => {
    setDialogOpen(false);
    setStep(0);
    setForm({ ...defaultForm });
    setEditId(null);
  };

  const openEdit = (item: any) => {
    setForm({
      name: item.name || "", contact: item.contact || "", email: item.email || "",
      address: item.address || "", zone_id: item.zone_id || "", subzone_id: item.subzone_id || "",
      customer_type: item.customer_type || "", connection_type_id: item.connection_type_id || "",
      package_id: item.package_id || "", monthly_bill: item.monthly_bill || 0,
      billing_date: item.billing_date || 1, otc_charge: item.otc_charge || 0,
      notes: item.notes || "", schedule_date: item.schedule_date || "",
      gender: "", father_name: "", nid_number: "",
    });
    setEditId(item.id);
    setDialogOpen(true);
  };

  const handleContact = (id: string) => {
    updateStatusMutation.mutate({ id, updates: { setup_status: "Contacted" } });
  };

  const handlePhyDone = (id: string) => {
    updateStatusMutation.mutate({ id, updates: { physical_connectivity: "Done" } });
  };

  const handleConvertToClient = async (r: any) => {
    // Mark as completed
    await supabase.from("client_requests").update({ setup_status: "Completed" }).eq("id", r.id);
    queryClient.invalidateQueries({ queryKey: ["client-requests"] });
    // Navigate to AddClient with prefilled data
    navigate("/dashboard/clients/add", {
      state: {
        prefill: {
          name: r.name, contact: r.contact, email: r.email, address: r.address,
          zone_id: r.zone_id, sub_zone_id: r.subzone_id,
          connection_type: r.connection_types_config?.name || r.connection_type || "",
          package_id: r.package_id, monthly_bill: r.monthly_bill,
          billing_date: r.billing_date, customer_type: r.customer_type || "",
        },
      },
    });
  };

  const openAssignDialog = (requestId: string) => {
    const existing = getAssignedEmployees(requestId).map(a => a.employee_id);
    setSelectedEmployees(existing);
    setAssignRequestId(requestId);
    setAssignDialogOpen(true);
    setEmployeeSearch("");
  };

  const toggleEmployee = (empId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(empId) ? prev.filter(e => e !== empId) : [...prev, empId]
    );
  };

  const getDuration = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${d}d:${h}h:${m}m`;
  };

  const filtered = useMemo(() => {
    let list = requests || [];
    if (filterSetupStatus !== "all") list = list.filter((r: any) => r.setup_status === filterSetupStatus);
    if (filterFromDate) list = list.filter((r: any) => new Date(r.created_at) >= new Date(filterFromDate));
    if (filterToDate) list = list.filter((r: any) => new Date(r.created_at) <= new Date(filterToDate + "T23:59:59"));
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((r: any) =>
        r.name?.toLowerCase().includes(s) || r.contact?.includes(s) || r.address?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [requests, search, filterSetupStatus, filterFromDate, filterToDate]);

  const handleSubmit = () => {
    if (!form.name) { toast.error("নাম আবশ্যক"); return; }
    upsertMutation.mutate(form);
  };

  const setField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees || [];
    const s = employeeSearch.toLowerCase();
    return (employees || []).filter(e => e.name?.toLowerCase().includes(s));
  }, [employees, employeeSearch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Client Request <span className="text-sm font-normal text-muted-foreground">New Client Request</span></h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Client Request</Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 border rounded-lg bg-card">
        <div>
          <Label className="text-xs uppercase">From Date</Label>
          <Input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs uppercase">To Date</Label>
          <Input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs uppercase">Setup Status</Label>
          <Select value={filterSetupStatus} onValueChange={setFilterSetupStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs uppercase">Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="নাম, মোবাইল, ঠিকানা..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/10">
              <TableHead className="text-xs">SN</TableHead>
              <TableHead className="text-xs">নাম</TableHead>
              <TableHead className="text-xs">মোবাইল</TableHead>
              <TableHead className="text-xs">ঠিকানা</TableHead>
              <TableHead className="text-xs">জোন</TableHead>
              <TableHead className="text-xs">সাবজোন</TableHead>
              <TableHead className="text-xs">প্যাকেজ</TableHead>
              <TableHead className="text-xs">M.Bill</TableHead>
              <TableHead className="text-xs">OTC</TableHead>
              <TableHead className="text-xs">Phy.Conn</TableHead>
              <TableHead className="text-xs">Assigned To</TableHead>
              <TableHead className="text-xs">Schedule</TableHead>
              <TableHead className="text-xs">Created On</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Duration</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={16} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={16} className="text-center py-8">কোনো রিকোয়েস্ট পাওয়া যায়নি</TableCell></TableRow>
            ) : (
              filtered.map((r: any, i: number) => {
                const status = r.setup_status || "Pending";
                const phyStatus = r.physical_connectivity || "Pending";
                const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
                const phyCfg = PHY_CONFIG[phyStatus] || PHY_CONFIG.Pending;
                const assigned = getAssignedEmployees(r.id);

                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{i + 1}</TableCell>
                    <TableCell className="text-xs font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs">{r.contact}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{r.address}</TableCell>
                    <TableCell className="text-xs">{r.zones?.name || "-"}</TableCell>
                    <TableCell className="text-xs">{r.sub_zones?.name || "-"}</TableCell>
                    <TableCell className="text-xs">{r.isp_packages?.name || "-"}</TableCell>
                    <TableCell className="text-xs">{r.monthly_bill || "-"}</TableCell>
                    <TableCell className="text-xs">
                      {r.otc_charge === 0 ? <Badge className="bg-green-500 text-white text-[10px]">Free</Badge> : `৳${r.otc_charge}`}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className={`text-[10px] ${phyCfg.className}`}>{phyCfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {assigned.length > 0
                        ? assigned.map(a => (a as any).employees?.name).filter(Boolean).join(", ")
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-xs">{r.schedule_date || "-"}</TableCell>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("bn-BD")}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className={`text-[10px] ${statusCfg.className}`}>{statusCfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{getDuration(r.created_at)}</TableCell>
                    <TableCell className="text-xs">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* Contact actions — only when Pending */}
                          {status === "Pending" && (
                            <>
                              <DropdownMenuItem onClick={() => handleContact(r.id)}>
                                <Phone className="h-3.5 w-3.5 mr-2" /> Contact Confirm
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleContact(r.id)}>
                                <Phone className="h-3.5 w-3.5 mr-2" /> Already Contacted
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}

                          {/* Assign — when Contacted or Processing */}
                          {(status === "Contacted" || status === "Processing") && (
                            <>
                              <DropdownMenuItem onClick={() => openAssignDialog(r.id)}>
                                <UserPlus className="h-3.5 w-3.5 mr-2" /> Assign Employee
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}

                          {/* Mark Phy Done — when Processing */}
                          {status === "Processing" && phyStatus !== "Done" && (
                            <>
                              <DropdownMenuItem onClick={() => handlePhyDone(r.id)}>
                                <CheckCircle className="h-3.5 w-3.5 mr-2" /> Mark Phy. Done
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}

                          {/* Convert to Client — when Phy Done */}
                          {phyStatus === "Done" && status !== "Completed" && (
                            <>
                              <DropdownMenuItem onClick={() => handleConvertToClient(r)}>
                                <ArrowRightCircle className="h-3.5 w-3.5 mr-2" /> Convert to Client
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}

                          {/* Always available */}
                          <DropdownMenuItem onClick={() => openEdit(r)}>
                            <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(r.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Multi-step Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "রিকোয়েস্ট সম্পাদনা" : "নতুন ক্লায়েন্ট রিকোয়েস্ট"}</DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex gap-1 mb-4">
            {STEPS.map((s, idx) => (
              <button key={idx} onClick={() => setStep(idx)}
                className={`flex-1 text-xs py-2 rounded-md transition-colors ${idx === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {idx + 1}. {s}
              </button>
            ))}
          </div>

          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>কাস্টমারের নাম *</Label>
                <Input value={form.name} onChange={e => setField("name", e.target.value)} placeholder="পুরো নাম" />
              </div>
              <div>
                <Label>জেন্ডার</Label>
                <Select value={form.gender} onValueChange={v => setField("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">পুরুষ</SelectItem>
                    <SelectItem value="Female">মহিলা</SelectItem>
                    <SelectItem value="Other">অন্যান্য</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>NID নম্বর</Label>
                <Input value={form.nid_number} onChange={e => setField("nid_number", e.target.value)} placeholder="NID/জন্ম সনদ নম্বর" />
              </div>
              <div>
                <Label>পিতার নাম</Label>
                <Input value={form.father_name} onChange={e => setField("father_name", e.target.value)} />
              </div>
              <div>
                <Label>ইমেইল</Label>
                <Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>মোবাইল নম্বর *</Label>
                <Input value={form.contact} onChange={e => setField("contact", e.target.value)} placeholder="01XXXXXXXXX" />
              </div>
              <div>
                <Label>ইমেইল</Label>
                <Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>ঠিকানা</Label>
                <Textarea value={form.address} onChange={e => setField("address", e.target.value)} placeholder="বিস্তারিত ঠিকানা" />
              </div>
              <div>
                <Label>জোন</Label>
                <Select value={form.zone_id} onValueChange={v => { setField("zone_id", v); setField("subzone_id", ""); }}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {zones?.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>সাবজোন</Label>
                <Select value={form.subzone_id} onValueChange={v => setField("subzone_id", v)}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {filteredSubZones?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>কাস্টমার টাইপ</Label>
                <Select value={form.customer_type} onValueChange={v => setField("customer_type", v)}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Home">Home</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>কানেকশন টাইপ</Label>
                <Select value={form.connection_type_id} onValueChange={v => setField("connection_type_id", v)}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {connectionTypes?.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>প্যাকেজ</Label>
                <Select value={form.package_id} onValueChange={v => {
                  setField("package_id", v);
                  const pkg = packages?.find(p => p.id === v);
                  if (pkg) setField("monthly_bill", pkg.price);
                }}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {packages?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.bandwidth_down}Mbps) - ৳{p.price}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>OTC (কানেকশন চার্জ)</Label>
                <Input type="number" value={form.otc_charge} onChange={e => setField("otc_charge", Number(e.target.value))} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>মাসিক বিল (৳)</Label>
                <Input type="number" value={form.monthly_bill} onChange={e => setField("monthly_bill", Number(e.target.value))} />
              </div>
              <div>
                <Label>বিলিং তারিখ</Label>
                <Input type="number" min={1} max={28} value={form.billing_date} onChange={e => setField("billing_date", Number(e.target.value))} />
              </div>
              <div>
                <Label>শিডিউল তারিখ</Label>
                <Input type="date" value={form.schedule_date} onChange={e => setField("schedule_date", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>নোট</Label>
                <Textarea value={form.notes} onChange={e => setField("notes", e.target.value)} placeholder="অতিরিক্ত তথ্য..." />
              </div>
            </div>
          )}

          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : closeDialog()}>
              {step > 0 ? "পূর্ববর্তী" : "বাতিল"}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>পরবর্তী</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? "সেভ হচ্ছে..." : editId ? "আপডেট" : "সেভ করুন"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Employee Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={v => { if (!v) { setAssignDialogOpen(false); setAssignRequestId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>কর্মী অ্যাসাইন করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="কর্মী খুঁজুন..."
              value={employeeSearch}
              onChange={e => setEmployeeSearch(e.target.value)}
            />
            <div className="max-h-60 overflow-y-auto space-y-1 border rounded-md p-2">
              {filteredEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">কোনো কর্মী পাওয়া যায়নি</p>
              ) : (
                filteredEmployees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={selectedEmployees.includes(emp.id)}
                      onCheckedChange={() => toggleEmployee(emp.id)}
                    />
                    <span className="text-sm">{emp.name}</span>
                  </label>
                ))
              )}
            </div>
            {selectedEmployees.length > 0 && (
              <p className="text-xs text-muted-foreground">{selectedEmployees.length} জন নির্বাচিত</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>বাতিল</Button>
              <Button
                onClick={() => assignRequestId && assignMutation.mutate({ requestId: assignRequestId, employeeIds: selectedEmployees })}
                disabled={selectedEmployees.length === 0 || assignMutation.isPending}
              >
                {assignMutation.isPending ? "সেভ হচ্ছে..." : "অ্যাসাইন করুন"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
