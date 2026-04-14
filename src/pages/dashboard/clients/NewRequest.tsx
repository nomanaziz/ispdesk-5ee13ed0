import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, MapPin } from "lucide-react";
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

export default function NewRequest() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...defaultForm });
  const [editId, setEditId] = useState<string | null>(null);
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterSetupStatus, setFilterSetupStatus] = useState("all");

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

  const filteredSubZones = useMemo(() =>
    form.zone_id ? subZones?.filter(s => s.zone_id === form.zone_id) : subZones,
    [form.zone_id, subZones]
  );

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload: any = {
        name: values.name,
        contact: values.contact,
        email: values.email,
        address: values.address,
        zone_id: values.zone_id || null,
        subzone_id: values.subzone_id || null,
        customer_type: values.customer_type || null,
        connection_type_id: values.connection_type_id || null,
        package_id: values.package_id || null,
        monthly_bill: values.monthly_bill || 0,
        billing_date: values.billing_date || 1,
        otc_charge: values.otc_charge || 0,
        notes: values.notes || null,
        schedule_date: values.schedule_date || null,
      };
      if (editId) {
        const { error } = await supabase.from("client_requests").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_requests").insert(payload);
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

  const closeDialog = () => {
    setDialogOpen(false);
    setStep(0);
    setForm({ ...defaultForm });
    setEditId(null);
  };

  const openEdit = (item: any) => {
    setForm({
      name: item.name || "",
      contact: item.contact || "",
      email: item.email || "",
      address: item.address || "",
      zone_id: item.zone_id || "",
      subzone_id: item.subzone_id || "",
      customer_type: item.customer_type || "",
      connection_type_id: item.connection_type_id || "",
      package_id: item.package_id || "",
      monthly_bill: item.monthly_bill || 0,
      billing_date: item.billing_date || 1,
      otc_charge: item.otc_charge || 0,
      notes: item.notes || "",
      schedule_date: item.schedule_date || "",
      gender: "", father_name: "", nid_number: "",
    });
    setEditId(item.id);
    setDialogOpen(true);
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
              <TableHead className="text-xs">Cus.Type</TableHead>
              <TableHead className="text-xs">Conn.Type</TableHead>
              <TableHead className="text-xs">প্যাকেজ</TableHead>
              <TableHead className="text-xs">M.Bill</TableHead>
              <TableHead className="text-xs">B.Date</TableHead>
              <TableHead className="text-xs">OTC</TableHead>
              <TableHead className="text-xs">Phy.Conn</TableHead>
              <TableHead className="text-xs">Schedule</TableHead>
              <TableHead className="text-xs">Created On</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Duration</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={18} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={18} className="text-center py-8">কোনো রিকোয়েস্ট পাওয়া যায়নি</TableCell></TableRow>
            ) : (
              filtered.map((r: any, i: number) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{i + 1}</TableCell>
                  <TableCell className="text-xs font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs">{r.contact}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{r.address}</TableCell>
                  <TableCell className="text-xs">{r.zones?.name || "-"}</TableCell>
                  <TableCell className="text-xs">{r.sub_zones?.name || "-"}</TableCell>
                  <TableCell className="text-xs">{r.customer_type || "-"}</TableCell>
                  <TableCell className="text-xs">{r.connection_types_config?.name || r.connection_type || "-"}</TableCell>
                  <TableCell className="text-xs">{r.isp_packages?.name || "-"}</TableCell>
                  <TableCell className="text-xs">{r.monthly_bill || "-"}</TableCell>
                  <TableCell className="text-xs">{r.billing_date || "-"}</TableCell>
                  <TableCell className="text-xs">
                    {r.otc_charge === 0 ? <Badge className="bg-green-500 text-white text-[10px]">Free</Badge> : `৳${r.otc_charge}`}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={r.physical_connectivity === "Completed" ? "default" : "secondary"} className="text-[10px]">
                      {r.physical_connectivity || "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{r.schedule_date || "-"}</TableCell>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("bn-BD")}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={r.setup_status === "Completed" ? "default" : "outline"} className={`text-[10px] ${r.setup_status === "Pending" ? "border-orange-400 text-orange-600" : ""}`}>
                      {r.setup_status || "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{getDuration(r.created_at)}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}><Edit className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Multi-step Dialog */}
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

          {/* Step 1: Personal */}
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

          {/* Step 2: Contact */}
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

          {/* Step 3: Network & Product */}
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

          {/* Step 4: Service */}
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

          {/* Navigation */}
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
    </div>
  );
}
