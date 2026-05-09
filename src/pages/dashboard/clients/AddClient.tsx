import { useState, useMemo, useEffect, useRef } from "react";
import { Camera } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { callPortal } from "@/lib/portalApi";

export default function AddClient() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const location = useLocation();
  const { isPopMode, branchId, popId, tariffId, popName, districtId, upazilaId } = usePopScope();
  const prefill = location.state?.prefill;
  const requestId = location.state?.request_id;
  const editMode = location.state?.editMode === true;
  const editClientId = prefill?.id;
  // ?client_type=Corporate / Home (from sidebar quick-add)
  const urlClientType = (() => {
    const sp = new URLSearchParams(location.search);
    const v = sp.get("client_type");
    return v === "Corporate" || v === "Home" ? v : null;
  })();
  const [form, setForm] = useState<Record<string, any>>({
    name: "", gender: "", father_name: "", mother_name: "", nid_number: "",
    date_of_birth: "", occupation: "", remarks: "",
    latitude: "", longitude: "", contact: "", phone_number: "", email: "",
    address: "", permanent_address: "", road_number: "", house_number: "",
    mikrotik_id: "", protocol_type: "PPPoE", zone_id: "", sub_zone_id: "", box_id: "",
    connection_type: "Optical Fiber", cable_length: "", fiber_code: "", core_count: "",
    core_color: "", device_type: "", device_serial: "", vendor: "", purchase_date: "",
    client_id: "", package_id: "", profile: "", client_type: urlClientType || "Home", billing_status: "Active",
    username: "", remote_address: "", password: "", joining_date: format(new Date(), "yyyy-MM-dd"),
    monthly_bill: 0, billing_start_month: format(new Date(), "yyyy-MM"), expire_day: "10",
    reference_by: "", is_vip: false, connected_by: "", installed_by_ids: [] as string[],
    same_address: false,
    // Corporate-only fields
    company_name: "", trade_license_no: "", contact_person: "",
    static_ip: "", routing_protocol: "", bgp_as_number: "", peer_ip: "",
    bandwidth_committed_mbps: "", bandwidth_burst_mbps: "", sla_uptime_percent: "",
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
        client_type: prefill.client_type || prefill.customer_type || prev.client_type,
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
        // Corporate-specific (when editing existing corporate client)
        company_name: prefill.company_name ?? prev.company_name,
        trade_license_no: prefill.trade_license_no ?? prev.trade_license_no,
        contact_person: prefill.contact_person ?? prev.contact_person,
        static_ip: prefill.static_ip ?? prev.static_ip,
        routing_protocol: prefill.routing_protocol ?? prev.routing_protocol,
        bgp_as_number: prefill.bgp_as_number ?? prev.bgp_as_number,
        peer_ip: prefill.peer_ip ?? prev.peer_ip,
        bandwidth_committed_mbps: prefill.bandwidth_committed_mbps ?? prev.bandwidth_committed_mbps,
        bandwidth_burst_mbps: prefill.bandwidth_burst_mbps ?? prev.bandwidth_burst_mbps,
        sla_uptime_percent: prefill.sla_uptime_percent ?? prev.sla_uptime_percent,
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
  // ─── POP-mode: fetch ALL form metadata via portal-data edge function (service-role) ───
  // Portal users have no Supabase auth.uid(), so direct table reads are blocked by RLS.
  const { data: popMeta } = useQuery({
    enabled: isPopMode,
    queryKey: ["pop-add-client-meta", popId, branchId, tariffId],
    queryFn: async () => {
      const res = await callPortal<any>("get_client_form_meta");
      return res;
    },
  });

  // ─── Admin-mode queries (unchanged) ───
  const { data: zonesAdmin } = useQuery({
    enabled: !isPopMode,
    queryKey: ["zones-active-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("zones").select("id, name").eq("status", "active");
      return data || [];
    },
  });
  const { data: subZonesAdmin } = useQuery({
    enabled: !isPopMode,
    queryKey: ["sub-zones-active-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("sub_zones").select("id, name, zone_id").eq("status", "active");
      return data || [];
    },
  });
  const { data: boxesAdmin } = useQuery({
    enabled: !isPopMode,
    queryKey: ["boxes-active-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("boxes").select("id, name, zone_id").eq("status", "active");
      return data || [];
    },
  });
  const { data: packagesAdmin } = useQuery({
    enabled: !isPopMode,
    queryKey: ["client-add-packages-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("isp_packages")
        .select("id, name, price, bandwidth_down")
        .eq("status", "active");
      return data || [];
    },
  });
  const { data: connectionTypesAdmin } = useQuery({ enabled: !isPopMode, queryKey: ["connection-types-active-admin"], queryFn: async () => { const { data } = await supabase.from("connection_types_config").select("id, name").eq("status", "active"); return data || []; } });
  const { data: clientTypesAdmin } = useQuery({ enabled: !isPopMode, queryKey: ["client-types-active-admin"], queryFn: async () => { const { data } = await supabase.from("client_types").select("id, name").eq("status", "active"); return data || []; } });
  const { data: mikrotiksAdmin } = useQuery({ enabled: !isPopMode, queryKey: ["mikrotik-devices-admin"], queryFn: async () => { const { data } = await supabase.from("mikrotik_devices").select("id, name"); return data || []; } });
  const { data: protocolTypesAdmin } = useQuery({ enabled: !isPopMode, queryKey: ["protocol-types-active-admin"], queryFn: async () => { const { data } = await supabase.from("protocol_types" as any).select("id, name").eq("status", "active"); return data || []; } });
  const { data: employeesAdmin } = useQuery({
    enabled: !isPopMode,
    queryKey: ["employees-active-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name").eq("status", "active");
      return data || [];
    },
  });
  const { data: billingStatusesAdmin } = useQuery({ enabled: !isPopMode, queryKey: ["billing-statuses-admin"], queryFn: async () => { const { data } = await supabase.from("billing_statuses").select("id, name").eq("status", "active"); return data || []; } });

  // ─── Unified accessors (POP mode reads from popMeta, Admin mode from individual queries) ───
  const zones = (isPopMode ? popMeta?.zones : zonesAdmin) || [];
  const subZones = (isPopMode ? popMeta?.subZones : subZonesAdmin) || [];
  const boxes = (isPopMode ? popMeta?.boxes : boxesAdmin) || [];
  const packages = (isPopMode ? popMeta?.packages : packagesAdmin) || [];
  const connectionTypes = (isPopMode ? popMeta?.connectionTypes : connectionTypesAdmin) || [];
  const clientTypes = (isPopMode ? popMeta?.clientTypes : clientTypesAdmin) || [];
  const mikrotiks = (isPopMode ? popMeta?.mikrotiks : mikrotiksAdmin) || [];
  const protocolTypes = (isPopMode ? popMeta?.protocolTypes : protocolTypesAdmin) || [];
  const employees = (isPopMode ? popMeta?.employees : employeesAdmin) || [];
  const billingStatuses = (isPopMode ? popMeta?.billingStatuses : billingStatusesAdmin) || [];

  // Safety: clear default "Optical Fiber" if not present in active list
  useEffect(() => {
    if (!connectionTypes.length) return;
    if (form.connection_type && !connectionTypes.some((ct: any) => ct.name === form.connection_type)) {
      setField("connection_type", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionTypes]);


  // POP mode: auto-fill default server, lock protocol to PPPoE, auto-suggest client_id + default credentials
  useEffect(() => {
    if (!isPopMode || !popMeta) return;
    setForm(prev => {
      const next = { ...prev };
      if (popMeta.defaultServerId && !prev.mikrotik_id) {
        next.mikrotik_id = popMeta.defaultServerId;
        next.protocol_type = "PPPoE";
      }
      // Auto-suggest client code if empty (and use it as default username if username is empty)
      if (!prev.client_id && popMeta.nextClientCode) {
        next.client_id = popMeta.nextClientCode;
        if (!prev.username) next.username = popMeta.nextClientCode;
      }
      // Default password = "12345" if empty (POP can override)
      if (!prev.password) next.password = "12345";
      return next;
    });

    // Fetch mikrotik profiles for the default server
    if (popMeta.defaultServerId && mikrotikProfiles.length === 0) {
      setLoadingProfiles(true);
      supabase.functions.invoke("fetch-mikrotik-profiles", { body: { device_id: popMeta.defaultServerId } })
        .then(({ data }) => setMikrotikProfiles(data?.profiles || []))
        .catch(() => setMikrotikProfiles([]))
        .finally(() => setLoadingProfiles(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPopMode, popMeta?.defaultServerId, popMeta?.nextClientCode]);

  // Duplicate client_id check (global across all POPs/Admin)
  const checkClientCodeUnique = async () => {
    setClientCodeError("");
    const code = (form.client_id || "").trim();
    if (!code) return;
    if (isPopMode) {
      try {
        const res = await callPortal<{ unique: boolean }>("check_client_code_unique", { client_id: code });
        if (!res.unique && (!editMode || code !== prefill?.client_id)) {
          setClientCodeError("এই client code ইতিমধ্যে অন্য POP/Admin-এ ব্যবহৃত হয়েছে");
        }
      } catch { /* ignore */ }
      return;
    }
    const { data } = await supabase.from("clients").select("id").eq("client_id", code).limit(1);
    if (data && data.length > 0 && (!editMode || data[0].id !== editClientId)) {
      setClientCodeError("এই client code ইতিমধ্যে অন্য POP/Admin-এ ব্যবহৃত হয়েছে");
    }
  };

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
        mikrotik_id: form.mikrotik_id || null,
        username: form.protocol_type === "Static" ? null : (form.username || null),
        password: form.protocol_type === "Static" ? null : (form.password || null),
        remote_address: form.protocol_type === "Static" ? null : (form.remote_address || null),
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
        // Corporate-specific (only persisted when client_type='Corporate')
        company_name: form.client_type === "Corporate" ? (form.company_name || null) : null,
        trade_license_no: form.client_type === "Corporate" ? (form.trade_license_no || null) : null,
        contact_person: form.client_type === "Corporate" ? (form.contact_person || null) : null,
        static_ip: (form.client_type === "Corporate" || form.protocol_type === "Static") ? (form.static_ip || null) : null,
        routing_protocol: form.client_type === "Corporate" ? (form.routing_protocol || null) : null,
        bgp_as_number: form.client_type === "Corporate" ? (form.bgp_as_number || null) : null,
        peer_ip: (form.client_type === "Corporate" || form.protocol_type === "Static") ? (form.peer_ip || null) : null,
        bandwidth_committed_mbps: form.client_type === "Corporate" && form.bandwidth_committed_mbps ? Number(form.bandwidth_committed_mbps) : null,
        bandwidth_burst_mbps: form.client_type === "Corporate" && form.bandwidth_burst_mbps ? Number(form.bandwidth_burst_mbps) : null,
        sla_uptime_percent: form.client_type === "Corporate" && form.sla_uptime_percent ? Number(form.sla_uptime_percent) : null,
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

          if (data?.already_exists) {
            if (data.existing_profile) payload.profile = data.existing_profile;
            if (data.existing_remote_address) payload.remote_address = data.existing_remote_address;
          }
        }

        // POP mode: insert via portal-data edge function (service-role) so RLS doesn't block
        if (isPopMode) {
          const res = await callPortal<{ ok: boolean; id?: string; error?: string }>("create_client", payload);
          if (!res.ok) throw new Error(res.error || "ক্লায়েন্ট তৈরি ব্যর্থ");
          return;
        }

        const { data: insertedClient, error } = await supabase.from("clients").insert(payload).select("id").single();
        if (error) throw error;

        // Auto-generate billing record — prorated for first month if mid-month join (admin mode only;
        // POP mode does this server-side inside create_client)
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
            branch_id: form.branch_id || null,
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
      // Invalidate all client list caches so the new client appears immediately
      qc.invalidateQueries({ queryKey: ["pop-list-clients"] });
      qc.invalidateQueries({ queryKey: ["portal-pop-clients"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["pop_mt_users"] });
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
        <div>
          <h1 className="text-2xl font-bold">
            {isPopMode ? `POP — ${popName || ""}` : "ক্লায়েন্ট"}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {editMode ? "ক্লায়েন্ট সম্পাদনা" : "নতুন ক্লায়েন্ট যোগ"}
            </span>
          </h1>
          {isPopMode && (
            <p className="text-xs text-muted-foreground mt-1">
              নতুন ক্লায়েন্ট — সার্ভার, প্রোফাইল ও জেলা/উপজেলা স্বয়ংক্রিয় POP প্রোফাইল থেকে
            </p>
          )}
        </div>
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

      {isPopMode && (
        <div className="rounded-lg border bg-card p-4 text-sm">
          <p className="font-semibold mb-2">📋 ক্লায়েন্ট তৈরির চেকলিস্ট (Client create checklist)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5">
            {[
              { label: "প্রোটোকল টাইপ (Protocol)", count: protocolTypes.length },
              { label: "কানেকশন টাইপ (Connection)", count: connectionTypes.length },
              { label: "ক্লায়েন্ট টাইপ (Client type)", count: clientTypes.length },
              { label: "বিলিং স্ট্যাটাস (Billing status)", count: billingStatuses.length },
              { label: "প্যাকেজ (Package)", count: packages.length },
              { label: "মাইক্রোটিক সার্ভার (Mikrotik server)", count: mikrotiks.length },
            ].map((row) => {
              const ok = row.count > 0;
              return (
                <div key={row.label} className="flex items-center gap-2">
                  <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold", ok ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive")}>
                    {ok ? "✓" : "✗"}
                  </span>
                  <span className={cn("flex-1", ok ? "text-foreground" : "text-muted-foreground")}>{row.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{ok ? `${row.count} টি` : "লোড হয়নি"}</span>
                </div>
              );
            })}
          </div>
          {!popMeta && (
            <p className="text-xs text-muted-foreground mt-2">মেটাডেটা লোড হচ্ছে…</p>
          )}
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
            <Input disabled value={isPopMode ? (popMeta?.districtName || "") : ""} placeholder={isPopMode ? "POP প্রোফাইল থেকে" : "জোন থেকে"} />
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
            <Input disabled value={isPopMode ? (popMeta?.upazilaName || "") : ""} placeholder={isPopMode ? "POP প্রোফাইল থেকে" : "জোন থেকে"} />
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
            <Select
              value={form.mikrotik_id}
              disabled={isPopMode}
              onValueChange={v => {
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
              }}
            >
              <SelectTrigger><SelectValue placeholder={isPopMode ? "POP-এর ডিফল্ট সার্ভার" : "নির্বাচন করুন"} /></SelectTrigger>
              <SelectContent>
                {mikrotiks?.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {isPopMode && (
              <p className="text-xs text-muted-foreground mt-1">POP প্রোফাইল থেকে স্বয়ংক্রিয়</p>
            )}
          </div>
          <div>
            <Label>প্রোটোকল টাইপ *</Label>
            <Select value={form.protocol_type} onValueChange={v => setField("protocol_type", v)} disabled={isPopMode}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                {(protocolTypes as any[])?.map((p: any) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {isPopMode && (
              <p className="text-xs text-muted-foreground mt-1">POP-এর জন্য PPPoE লক করা</p>
            )}
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
            <Input
              value={form.client_id}
              onChange={e => { setField("client_id", e.target.value); if (clientCodeError) setClientCodeError(""); }}
              onBlur={checkClientCodeUnique}
              placeholder={isPopMode && popMeta?.popPrefix ? `স্বয়ংক্রিয়: ${popMeta.popPrefix}-000001` : "স্বয়ংক্রিয় বা কাস্টম"}
            />
            {clientCodeError && <p className="text-xs text-destructive mt-1">{clientCodeError}</p>}
          </div>
          <div>
            <Label>প্যাকেজ *</Label>
            <Select value={form.package_id} onValueChange={v => {
              setField("package_id", v);
              const pkg: any = packages?.find((p: any) => p.id === v);
              if (pkg && form.billing_status === "Active") setField("monthly_bill", pkg.price);
              // POP mode: auto-set profile from tariff package's mikrotik_profile (locked from tariff config)
              if (isPopMode && pkg?.mikrotik_profile) setField("profile", pkg.mikrotik_profile);
              // Warn if reseller hasn't set a selling rate yet
              if (isPopMode && pkg && (!pkg.price || pkg.price <= 0)) {
                toast.error("Selling Rate সেট করা নেই", {
                  description: "এই প্যাকেজের জন্য Package page-এ গিয়ে আপনার Selling Rate সেট করুন।",
                });
              }
            }}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                {packages?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - ৳{p.price}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>প্রোফাইল</Label>
            <Select value={form.profile} onValueChange={v => setField("profile", v)} disabled={loadingProfiles || isPopMode}>
              <SelectTrigger><SelectValue placeholder={loadingProfiles ? "লোড হচ্ছে..." : isPopMode ? "প্যাকেজ থেকে স্বয়ংক্রিয়" : mikrotikProfiles.length > 0 ? "প্রোফাইল নির্বাচন" : "প্রথমে সার্ভার নির্বাচন"} /></SelectTrigger>
              <SelectContent>
                {/* Preserve existing profile if not yet in fetched list (edit mode / loading) */}
                {form.profile && !mikrotikProfiles.some(p => p.name === form.profile) && (
                  <SelectItem value={form.profile}>{form.profile} (বর্তমান)</SelectItem>
                )}
                {mikrotikProfiles.map(p => (
                  <SelectItem key={p.name} value={p.name}>{p.name}{p.rateLimit ? ` (${p.rateLimit})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPopMode && (
              <p className="text-xs text-muted-foreground mt-1">প্যাকেজ অনুযায়ী tariff থেকে লক করা</p>
            )}
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
          {form.protocol_type === "Static" ? (
            <>
              <div>
                <Label>Static IP / Subnet *</Label>
                <Input
                  value={form.static_ip}
                  onChange={e => setField("static_ip", e.target.value)}
                  placeholder="যেমন: 192.168.10.25/24"
                />
              </div>
              <div>
                <Label>রাউটার MAC Address</Label>
                <Input
                  value={form.mac_address}
                  onChange={e => setField("mac_address", e.target.value)}
                  placeholder="যেমন: AA:BB:CC:11:22:33"
                />
              </div>
              <div>
                <Label>গেটওয়ে / Peer IP</Label>
                <Input
                  value={form.peer_ip}
                  onChange={e => setField("peer_ip", e.target.value)}
                  placeholder="যেমন: 192.168.10.1"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>ইউজারনেম *</Label>
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
            </>
          )}
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
                <p className="text-xs text-muted-foreground mt-1">
                  প্রতি মাসের এই তারিখে line বন্ধ হবে (Date-to-Date tariff হলে validity এই তারিখ থেকেই গণনা হবে)।
                </p>
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

      {/* Corporate Info — only when client_type === 'Corporate' */}
      {form.client_type === "Corporate" && (
        <div className="border rounded-lg border-violet-500/40">
          <SectionHeader icon="🏢" title="কর্পোরেট তথ্য (Corporate Info)" />
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>কোম্পানির নাম</Label>
              <Input
                value={form.company_name}
                onChange={e => setField("company_name", e.target.value)}
                placeholder="যেমন: Acme Ltd."
              />
            </div>
            <div>
              <Label>ট্রেড লাইসেন্স / BIN</Label>
              <Input
                value={form.trade_license_no}
                onChange={e => setField("trade_license_no", e.target.value)}
                placeholder="যেমন: TL-12345"
              />
            </div>
            <div>
              <Label>যোগাযোগের ব্যক্তি</Label>
              <Input
                value={form.contact_person}
                onChange={e => setField("contact_person", e.target.value)}
                placeholder="Primary contact name"
              />
            </div>

            <div>
              <Label>Static IP / Subnet</Label>
              <Input
                value={form.static_ip}
                onChange={e => setField("static_ip", e.target.value)}
                placeholder="যেমন: 103.10.10.0/29"
                className="font-mono"
              />
            </div>
            <div>
              <Label>রাউটিং প্রোটোকল</Label>
              <Select value={form.routing_protocol} onValueChange={v => setField("routing_protocol", v)}>
                <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Static">Static</SelectItem>
                  <SelectItem value="BGP">BGP</SelectItem>
                  <SelectItem value="OSPF">OSPF</SelectItem>
                  <SelectItem value="None">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Peer IP (ISP side)</Label>
              <Input
                value={form.peer_ip}
                onChange={e => setField("peer_ip", e.target.value)}
                placeholder="যেমন: 103.10.10.1"
                className="font-mono"
              />
            </div>

            {form.routing_protocol === "BGP" && (
              <div>
                <Label>BGP AS Number</Label>
                <Input
                  value={form.bgp_as_number}
                  onChange={e => setField("bgp_as_number", e.target.value)}
                  placeholder="যেমন: 65001"
                />
              </div>
            )}

            <div>
              <Label>Committed (CIR) Mbps</Label>
              <Input
                type="number"
                value={form.bandwidth_committed_mbps}
                onChange={e => setField("bandwidth_committed_mbps", e.target.value)}
                placeholder="যেমন: 100"
              />
            </div>
            <div>
              <Label>Burst Mbps</Label>
              <Input
                type="number"
                value={form.bandwidth_burst_mbps}
                onChange={e => setField("bandwidth_burst_mbps", e.target.value)}
                placeholder="যেমন: 200"
              />
            </div>
            <div>
              <Label>SLA Uptime %</Label>
              <Input
                type="number"
                step="0.01"
                value={form.sla_uptime_percent}
                onChange={e => setField("sla_uptime_percent", e.target.value)}
                placeholder="যেমন: 99.5"
              />
            </div>
          </div>
        </div>
      )}

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
