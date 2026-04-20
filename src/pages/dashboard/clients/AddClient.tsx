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
import { Save, ArrowLeft, AlertTriangle } from "lucide-react";
import { usePopScope } from "@/hooks/usePopScope";

export default function AddClient() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPopMode, branchId, tariffId, popName, districtId, upazilaId } = usePopScope();
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
    monthly_bill: 0, billing_start_month: format(new Date(), "yyyy-MM"), expire_day: "10",
    reference_by: "", is_vip: false, connected_by: "", installed_by_ids: [] as string[],
    same_address: false,
  });

  const [mikrotikProfiles, setMikrotikProfiles] = useState<{ name: string; rateLimit?: string }[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [clientCodeError, setClientCodeError] = useState<string>("");

  // Compute full expire_date from selected day-of-month (1-31). Uses current month;
  // if today is past that day, rolls to next month. Clamps to last day if month-এ দিন কম.
  const computeExpireDate = (day: string | number | null | undefined): string | null => {
    const d = Number(day);
    if (!d || d < 1 || d > 31) return null;
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    if (now.getDate() > d) {
      month += 1;
      if (month > 11) { month = 0; year += 1; }
    }
    const lastDay = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.min(d, lastDay);
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(safeDay).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

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
        username: prefill.username || prev.username,
        password: prefill.password || prev.password,
        profile: prefill.profile || prev.profile,
        mikrotik_id: prefill.mikrotik_id || prev.mikrotik_id,
        remote_address: prefill.remote_address || prev.remote_address,
        server_name: prefill.server_name || prev.server_name,
        mac_address: prefill.mac_address || prev.mac_address,
        client_id: prefill.client_id || prev.client_id,
        expire_day: prefill.expire_date ? String(new Date(prefill.expire_date).getDate()) : (prev.expire_day || "10"),
        installed_by_ids: prefill.installed_by_ids || prev.installed_by_ids,
        billing_start_month: prefill.billing_start_month || prev.billing_start_month,
      }));

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

    // If we came from a request, try to auto-fill assigned technicians
    if (requestId) {
      supabase
        .from("client_requests" as any)
        .select("assigned_to, assigned_employee_ids")
        .eq("id", requestId)
        .maybeSingle()
        .then(({ data }: any) => {
          if (!data) return;
          const ids: string[] = Array.isArray(data.assigned_employee_ids)
            ? data.assigned_employee_ids
            : (data.assigned_to ? [data.assigned_to] : []);
          if (ids.length > 0) {
            setForm(prev => ({ ...prev, installed_by_ids: ids }));
          }
        });
    }
  }, []);

  const { data: zones } = useQuery({
    queryKey: ["zones-active", branchId || "all"],
    queryFn: async () => {
      let q: any = supabase.from("zones").select("id, name").eq("status", "active");
      if (isPopMode && branchId) q = q.eq("branch_id", branchId);
      const { data } = await q;
      return data || [];
    },
  });
  const { data: subZones } = useQuery({
    queryKey: ["sub-zones-active", branchId || "all"],
    queryFn: async () => {
      let q: any = supabase.from("sub_zones").select("id, name, zone_id").eq("status", "active");
      if (isPopMode && branchId) q = q.eq("branch_id", branchId);
      const { data } = await q;
      return data || [];
    },
  });
  const { data: boxes } = useQuery({
    queryKey: ["boxes-active", branchId || "all"],
    queryFn: async () => {
      let q: any = supabase.from("boxes").select("id, name, zone_id").eq("status", "active");
      if (isPopMode && branchId) q = q.eq("branch_id", branchId);
      const { data } = await q;
      return data || [];
    },
  });
  // Packages: in POP mode, load from reseller_tariff_packages (admin-allotted only).
  // Otherwise, load global isp_packages as before.
  const { data: packages } = useQuery({
    queryKey: ["client-add-packages", isPopMode ? `tariff:${tariffId || "none"}` : "global"],
    queryFn: async () => {
      if (isPopMode) {
        if (!tariffId) return [];
        const { data } = await supabase
          .from("reseller_tariff_packages")
          .select("id, package_id, selling_rate, package_rate, mikrotik_profile, mikrotik_server_id, isp_packages(id, name, bandwidth_down, price)")
          .eq("tariff_id", tariffId);
        return (data || [])
          .filter((p: any) => p.isp_packages)
          .map((p: any) => ({
            id: p.isp_packages.id,
            name: p.isp_packages.name,
            bandwidth_down: p.isp_packages.bandwidth_down,
            price: Number(p.selling_rate || p.package_rate || p.isp_packages.price || 0),
            mikrotik_profile: p.mikrotik_profile || null,
            mikrotik_server_id: p.mikrotik_server_id || null,
          }));
      }
      const { data } = await supabase
        .from("isp_packages")
        .select("id, name, price, bandwidth_down")
        .eq("status", "active");
      return data || [];
    },
  });

  // POP-mode metadata: branch_manager (server_id, pop_prefix), tariff (mikrotik_server_id), district/upazila names
  const { data: popMeta } = useQuery({
    enabled: isPopMode && !!branchId,
    queryKey: ["pop-meta", branchId, tariffId, districtId, upazilaId],
    queryFn: async () => {
      const [bm, tr, dist, upa] = await Promise.all([
        supabase.from("branch_managers").select("server_id, pop_prefix, pop_code").eq("branch_id", branchId!).maybeSingle(),
        tariffId
          ? supabase.from("reseller_tariffs").select("mikrotik_server_id").eq("id", tariffId).maybeSingle()
          : Promise.resolve({ data: null } as any),
        districtId
          ? supabase.from("districts").select("name").eq("id", districtId).maybeSingle()
          : Promise.resolve({ data: null } as any),
        upazilaId
          ? supabase.from("upazilas").select("name").eq("id", upazilaId).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      const defaultServerId =
        (tr as any)?.data?.mikrotik_server_id || (bm as any)?.data?.server_id || null;
      return {
        defaultServerId,
        popPrefix: (bm as any)?.data?.pop_prefix || (bm as any)?.data?.pop_code || "",
        districtName: (dist as any)?.data?.name || "",
        upazilaName: (upa as any)?.data?.name || "",
      };
    },
  });
  const { data: connectionTypes } = useQuery({ queryKey: ["connection-types-active"], queryFn: async () => { const { data } = await supabase.from("connection_types_config").select("id, name").eq("status", "active"); return data || []; } });
  const { data: clientTypes } = useQuery({ queryKey: ["client-types-active"], queryFn: async () => { const { data } = await supabase.from("client_types").select("id, name").eq("status", "active"); return data || []; } });
  const { data: mikrotiks } = useQuery({ queryKey: ["mikrotik-devices"], queryFn: async () => { const { data } = await supabase.from("mikrotik_devices").select("id, name"); return data || []; } });
  const { data: protocolTypes } = useQuery({ queryKey: ["protocol-types-active"], queryFn: async () => { const { data } = await supabase.from("protocol_types" as any).select("id, name").eq("status", "active"); return data || []; } });
  const { data: employees } = useQuery({
    queryKey: ["employees-active", branchId || "all"],
    queryFn: async () => {
      let q: any = supabase.from("employees").select("id, name").eq("status", "active");
      if (isPopMode && branchId) q = q.eq("branch_id", branchId);
      const { data } = await q;
      return data || [];
    },
  });
  const { data: billingStatuses } = useQuery({ queryKey: ["billing-statuses"], queryFn: async () => { const { data } = await supabase.from("billing_statuses").select("id, name").eq("status", "active"); return data || []; } });

  const filteredSubZones = useMemo(() => form.zone_id ? subZones?.filter((s: any) => s.zone_id === form.zone_id) : subZones, [form.zone_id, subZones]);
  const filteredBoxes = useMemo(() => form.zone_id ? boxes?.filter((b: any) => b.zone_id === form.zone_id) : boxes, [form.zone_id, boxes]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.client_id) throw new Error("নাম ও ক্লায়েন্ট কোড আবশ্যক");
      const shouldSyncMikrotik = Boolean(form.mikrotik_id && form.username);
      let mikrotikStatus = shouldSyncMikrotik ? "unknown" : null;
      const payload: any = {
        name: form.name, client_id: form.client_id, contact: form.contact, email: form.email,
        address: form.address, zone_id: form.zone_id || null, sub_zone_id: form.sub_zone_id || null,
        connection_type: form.connection_type || null, client_type: form.client_type || null,
        package_id: form.package_id || null, monthly_bill: form.billing_status === "Active" ? (form.monthly_bill || 0) : 0,
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
        purchase_date: form.purchase_date || null, expire_date: form.billing_status === "Active" ? computeExpireDate(form.expire_day) : null,
        joining_date: form.joining_date || null, billing_start_month: form.billing_status === "Active" ? (form.billing_start_month || null) : null,
        reference_by: form.reference_by || null, is_vip: form.is_vip || false,
        connected_by: form.connected_by || null,
        installed_by_ids: form.installed_by_ids && form.installed_by_ids.length > 0 ? form.installed_by_ids : null,
        expire_day: form.billing_status === "Active" ? Number(form.expire_day || 10) : null,
        mikrotik_status: mikrotikStatus,
        // POP-mode: auto-inject branch + default district/upazila from POP profile
        branch_id: isPopMode ? branchId : (form.branch_id || null),
        district_id: isPopMode ? (districtId || null) : (form.district_id || null),
        upazila_id: isPopMode ? (upazilaId || null) : (form.upazila_id || null),
      };
      if (editMode && editClientId) {
        if (shouldSyncMikrotik) {
          // MikroTik action by billing_status:
          // Left → delete, Inactive → disable, everything else (Active/Personal/Free/VIP) → enable
          const status = (form.billing_status || "Active").toLowerCase();
          const mkAction = status === "left" ? "remove" : "update";
          const mkDisabled = status === "inactive";
          const { data, error: mkErr } = await supabase.functions.invoke("manage-mikrotik-ppp", {
            body: {
              client_id: editClientId,
              mikrotik_id: form.mikrotik_id,
              username: form.username,
              action: mkAction,
              password: form.password || undefined,
              profile: form.profile || undefined,
              remote_address: form.remote_address || undefined,
              disabled: mkDisabled,
            },
          });

          if (mkErr) throw new Error(`MikroTik আপডেট ব্যর্থ: ${mkErr.message || "Unknown"}`);
          if (data?.error) throw new Error(`MikroTik আপডেট ব্যর্থ: ${data.error}`);
          mikrotikStatus = data?.mikrotik_status || "unknown";
          payload.mikrotik_status = mikrotikStatus;
        }

        const { error } = await supabase.from("clients").update(payload).eq("id", editClientId);
        if (error) throw error;
      } else {
        if (shouldSyncMikrotik) {
          const { data, error: mkErr } = await supabase.functions.invoke("create-mikrotik-ppp", {
            body: {
              mikrotik_id: form.mikrotik_id,
              username: form.username,
              password: form.password || null,
              profile: form.profile || null,
              remote_address: form.remote_address || null,
              disabled: (form.billing_status || "Active").toLowerCase() === "inactive",
            },
          });

          if (mkErr) throw new Error(`MikroTik-এ PPPoE user তৈরি ব্যর্থ: ${mkErr.message || "Unknown error"}`);
          if (data?.error) throw new Error(`MikroTik-এ PPPoE user তৈরি ব্যর্থ: ${data.error}`);
          mikrotikStatus = data?.mikrotik_status || "unknown";
          payload.mikrotik_status = mikrotikStatus;

          // If secret already existed, merge its data into payload
          if (data?.already_exists) {
            if (data.existing_profile) payload.profile = data.existing_profile;
            if (data.existing_remote_address) payload.remote_address = data.existing_remote_address;
          }
        }

        const { data: insertedClient, error } = await supabase.from("clients").insert(payload).select("id").single();
        if (error) throw error;

        // Auto-generate billing record — prorated for first month if mid-month join
        if (insertedClient?.id && form.billing_status === "Active") {
          const joinStr = form.joining_date || format(new Date(), "yyyy-MM-dd");
          const join = new Date(joinStr + "T00:00:00");
          const y = join.getFullYear();
          const m = join.getMonth() + 1;
          const totalDays = new Date(y, m, 0).getDate();
          const joinDay = join.getDate();
          const daysRemaining = totalDays - joinDay + 1;
          const monthly = Number(form.monthly_bill || 0);
          const isProrated = joinDay > 1;
          const amount = isProrated
            ? Math.round((monthly / totalDays) * daysRemaining * 100) / 100
            : monthly;
          const monthKey = `${y}-${String(m).padStart(2, "0")}`;
          const currentMonth = `${monthKey}-01`;
          const billId = `BILL-${form.client_id}-${monthKey}`;
          const { data: insertedBill } = await supabase.from("billing").insert({
            bill_id: billId,
            client_id: insertedClient.id,
            month: currentMonth,
            amount,
            due: amount,
            status: "unpaid",
            generated: true,
            branch_id: isPopMode ? branchId : (form.branch_id || null),
          }).select("id").maybeSingle();

          if (insertedBill?.id) {
            await supabase.from("billing_history").insert({
              billing_id: insertedBill.id,
              client_id: insertedClient.id,
              action: isProrated ? "prorated" : "generated",
              new_value: { amount, days: daysRemaining, total_days_in_month: totalDays, monthly },
              remarks: isProrated
                ? `Pro-rated: ${joinDay}-${totalDays} (${daysRemaining} দিন × ৳${monthly}/${totalDays})`
                : `Full month bill ৳${monthly}`,
            });
          }
        }
      }
    },
    onSuccess: async () => {
      // If converted from a request, mark it as completed now
      if (requestId) {
        await supabase.from("client_requests").update({ setup_status: "Completed" } as any).eq("id", requestId);
      }
      toast.success(editMode ? "ক্লায়েন্ট সফলভাবে আপডেট হয়েছে" : "ক্লায়েন্ট সফলভাবে যোগ হয়েছে");
      navigate(isPopMode ? "/pop-admin/clients" : "/dashboard/clients");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-t-lg font-semibold flex items-center gap-2">
      <span>{icon}</span> {title}
      <span className="text-xs font-normal ml-2">আবশ্যক (*) ফিল্ডগুলো পূরণ করুন</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isPopMode ? `POP — ${popName || ""}` : "ক্লায়েন্ট"}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {editMode ? "ক্লায়েন্ট সম্পাদনা" : "নতুন ক্লায়েন্ট যোগ"}
          </span>
        </h1>
      </div>

      {isPopMode && !tariffId && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
          <div>
            <p className="font-medium">এই POP-এ এখনো কোনো tariff assign করা হয়নি।</p>
            <p className="text-muted-foreground">নতুন client তৈরির জন্য admin-এর সাথে যোগাযোগ করে tariff assign করিয়ে নিন।</p>
          </div>
        </div>
      )}

      {/* Personal Information */}
      <div className="border rounded-lg">
        <SectionHeader icon="👤" title="ব্যক্তিগত তথ্য" />
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1 md:row-span-3 flex flex-col items-center gap-2">
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center text-4xl text-muted-foreground">👤</div>
            <span className="text-xs text-muted-foreground">প্রোফাইল ছবি</span>
          </div>
          <div className="md:col-span-2">
            <Label>কাস্টমার নাম *</Label>
            <Input value={form.name} onChange={e => setField("name", e.target.value)} />
          </div>
          <div>
            <Label>মন্তব্য/বিশেষ নোট</Label>
            <Textarea value={form.remarks} onChange={e => setField("remarks", e.target.value)} className="h-20" />
          </div>
          <div>
            <Label>পেশা</Label>
            <Select value={form.occupation} onValueChange={v => setField("occupation", v)}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Student">ছাত্র/ছাত্রী</SelectItem>
                <SelectItem value="Private Job Holder">প্রাইভেট চাকরি</SelectItem>
                <SelectItem value="Govt Job Holder">সরকারি চাকরি</SelectItem>
                <SelectItem value="Business">ব্যবসা</SelectItem>
                <SelectItem value="Housewife">গৃহিণী</SelectItem>
                <SelectItem value="Teacher">শিক্ষক</SelectItem>
                <SelectItem value="Doctor">ডাক্তার</SelectItem>
                <SelectItem value="Engineer">ইঞ্জিনিয়ার</SelectItem>
                <SelectItem value="Farmer">কৃষক</SelectItem>
                <SelectItem value="Retired">অবসরপ্রাপ্ত</SelectItem>
                <SelectItem value="Other">অন্যান্য</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>NID/জন্ম সনদ নম্বর *</Label>
            <Input value={form.nid_number} onChange={e => setField("nid_number", e.target.value)} />
          </div>
          <div>
            <Label>লিঙ্গ</Label>
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
            <Label>পিতার নাম</Label>
            <Input value={form.father_name} onChange={e => setField("father_name", e.target.value)} />
          </div>
          <div>
            <Label>জন্ম তারিখ</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !form.date_of_birth && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.date_of_birth ? format(new Date(form.date_of_birth), "PPP") : <span>তারিখ নির্বাচন</span>}
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
            <Label>মাতার নাম</Label>
            <Input value={form.mother_name} onChange={e => setField("mother_name", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="border rounded-lg">
        <SectionHeader icon="📍" title="যোগাযোগের তথ্য" />
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>মানচিত্র অক্ষাংশ</Label>
            <Input value={form.latitude} onChange={e => setField("latitude", e.target.value)} />
          </div>
          <div>
            <Label>মোবাইল নম্বর *</Label>
            <Input value={form.contact} onChange={e => setField("contact", e.target.value)} />
          </div>
          <div>
            <Label>জেলা</Label>
            <Input disabled placeholder="জোন থেকে" />
          </div>
          <div className="md:row-span-2">
            <Label>বর্তমান ঠিকানা</Label>
            <Textarea value={form.address} onChange={e => setField("address", e.target.value)} className="h-full min-h-[80px]" />
          </div>
          <div>
            <Label>মানচিত্র দ্রাঘিমাংশ</Label>
            <Input value={form.longitude} onChange={e => setField("longitude", e.target.value)} />
          </div>
          <div>
            <Label>ফোন নম্বর</Label>
            <Input value={form.phone_number} onChange={e => setField("phone_number", e.target.value)} />
          </div>
          <div>
            <Label>উপজেলা/থানা</Label>
            <Input disabled placeholder="জোন থেকে" />
          </div>
          <div>
            <Label>ইমেইল ঠিকানা</Label>
            <Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} />
          </div>
          <div>
            <Label>রোড নম্বর</Label>
            <Input value={form.road_number} onChange={e => setField("road_number", e.target.value)} />
          </div>
          <div>
            <Label>বাড়ি নম্বর</Label>
            <Input value={form.house_number} onChange={e => setField("house_number", e.target.value)} />
          </div>
          <div>
            <Label>স্থায়ী ঠিকানা</Label>
            <Textarea value={form.permanent_address} onChange={e => setField("permanent_address", e.target.value)} className="h-20" />
            <div className="flex items-center gap-2 mt-1">
              <Checkbox checked={form.same_address} onCheckedChange={v => setField("same_address", v)} id="same-addr" />
              <label htmlFor="same-addr" className="text-xs">বর্তমান ঠিকানার মতই?</label>
            </div>
          </div>
        </div>
      </div>

      {/* Network & Product Information */}
      <div className="border rounded-lg">
        <SectionHeader icon="📡" title="নেটওয়ার্ক ও প্রোডাক্ট তথ্য" />
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>সার্ভার *</Label>
            <Select value={form.mikrotik_id} onValueChange={v => {
              setField("mikrotik_id", v);
              setField("profile", "");
              setLoadingProfiles(true);
              supabase.functions.invoke("fetch-mikrotik-profiles", { body: { device_id: v } })
                .then(({ data }) => {
                  if (data?.profiles) setMikrotikProfiles(data.profiles);
                  else setMikrotikProfiles([]);
                })
                .catch(() => setMikrotikProfiles([]))
                .finally(() => setLoadingProfiles(false));
            }}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                {mikrotiks?.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>প্রোটোকল টাইপ *</Label>
            <Select value={form.protocol_type} onValueChange={v => setField("protocol_type", v)}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                {(protocolTypes as any[])?.map((p: any) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>জোন *</Label>
            <Select value={form.zone_id} onValueChange={v => { setField("zone_id", v); setField("sub_zone_id", ""); setField("box_id", ""); }}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                {zones?.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>সাব জোন</Label>
            <Select value={form.sub_zone_id} onValueChange={v => setField("sub_zone_id", v)}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                {filteredSubZones?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>বক্স</Label>
            <Select value={form.box_id} onValueChange={v => setField("box_id", v)}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                {filteredBoxes?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>কানেকশন টাইপ *</Label>
            <Select value={form.connection_type} onValueChange={v => setField("connection_type", v)}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                {connectionTypes?.map(ct => <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ক্যাবল প্রয়োজন (মিটার)</Label>
            <Input type="number" value={form.cable_length} onChange={e => setField("cable_length", e.target.value)} placeholder="উদাহরণ: 100" />
          </div>
          <div>
            <Label>ফাইবার কোড</Label>
            <Input value={form.fiber_code} onChange={e => setField("fiber_code", e.target.value)} placeholder="উদাহরণ: 121" />
          </div>
          <div>
            <Label>কোর সংখ্যা</Label>
            <Input type="number" value={form.core_count} onChange={e => setField("core_count", e.target.value)} placeholder="উদাহরণ: 2" />
          </div>
          <div>
            <Label>কোর কালার</Label>
            <Input value={form.core_color} onChange={e => setField("core_color", e.target.value)} placeholder="উদাহরণ: লাল" />
          </div>
          <div>
            <Label>ডিভাইস</Label>
            <Select value={form.device_type} onValueChange={v => setField("device_type", v)}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ONU">ONU</SelectItem>
                <SelectItem value="Router">রাউটার</SelectItem>
                <SelectItem value="Switch">সুইচ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ডিভাইস MAC/সিরিয়াল নম্বর</Label>
            <Input value={form.device_serial} onChange={e => setField("device_serial", e.target.value)} />
          </div>
          <div>
            <Label>ভেন্ডর</Label>
            <Select value={form.vendor} onValueChange={v => setField("vendor", v)}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Huawei">Huawei</SelectItem>
                <SelectItem value="BDCOM">BDCOM</SelectItem>
                <SelectItem value="VSOL">VSOL</SelectItem>
                <SelectItem value="Syrotech">Syrotech</SelectItem>
                <SelectItem value="Other">অন্যান্য</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ক্রয়ের তারিখ</Label>
            <Input type="date" value={form.purchase_date} onChange={e => setField("purchase_date", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Service Information */}
      <div className="border rounded-lg">
        <SectionHeader icon="🔒" title="সার্ভিস তথ্য" />
        <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Label>ক্লায়েন্ট কোড *</Label>
            <Input value={form.client_id} onChange={e => setField("client_id", e.target.value)} />
          </div>
          <div>
            <Label>প্যাকেজ *</Label>
            <Select value={form.package_id} onValueChange={v => {
              setField("package_id", v);
              const pkg = packages?.find(p => p.id === v);
              if (pkg && form.billing_status === "Active") setField("monthly_bill", pkg.price);
            }}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                {packages?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - ৳{p.price}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>প্রোফাইল</Label>
            <Select value={form.profile} onValueChange={v => setField("profile", v)} disabled={loadingProfiles}>
              <SelectTrigger><SelectValue placeholder={loadingProfiles ? "লোড হচ্ছে..." : mikrotikProfiles.length > 0 ? "প্রোফাইল নির্বাচন" : "প্রথমে সার্ভার নির্বাচন"} /></SelectTrigger>
              <SelectContent>
                {mikrotikProfiles.map(p => (
                  <SelectItem key={p.name} value={p.name}>{p.name}{p.rateLimit ? ` (${p.rateLimit})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ক্লায়েন্ট টাইপ *</Label>
            <Select value={form.client_type} onValueChange={v => setField("client_type", v)}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                {clientTypes?.map((ct: any) => <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>বিলিং স্ট্যাটাস *</Label>
            <Select value={form.billing_status} onValueChange={v => setForm(prev => ({
              ...prev,
              billing_status: v,
              ...(v !== "Active" ? { monthly_bill: 0, billing_start_month: "", expire_day: "" } : {}),
            }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {billingStatuses?.map((bs: any) => <SelectItem key={bs.id} value={bs.name}>{bs.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ইউজারনেম/IP *</Label>
            <Input value={form.username} onChange={e => setField("username", e.target.value)} />
          </div>
          <div>
            <Label>রিমোট অ্যাড্রেস</Label>
            <Input value={form.remote_address} onChange={e => setField("remote_address", e.target.value)} />
          </div>
          <div>
            <Label>পাসওয়ার্ড *</Label>
            <Input value={form.password} onChange={e => setField("password", e.target.value)} />
          </div>
          <div>
            <Label>যোগদানের তারিখ *</Label>
            <Input type="date" value={form.joining_date} onChange={e => setField("joining_date", e.target.value)} />
          </div>
          {form.billing_status === "Active" && (
            <>
              <div>
                <Label>মাসিক বিল *</Label>
                <Input type="number" value={form.monthly_bill} onChange={e => setField("monthly_bill", Number(e.target.value))} />
              </div>
              <div>
                <Label>বিলিং শুরুর মাস *</Label>
                <Input type="month" value={form.billing_start_month} onChange={e => setField("billing_start_month", e.target.value)} />
              </div>
              <div>
                <Label>Expired Date (মাসের কোন দিন) *</Label>
                <Select value={String(form.expire_day || "")} onValueChange={v => setField("expire_day", v)}>
                  <SelectTrigger><SelectValue placeholder="দিন নির্বাচন (1-31)" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <SelectItem key={d} value={String(d)}>প্রতি মাসের {d} তারিখ</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div>
            <Label>রেফারেন্স</Label>
            <Input value={form.reference_by} onChange={e => setField("reference_by", e.target.value)} />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Label>VIP ক্লায়েন্ট?</Label>
            <Switch checked={form.is_vip} onCheckedChange={v => setField("is_vip", v)} />
          </div>
          <div className="md:col-span-2">
            <Label>সংযোগ দিয়েছেন (একাধিক টেকনিশিয়ান নির্বাচন করুন)</Label>
            <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1 bg-background">
              {(employees as any[])?.length ? (employees as any[]).map((e: any) => {
                const checked = (form.installed_by_ids as string[])?.includes(e.id);
                return (
                  <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 px-2 py-1 rounded">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const cur = (form.installed_by_ids as string[]) || [];
                        const next = v ? [...cur, e.id] : cur.filter((x) => x !== e.id);
                        setField("installed_by_ids", next);
                      }}
                    />
                    <span>{e.name}</span>
                  </label>
                );
              }) : <span className="text-xs text-muted-foreground px-2">কোনো কর্মচারী নেই</span>}
            </div>
            {(form.installed_by_ids as string[])?.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {(form.installed_by_ids as string[]).length} জন নির্বাচিত
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center py-4">
        <Button variant="outline" onClick={() => navigate(isPopMode ? "/pop-admin/clients" : "/dashboard/clients")}><ArrowLeft className="h-4 w-4 mr-1" /> তালিকায় ফিরুন</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? "সেভ হচ্ছে..." : "সংরক্ষণ ও বের হন"}
        </Button>
      </div>
    </div>
  );
}
