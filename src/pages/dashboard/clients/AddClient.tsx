import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { Save, ArrowLeft } from "lucide-react";

export default function AddClient() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;
  const requestId = location.state?.request_id;
  const editMode = location.state?.editMode === true;
  const editClientId = prefill?.id;
  const [form, setForm] = useState<Record<string, any>>({
    name: "", gender: "", father_name: "", mother_name: "", nid_number: "",
    date_of_birth: "", occupation: "", remarks: "",
    latitude: "", longitude: "", contact: "", phone_number: "", email: "",
    address: "", permanent_address: "", road_number: "", house_number: "",
    mikrotik_id: "", protocol_type: "PPPoE", zone_id: "", sub_zone_id: "", box_id: "",
    connection_type: "", cable_length: "", fiber_code: "", core_count: "",
    core_color: "", device_type: "", device_serial: "", vendor: "", purchase_date: "",
    client_id: "", package_id: "", profile: "", client_type: "Home", billing_status: "Active",
    username: "", remote_address: "", password: "", joining_date: format(new Date(), "yyyy-MM-dd"),
    monthly_bill: 0, billing_start_month: "", expire_date: "",
    reference_by: "", is_vip: false, connected_by: "", affiliator_id: "",
    same_address: false,
  });

  const [mikrotikProfiles, setMikrotikProfiles] = useState<{ name: string; rateLimit?: string }[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const setField = (key: string, value: any) => setForm(prev => {
    const next = { ...prev, [key]: value };
    if (key === "same_address" && value) next.permanent_address = prev.address;
    return next;
  });

  // Prefill from NewRequest convert or MikroTik import
  useEffect(() => {
    if (prefill) {
      setForm(prev => ({
        ...prev,
        name: prefill.name || prev.name,
        contact: prefill.contact || prev.contact,
        email: prefill.email || prev.email,
        address: prefill.address || prev.address,
        zone_id: prefill.zone_id || prev.zone_id,
        sub_zone_id: prefill.sub_zone_id || prev.sub_zone_id,
        connection_type: prefill.connection_type || prev.connection_type,
        package_id: prefill.package_id || prev.package_id,
        monthly_bill: prefill.monthly_bill || prev.monthly_bill,
        client_type: prefill.customer_type || prev.client_type,
        // MikroTik fields
        username: prefill.username || prev.username,
        password: prefill.password || prev.password,
        profile: prefill.profile || prev.profile,
        mikrotik_id: prefill.mikrotik_id || prev.mikrotik_id,
        remote_address: prefill.remote_address || prev.remote_address,
        server_name: prefill.server_name || prev.server_name,
        mac_address: prefill.mac_address || prev.mac_address,
        client_id: prefill.client_id || prev.client_id,
      }));

      // Auto-fetch MikroTik profiles if mikrotik_id is prefilled
      if (prefill.mikrotik_id) {
        setLoadingProfiles(true);
        supabase.functions.invoke("fetch-mikrotik-profiles", { body: { device_id: prefill.mikrotik_id } })
          .then(({ data }) => {
            if (data?.profiles) setMikrotikProfiles(data.profiles);
            else setMikrotikProfiles([]);
          })
          .catch(() => setMikrotikProfiles([]))
          .finally(() => setLoadingProfiles(false));
      }
    }
  }, []);

  const { data: zones } = useQuery({ queryKey: ["zones-active"], queryFn: async () => { const { data } = await supabase.from("zones").select("id, name").eq("status", "active"); return data || []; } });
  const { data: subZones } = useQuery({ queryKey: ["sub-zones-active"], queryFn: async () => { const { data } = await supabase.from("sub_zones").select("id, name, zone_id").eq("status", "active"); return data || []; } });
  const { data: boxes } = useQuery({ queryKey: ["boxes-active"], queryFn: async () => { const { data } = await supabase.from("boxes").select("id, name, zone_id").eq("status", "active"); return data || []; } });
  const { data: packages } = useQuery({ queryKey: ["isp-packages-active"], queryFn: async () => { const { data } = await supabase.from("isp_packages").select("id, name, price, bandwidth_down").eq("status", "active"); return data || []; } });
  const { data: connectionTypes } = useQuery({ queryKey: ["connection-types-active"], queryFn: async () => { const { data } = await supabase.from("connection_types_config").select("id, name").eq("status", "active"); return data || []; } });
  const { data: clientTypes } = useQuery({ queryKey: ["client-types-active"], queryFn: async () => { const { data } = await supabase.from("client_types").select("id, name").eq("status", "active"); return data || []; } });
  const { data: mikrotiks } = useQuery({ queryKey: ["mikrotik-devices"], queryFn: async () => { const { data } = await supabase.from("mikrotik_devices").select("id, name"); return data || []; } });
  const { data: protocolTypes } = useQuery({ queryKey: ["protocol-types-active"], queryFn: async () => { const { data } = await supabase.from("protocol_types" as any).select("id, name").eq("status", "active"); return data || []; } });
  const { data: affiliates } = useQuery({ queryKey: ["affiliates-active"], queryFn: async () => { const { data } = await supabase.from("affiliates").select("id, name").eq("status", "active"); return data || []; } });
  const { data: billingStatuses } = useQuery({ queryKey: ["billing-statuses"], queryFn: async () => { const { data } = await supabase.from("billing_statuses").select("id, name").eq("status", "active"); return data || []; } });

  const filteredSubZones = useMemo(() => form.zone_id ? subZones?.filter((s: any) => s.zone_id === form.zone_id) : subZones, [form.zone_id, subZones]);
  const filteredBoxes = useMemo(() => form.zone_id ? boxes?.filter((b: any) => b.zone_id === form.zone_id) : boxes, [form.zone_id, boxes]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.client_id) throw new Error("নাম ও ক্লায়েন্ট কোড আবশ্যক");
      const payload: any = {
        name: form.name, client_id: form.client_id, contact: form.contact, email: form.email,
        address: form.address, zone_id: form.zone_id || null, sub_zone_id: form.sub_zone_id || null,
        connection_type: form.connection_type || null, client_type: form.client_type || null,
        package_id: form.package_id || null, monthly_bill: form.monthly_bill || 0,
        mikrotik_id: form.mikrotik_id || null, username: form.username || null,
        password: form.password || null, remote_address: form.remote_address || null,
        mac_address: form.mac_address || null, protocol_type: form.protocol_type || null,
        profile: form.profile || null, billing_status: form.billing_status || "Active",
        server_name: form.server_name || null, gender: form.gender || null,
        father_name: form.father_name || null, mother_name: form.mother_name || null,
        nid_number: form.nid_number || null, date_of_birth: form.date_of_birth || null,
        occupation: form.occupation || null, remarks: form.remarks || null,
        phone_number: form.phone_number || null, latitude: form.latitude || null,
        longitude: form.longitude || null, road_number: form.road_number || null,
        house_number: form.house_number || null, permanent_address: form.permanent_address || null,
        box_id: form.box_id || null, cable_length: form.cable_length ? Number(form.cable_length) : null,
        fiber_code: form.fiber_code || null, core_count: form.core_count ? Number(form.core_count) : null,
        core_color: form.core_color || null, device_type: form.device_type || null,
        device_serial: form.device_serial || null, vendor: form.vendor || null,
        purchase_date: form.purchase_date || null, expire_date: form.expire_date || null,
        joining_date: form.joining_date || null, billing_start_month: form.billing_start_month || null,
        reference_by: form.reference_by || null, is_vip: form.is_vip || false,
        connected_by: form.connected_by || null, affiliator_id: form.affiliator_id || null,
      };
      if (editMode && editClientId) {
        const { error } = await supabase.from("clients").update(payload).eq("id", editClientId);
        if (error) throw error;
      } else {
        const { data: insertedClient, error } = await supabase.from("clients").insert(payload).select("id").single();
        if (error) throw error;

        // Auto-generate billing record for current month
        if (insertedClient?.id) {
          const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
          const billId = `BILL-${form.client_id}-${currentMonth.slice(0, 7)}`;
          await supabase.from("billing").insert({
            bill_id: billId,
            client_id: insertedClient.id,
            month: currentMonth,
            amount: form.monthly_bill || 0,
            due: form.monthly_bill || 0,
            status: "unpaid",
            generated: true,
            branch_id: form.branch_id || null,
          });
        }

        // Create PPPoE user on MikroTik only for new clients (fire-and-forget)
        if (form.mikrotik_id && form.username && form.password) {
          supabase.functions.invoke("create-mikrotik-ppp", {
            body: {
              mikrotik_id: form.mikrotik_id,
              username: form.username,
              password: form.password,
              profile: form.profile || null,
              remote_address: form.remote_address || null,
              disabled: form.billing_status !== "Active",
            },
          }).then(({ data, error: mkErr }) => {
            if (mkErr) {
              console.error("MikroTik PPPoE creation failed:", mkErr);
              toast.error("MikroTik-এ PPPoE user তৈরি ব্যর্থ: " + (mkErr.message || "Unknown error"));
            } else if (data?.error) {
              toast.error("MikroTik-এ PPPoE user তৈরি ব্যর্থ: " + data.error);
            } else {
              toast.success("MikroTik-এ PPPoE user তৈরি হয়েছে");
            }
          }).catch((e: any) => {
            console.error("MikroTik PPPoE error:", e);
            toast.error("MikroTik-এ PPPoE user তৈরি ব্যর্থ: " + e.message);
          });
        }
      }
    },
    onSuccess: async () => {
      // If converted from a request, mark it as completed now
      if (requestId) {
        await supabase.from("client_requests").update({ setup_status: "Completed" } as any).eq("id", requestId);
      }
      toast.success(editMode ? "ক্লায়েন্ট সফলভাবে আপডেট হয়েছে" : "ক্লায়েন্ট সফলভাবে যোগ হয়েছে");
      navigate("/dashboard/clients/list");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-t-lg font-semibold flex items-center gap-2">
      <span>{icon}</span> {title}
      <span className="text-xs font-normal ml-2">Fill Up All Required(*) Field Data</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Client <span className="text-sm font-normal text-muted-foreground">{editMode ? "Edit Client" : "Add New Client"}</span></h1>
      </div>

      {/* Personal Information */}
      <div className="border rounded-lg">
        <SectionHeader icon="👤" title="Personal Information" />
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1 md:row-span-3 flex flex-col items-center gap-2">
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center text-4xl text-muted-foreground">👤</div>
            <span className="text-xs text-muted-foreground">Profile Picture</span>
          </div>
          <div className="md:col-span-2">
            <Label>Customer Name *</Label>
            <Input value={form.name} onChange={e => setField("name", e.target.value)} />
          </div>
          <div>
            <Label>Remarks/Special Note</Label>
            <Textarea value={form.remarks} onChange={e => setField("remarks", e.target.value)} className="h-20" />
          </div>
          <div>
            <Label>Occupation</Label>
            <Select value={form.occupation} onValueChange={v => setField("occupation", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Student">Student</SelectItem>
                <SelectItem value="Private Job Holder">Private Job Holder</SelectItem>
                <SelectItem value="Govt Job Holder">Govt Job Holder</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
                <SelectItem value="Housewife">Housewife</SelectItem>
                <SelectItem value="Teacher">Teacher</SelectItem>
                <SelectItem value="Doctor">Doctor</SelectItem>
                <SelectItem value="Engineer">Engineer</SelectItem>
                <SelectItem value="Farmer">Farmer</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>NID/Birth Certificate No *</Label>
            <Input value={form.nid_number} onChange={e => setField("nid_number", e.target.value)} />
          </div>
          <div>
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={v => setField("gender", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Father Name</Label>
            <Input value={form.father_name} onChange={e => setField("father_name", e.target.value)} />
          </div>
          <div>
            <Label>Date of Birth</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !form.date_of_birth && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.date_of_birth ? format(new Date(form.date_of_birth), "PPP") : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.date_of_birth ? new Date(form.date_of_birth) : undefined}
                  onSelect={(date) => setField("date_of_birth", date ? format(date, "yyyy-MM-dd") : "")}
                  defaultMonth={new Date(2000, 0)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Mother Name</Label>
            <Input value={form.mother_name} onChange={e => setField("mother_name", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="border rounded-lg">
        <SectionHeader icon="📍" title="Contact Information" />
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Map Latitude</Label>
            <Input value={form.latitude} onChange={e => setField("latitude", e.target.value)} />
          </div>
          <div>
            <Label>Mobile Number *</Label>
            <Input value={form.contact} onChange={e => setField("contact", e.target.value)} />
          </div>
          <div>
            <Label>District</Label>
            <Input disabled placeholder="From Zone" />
          </div>
          <div className="md:row-span-2">
            <Label>Present Address</Label>
            <Textarea value={form.address} onChange={e => setField("address", e.target.value)} className="h-full min-h-[80px]" />
          </div>
          <div>
            <Label>Map Longitude</Label>
            <Input value={form.longitude} onChange={e => setField("longitude", e.target.value)} />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input value={form.phone_number} onChange={e => setField("phone_number", e.target.value)} />
          </div>
          <div>
            <Label>Upazila/Thana</Label>
            <Input disabled placeholder="From Zone" />
          </div>
          <div>
            <Label>Email Address</Label>
            <Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} />
          </div>
          <div>
            <Label>Road Number</Label>
            <Input value={form.road_number} onChange={e => setField("road_number", e.target.value)} />
          </div>
          <div>
            <Label>House Number</Label>
            <Input value={form.house_number} onChange={e => setField("house_number", e.target.value)} />
          </div>
          <div>
            <Label>Permanent Address</Label>
            <Textarea value={form.permanent_address} onChange={e => setField("permanent_address", e.target.value)} className="h-20" />
            <div className="flex items-center gap-2 mt-1">
              <Checkbox checked={form.same_address} onCheckedChange={v => setField("same_address", v)} id="same-addr" />
              <label htmlFor="same-addr" className="text-xs">Same As Present Address?</label>
            </div>
          </div>
        </div>
      </div>

      {/* Network & Product Information */}
      <div className="border rounded-lg">
        <SectionHeader icon="📡" title="Network & Product Information" />
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Server *</Label>
            <Select value={form.mikrotik_id} onValueChange={v => {
              setField("mikrotik_id", v);
              setField("profile", "");
              // Fetch PPP profiles from this server
              setLoadingProfiles(true);
              supabase.functions.invoke("fetch-mikrotik-profiles", { body: { device_id: v } })
                .then(({ data }) => {
                  if (data?.profiles) setMikrotikProfiles(data.profiles);
                  else setMikrotikProfiles([]);
                })
                .catch(() => setMikrotikProfiles([]))
                .finally(() => setLoadingProfiles(false));
            }}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {mikrotiks?.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Protocol Type *</Label>
            <Select value={form.protocol_type} onValueChange={v => setField("protocol_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {(protocolTypes as any[])?.map((p: any) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Zone *</Label>
            <Select value={form.zone_id} onValueChange={v => { setField("zone_id", v); setField("sub_zone_id", ""); setField("box_id", ""); }}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {zones?.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sub Zone</Label>
            <Select value={form.sub_zone_id} onValueChange={v => setField("sub_zone_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {filteredSubZones?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Box</Label>
            <Select value={form.box_id} onValueChange={v => setField("box_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {filteredBoxes?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Connection Type *</Label>
            <Select value={form.connection_type} onValueChange={v => setField("connection_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {connectionTypes?.map(ct => <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cable Requirement (Metre)</Label>
            <Input type="number" value={form.cable_length} onChange={e => setField("cable_length", e.target.value)} placeholder="Example: 100" />
          </div>
          <div>
            <Label>Fiber Code</Label>
            <Input value={form.fiber_code} onChange={e => setField("fiber_code", e.target.value)} placeholder="Example: 121" />
          </div>
          <div>
            <Label>Number of Core</Label>
            <Input type="number" value={form.core_count} onChange={e => setField("core_count", e.target.value)} placeholder="Example: 2" />
          </div>
          <div>
            <Label>Core Color</Label>
            <Input value={form.core_color} onChange={e => setField("core_color", e.target.value)} placeholder="Example: Red" />
          </div>
          <div>
            <Label>Device</Label>
            <Select value={form.device_type} onValueChange={v => setField("device_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ONU">ONU</SelectItem>
                <SelectItem value="Router">Router</SelectItem>
                <SelectItem value="Switch">Switch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Device MAC/Serial No</Label>
            <Input value={form.device_serial} onChange={e => setField("device_serial", e.target.value)} />
          </div>
          <div>
            <Label>Vendor</Label>
            <Select value={form.vendor} onValueChange={v => setField("vendor", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Huawei">Huawei</SelectItem>
                <SelectItem value="BDCOM">BDCOM</SelectItem>
                <SelectItem value="VSOL">VSOL</SelectItem>
                <SelectItem value="Syrotech">Syrotech</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Purchase Date</Label>
            <Input type="date" value={form.purchase_date} onChange={e => setField("purchase_date", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Service Information */}
      <div className="border rounded-lg">
        <SectionHeader icon="🔒" title="Service Information" />
        <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Label>Client Code *</Label>
            <Input value={form.client_id} onChange={e => setField("client_id", e.target.value)} />
          </div>
          <div>
            <Label>Package *</Label>
            <Select value={form.package_id} onValueChange={v => {
              setField("package_id", v);
              const pkg = packages?.find(p => p.id === v);
              if (pkg) setField("monthly_bill", pkg.price);
            }}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {packages?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - ৳{p.price}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Profile</Label>
            <Select value={form.profile} onValueChange={v => setField("profile", v)} disabled={loadingProfiles}>
              <SelectTrigger><SelectValue placeholder={loadingProfiles ? "Loading..." : mikrotikProfiles.length > 0 ? "Select Profile" : "Select Server First"} /></SelectTrigger>
              <SelectContent>
                {mikrotikProfiles.map(p => (
                  <SelectItem key={p.name} value={p.name}>{p.name}{p.rateLimit ? ` (${p.rateLimit})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Client Type *</Label>
            <Select value={form.client_type} onValueChange={v => setField("client_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {clientTypes?.map((ct: any) => <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Billing Status *</Label>
            <Select value={form.billing_status} onValueChange={v => setField("billing_status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {billingStatuses?.map((bs: any) => <SelectItem key={bs.id} value={bs.name}>{bs.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Username/IP *</Label>
            <Input value={form.username} onChange={e => setField("username", e.target.value)} />
          </div>
          <div>
            <Label>Remote Address</Label>
            <Input value={form.remote_address} onChange={e => setField("remote_address", e.target.value)} />
          </div>
          <div>
            <Label>Password *</Label>
            <Input value={form.password} onChange={e => setField("password", e.target.value)} />
          </div>
          <div>
            <Label>Joining Date *</Label>
            <Input type="date" value={form.joining_date} onChange={e => setField("joining_date", e.target.value)} />
          </div>
          <div>
            <Label>Monthly Bill *</Label>
            <Input type="number" value={form.monthly_bill} onChange={e => setField("monthly_bill", Number(e.target.value))} />
          </div>
          <div>
            <Label>Billing Start Month *</Label>
            <Input type="month" value={form.billing_start_month} onChange={e => setField("billing_start_month", e.target.value)} />
          </div>
          <div>
            <Label>Expire Date *</Label>
            <Input type="date" value={form.expire_date} onChange={e => setField("expire_date", e.target.value)} />
          </div>
          <div>
            <Label>Reference By</Label>
            <Input value={form.reference_by} onChange={e => setField("reference_by", e.target.value)} />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Label>Is VIP Client?</Label>
            <Switch checked={form.is_vip} onCheckedChange={v => setField("is_vip", v)} />
          </div>
          <div>
            <Label>Connected By</Label>
            <Input value={form.connected_by} onChange={e => setField("connected_by", e.target.value)} />
          </div>
          <div>
            <Label>Affiliator</Label>
            <Select value={form.affiliator_id} onValueChange={v => setField("affiliator_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {affiliates?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center py-4">
        <Button variant="outline" onClick={() => navigate("/dashboard/clients/list")}><ArrowLeft className="h-4 w-4 mr-1" /> Go To List</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? "সেভ হচ্ছে..." : "Save & Exit"}
        </Button>
      </div>
    </div>
  );
}
