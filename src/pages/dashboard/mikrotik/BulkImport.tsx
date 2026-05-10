import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Upload, Trash2, FileSpreadsheet, ChevronDown, ChevronRight, Info, CheckCircle, RefreshCw, AlertCircle, Wand2, Undo2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as XLSX from "xlsx";

const COLUMNS: { key: string; label: string; optional?: boolean; type?: "select" | "text" | "number" }[] = [
  { key: "C.Code", label: "C.Code" },
  { key: "Name", label: "Name" },
  { key: "Mobile", label: "Mobile" },
  { key: "Email", label: "Email", optional: true },
  { key: "NationalID", label: "NationalId", optional: true },
  { key: "Address", label: "Address" },
  { key: "Zone", label: "Zone", type: "select" },
  { key: "Conn.Type", label: "Conn.Type", type: "select" },
  { key: "Server", label: "Server" },
  { key: "Prot.Type", label: "Prot.Type", type: "select" },
  { key: "Profile", label: "Profile" },
  { key: "UserName", label: "UserName" },
  { key: "Password", label: "Password" },
  { key: "R.Address", label: "R.Address" },
  { key: "C.Type", label: "C.Type", type: "select" },
  { key: "Package", label: "Package", type: "select" },
  { key: "B.Status", label: "B.Status", type: "select" },
  { key: "M.Bill", label: "M.Bill", type: "number" },
  { key: "Bill.Month", label: "Bill.Month" },
  { key: "Join.Date", label: "Join.Date" },
  { key: "Exp.Date", label: "Exp.Date" },
  { key: "DateOfBirth", label: "DateOfBirth", optional: true },
  { key: "FatherName", label: "FatherName", optional: true },
  { key: "MotherName", label: "MotherName", optional: true },
  { key: "Occupation", label: "Occupation", optional: true },
];

const MANDATORY = ["Name", "Mobile", "Address", "Zone", "Conn.Type", "Prot.Type", "Package", "M.Bill", "Join.Date", "Exp.Date"];
const CLIENT_TYPES = ["Home", "Corporate"];
const STATUSES = ["Active", "Inactive", "Pending"];

interface ImportRow {
  _idx: number;
  _mikrotik_client_id?: string;
  _autoFilled?: Record<string, boolean>;
  _selected?: boolean;
  _original?: Record<string, any>;
  _codeConflict?: { existingName: string } | null;
  [key: string]: any;
}

const pad2 = (n: number) => n.toString().padStart(2, "0");
const todayDDMMYYYY = () => {
  const d = new Date();
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
};
const currentMMYYYY = () => {
  const d = new Date();
  return `${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
};

export default function BulkImport() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [instructionOpen, setInstructionOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [selectedProfile, setSelectedProfile] = useState<string>("all");
  const [bulkOpen, setBulkOpen] = useState(true);
  const [bulkValues, setBulkValues] = useState<Record<string, string>>({});
  const { data: packages = [] } = useQuery({
    queryKey: ["isp_packages_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("isp_packages").select("id, name, price, mikrotik_profile").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["zones_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("zones").select("id, name").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: connectionTypes = [] } = useQuery({
    queryKey: ["connection_types_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("connection_types_config").select("id, name").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: protocolTypes = [] } = useQuery({
    queryKey: ["protocol_types_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("protocol_types").select("id, name").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: mikrotikDevices = [] } = useQuery({
    queryKey: ["mikrotik_devices_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mikrotik_devices").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: billingConfig } = useQuery({
    queryKey: ["sys_billing_cycle_config"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("setting_value").eq("setting_key", "billing_cycle_config").maybeSingle();
      return (data?.setting_value as any) || { mode: "monthly_first", grace_days: 0 };
    },
  });

  const ready = packages.length > 0 && zones.length >= 0 && connectionTypes.length >= 0 && protocolTypes.length >= 0;

  const matchProtocol = (mkService: string | undefined) => {
    if (!protocolTypes.length) return "";
    const s = (mkService || "").toLowerCase().trim();
    if (s && s !== "any") {
      const found = protocolTypes.find((p) => p.name.toLowerCase() === s || p.name.toLowerCase().replace(/[^a-z]/g, "") === s.replace(/[^a-z]/g, ""));
      if (found) return found.name;
    }
    const pppoe = protocolTypes.find((p) => p.name.toLowerCase().includes("pppoe"));
    return pppoe?.name || protocolTypes[0]?.name || "";
  };

  const computeExpDay = () => {
    const mode = billingConfig?.mode || "monthly_first";
    if (mode === "monthly_first") return "01";
    return pad2(new Date().getDate());
  };

  // Auto-load unmatched MikroTik users
  const loadUnmatchedUsers = async () => {
    setAutoLoading(true);
    try {
      const { data: mkClients, error: mkErr } = await supabase
        .from("mikrotik_clients")
        .select("*, mikrotik_devices!mikrotik_clients_mikrotik_id_fkey(name)")
        .eq("exported", false)
        .order("created_at", { ascending: false });
      if (mkErr) throw mkErr;

      const { data: existingClients } = await supabase.from("clients").select("username");
      const existingUsernames = new Set(
        (existingClients || []).map((c: any) => c.username?.toLowerCase()).filter(Boolean)
      );

      const unmatched = (mkClients || []).filter(
        (mc: any) => !existingUsernames.has(mc.name?.toLowerCase())
      );

      if (unmatched.length === 0) {
        toast.info("সকল MikroTik ইউজার ইতোমধ্যে ক্লায়েন্ট লিস্টে আছে");
        setAutoLoading(false);
        return;
      }

      const defaultZone = zones[0]?.name || "";
      const defaultConn = connectionTypes[0]?.name || "";
      const expDay = computeExpDay();
      const billMonth = currentMMYYYY();
      const join = todayDDMMYYYY();

      const mapped: ImportRow[] = unmatched.map((mc: any, idx: number) => {
        const matchedPkg = packages.find((p) => p.mikrotik_profile === mc.profile);
        const serverName = mc.mikrotik_devices?.name || mc.server_name || "";
        const protType = matchProtocol(mc.service);

        const autoFilled: Record<string, boolean> = {
          "C.Code": true, UserName: true, Password: !!mc.password, Server: !!serverName,
          "Prot.Type": !!protType, Profile: !!mc.profile, "R.Address": !!mc.remote_address,
          "C.Type": true, Zone: !!defaultZone, "Conn.Type": !!defaultConn,
          Package: !!matchedPkg, "M.Bill": !!matchedPkg, "B.Status": true,
          "Bill.Month": true, "Join.Date": true, "Exp.Date": true,
        };

        const data: Record<string, any> = {
          "C.Code": mc.name || "",
          Name: "",
          Mobile: "",
          Email: "",
          NationalID: "",
          Address: "",
          Zone: defaultZone,
          "Conn.Type": defaultConn,
          Server: serverName,
          "Prot.Type": protType,
          Profile: mc.profile || "",
          UserName: mc.name || "",
          Password: mc.password || "",
          "R.Address": mc.remote_address || "",
          "C.Type": "Home",
          Package: matchedPkg?.name || "",
          "B.Status": "Active",
          "M.Bill": matchedPkg?.price || 0,
          "Bill.Month": billMonth,
          "Join.Date": join,
          "Exp.Date": expDay,
          DateOfBirth: "",
          FatherName: "",
          MotherName: "",
          Occupation: "",
        };

        return {
          _idx: idx,
          _mikrotik_client_id: mc.id,
          _autoFilled: autoFilled,
          _selected: false,
          _original: { ...data, _autoFilled: { ...autoFilled } },
          _codeConflict: null,
          ...data,
        };
      });

      // Check Client Code conflicts in DB (global unique)
      const codes = mapped.map((r) => r["C.Code"]).filter(Boolean);
      if (codes.length > 0) {
        const { data: existing } = await supabase
          .from("clients")
          .select("client_id, name")
          .in("client_id", codes);
        const conflictMap = new Map<string, string>();
        (existing || []).forEach((c: any) => conflictMap.set(c.client_id, c.name));
        mapped.forEach((r) => {
          const ex = conflictMap.get(r["C.Code"]);
          if (ex) r._codeConflict = { existingName: ex };
        });
      }

      setRows(mapped);
      toast.success(`${mapped.length} জন আনম্যাচড MikroTik ইউজার লোড হয়েছে`);
    } catch (e: any) {
      toast.error("লোড ব্যর্থ: " + e.message);
    } finally {
      setAutoLoading(false);
    }
  };

  useEffect(() => {
    if (ready) loadUnmatchedUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const downloadSample = () => {
    const headers = COLUMNS.map((c) => c.key);
    const ws = XLSX.utils.aoa_to_sheet([headers, headers.map(() => "")]);
    ws["!cols"] = headers.map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Import Template");
    XLSX.writeFile(wb, "bulk_import_template.xlsx");
    toast.success("টেমপ্লেট ডাউনলোড হয়েছে");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any>(ws);

      const parsed: ImportRow[] = data.map((row: any, idx: number) => ({
        _idx: idx + rows.length + Date.now(),
        _autoFilled: {},
        ...row,
      }));

      setRows((prev) => [...prev, ...parsed]);
      toast.success(`${parsed.length} টি সারি লোড হয়েছে`);
    };
    reader.readAsBinaryString(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const deleteRow = (idx: number) => setRows((prev) => prev.filter((r) => r._idx !== idx));

  const downloadEdited = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map(({ _idx, _mikrotik_client_id, _autoFilled, ...rest }) => rest));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Edited Data");
    XLSX.writeFile(wb, "edited_import_data.xlsx");
    toast.success("এডিটেড ডাটা ডাউনলোড হয়েছে");
  };

  const isRowValid = (r: ImportRow) =>
    MANDATORY.every((k) => {
      const v = r[k];
      if (k === "M.Bill") return Number(v) > 0;
      return v !== undefined && v !== null && String(v).trim() !== "";
    });

  const invalidCount = useMemo(() => rows.filter((r) => !isRowValid(r)).length, [rows]);
  const conflictCount = useMemo(() => rows.filter((r) => r._codeConflict).length, [rows]);
  const selectedCount = useMemo(() => rows.filter((r) => r._selected).length, [rows]);
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  const toggleRow = (idx: number, checked: boolean) =>
    setRows((prev) => prev.map((r) => (r._idx === idx ? { ...r, _selected: checked } : r)));
  const toggleAll = (checked: boolean) =>
    setRows((prev) => prev.map((r) => ({ ...r, _selected: checked })));

  const resetSelectedToOriginal = () => {
    if (selectedCount === 0) {
      toast.error("আগে রো select করুন");
      return;
    }
    setRows((prev) =>
      prev.map((r) => {
        if (!r._selected || !r._original) return r;
        const { _autoFilled: origAuto, ...origData } = r._original;
        return { ...r, ...origData, _autoFilled: { ...(origAuto || {}) } };
      })
    );
    toast.success(`${selectedCount} টি রো রিসেট হয়েছে`);
  };

  const checkCodeConflict = async (idx: number, code: string) => {
    if (!code || !code.trim()) {
      setRows((prev) => prev.map((r) => (r._idx === idx ? { ...r, _codeConflict: null } : r)));
      return;
    }
    const { data } = await supabase.from("clients").select("client_id, name").eq("client_id", code).maybeSingle();
    setRows((prev) =>
      prev.map((r) =>
        r._idx === idx ? { ...r, _codeConflict: data ? { existingName: (data as any).name } : null } : r
      )
    );
  };

  const BULK_FIELDS: { key: string; label: string; type: "select" | "text" | "month" | "date" | "number" }[] = [
    { key: "Zone", label: "Zone", type: "select" },
    { key: "Conn.Type", label: "Conn.Type", type: "select" },
    { key: "Prot.Type", label: "Prot.Type", type: "select" },
    { key: "Package", label: "Package", type: "select" },
    { key: "C.Type", label: "C.Type", type: "select" },
    { key: "B.Status", label: "B.Status", type: "select" },
    { key: "Bill.Month", label: "Bill.Month (MM-YYYY)", type: "month" },
    { key: "Join.Date", label: "Join.Date", type: "date" },
    { key: "Exp.Date", label: "Exp.Date (Day 1-31)", type: "number" },
  ];

  const setBulkValue = (key: string, value: string) =>
    setBulkValues((prev) => ({ ...prev, [key]: value }));

  const clearBulk = () => setBulkValues({});

  const applyBulk = () => {
    if (selectedCount === 0) {
      toast.error("আগে রো select করুন");
      return;
    }
    const filled = Object.entries(bulkValues).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "");
    if (filled.length === 0) {
      toast.error("কমপক্ষে একটি ফিল্ড পূরণ করুন");
      return;
    }
    setRows((prev) =>
      prev.map((r) => {
        if (!r._selected) return r;
        const updated: ImportRow = { ...r, _autoFilled: { ...(r._autoFilled || {}) } };
        for (const [k, raw] of filled) {
          let v = raw;
          if (k === "Join.Date" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
            const [y, m, d] = v.split("-");
            v = `${d}-${m}-${y}`;
          }
          if (k === "Bill.Month" && /^\d{4}-\d{2}$/.test(v)) {
            const [y, m] = v.split("-");
            v = `${m}-${y}`;
          }
          if (k === "Exp.Date") {
            const n = Math.max(1, Math.min(31, Number(v) || 1));
            v = pad2(n);
          }
          updated[k] = v;
          updated._autoFilled![k] = false;
          if (k === "Package") {
            const pkg = packages.find((p) => p.name === v);
            if (pkg) {
              updated["M.Bill"] = pkg.price || 0;
              updated._autoFilled!["M.Bill"] = false;
            }
          }
        }
        return updated;
      })
    );
    toast.success(`${selectedCount} টি রো আপডেট হয়েছে`);
  };

  const updateCell = (idx: number, key: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._idx !== idx) return r;
        const updated: ImportRow = { ...r, [key]: value, _autoFilled: { ...(r._autoFilled || {}), [key]: false } };
        if (key === "Package") {
          const pkg = packages.find((p) => p.name === value);
          if (pkg) {
            updated["M.Bill"] = pkg.price || 0;
            updated._autoFilled = { ...(updated._autoFilled || {}), "M.Bill": true };
          }
        }
        return updated;
      })
    );
    if (key === "C.Code") {
      // fire-and-forget conflict re-check
      void checkCodeConflict(idx, value);
    }
  };

  const importAll = async () => {
    if (rows.length === 0) { toast.error("ইমপোর্ট করার ডাটা নেই"); return; }
    if (invalidCount > 0) { toast.error(`${invalidCount} টি সারিতে mandatory ফিল্ড অনুপস্থিত`); return; }
    if (conflictCount > 0) { toast.error(`${conflictCount} টি Client Code ইতোমধ্যে ব্যবহৃত — পরিবর্তন করুন`); return; }
    setImporting(true);
    try {
      const parseDDMMYYYY = (s: string) => {
        if (!s) return null;
        const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;
        return s;
      };

      const computeExpireDate = (billMonth: string, expDay: string): string | null => {
        if (!expDay) return null;
        const day = Math.max(1, Math.min(31, Number(expDay) || 1));
        let year: number, month: number;
        const mm = (billMonth || "").match(/^(\d{2})-(\d{4})$/);
        if (mm) { month = Number(mm[1]); year = Number(mm[2]); }
        else { const d = new Date(); month = d.getMonth() + 1; year = d.getFullYear(); }
        const lastDay = new Date(year, month, 0).getDate();
        const realDay = Math.min(day, lastDay);
        return `${year}-${pad2(month)}-${pad2(realDay)}`;
      };

      const clientsToInsert = rows.map((r) => {
        const zone = zones.find((z) => z.name === r.Zone);
        const pkg = packages.find((p) => p.name === r.Package);
        const device = mikrotikDevices.find((d) => d.name === r.Server);
        return {
          client_id: r["C.Code"] || `CLT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: r.Name || r.UserName || "Unknown",
          contact: r.Mobile || null,
          email: r.Email || null,
          nid_number: r.NationalID || null,
          address: r.Address || null,
          zone_id: zone?.id || null,
          connection_type: r["Conn.Type"] || null,
          server_name: r.Server || null,
          mikrotik_id: device?.id || null,
          protocol_type: r["Prot.Type"] || null,
          profile: r.Profile || null,
          username: r.UserName || null,
          password: r.Password || null,
          remote_address: r["R.Address"] || null,
          client_type: r["C.Type"] || "Home",
          package_id: pkg?.id || null,
          billing_status: r["B.Status"] || "Active",
          monthly_bill: r["M.Bill"] ? Number(r["M.Bill"]) : 0,
          billing_start_month: r["Bill.Month"] || null,
          joining_date: parseDDMMYYYY(r["Join.Date"]),
          expire_date: computeExpireDate(r["Bill.Month"], r["Exp.Date"]),
          date_of_birth: parseDDMMYYYY(r.DateOfBirth) || null,
          father_name: r.FatherName || null,
          mother_name: r.MotherName || null,
          occupation: r.Occupation || null,
          status: "active",
        };
      });

      const { error } = await supabase.from("clients").insert(clientsToInsert);
      if (error) throw error;

      const mkIds = rows.map((r) => r._mikrotik_client_id).filter(Boolean);
      if (mkIds.length > 0) {
        await supabase.from("mikrotik_clients").update({ exported: true, exported_to: "client_list" }).in("id", mkIds);
      }

      toast.success(`${clientsToInsert.length} জন ক্লায়েন্ট সফলভাবে ইমপোর্ট হয়েছে`);
      setRows([]);
      queryClient.invalidateQueries({ queryKey: ["mikrotik_clients"] });
    } catch (e: any) {
      toast.error(`ইমপোর্ট ব্যর্থ: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  const optionsFor = (key: string): string[] => {
    switch (key) {
      case "Zone": return zones.map((z) => z.name);
      case "Conn.Type": return connectionTypes.map((c) => c.name);
      case "Prot.Type": return protocolTypes.map((p) => p.name);
      case "C.Type": return CLIENT_TYPES;
      case "Package": return packages.map((p) => p.name);
      case "B.Status": return STATUSES;
      default: return [];
    }
  };

  const renderCell = (r: ImportRow, col: typeof COLUMNS[number]) => {
    const value = r[col.key] ?? "";
    const auto = r._autoFilled?.[col.key];
    const missing = MANDATORY.includes(col.key) && (col.key === "M.Bill" ? !(Number(value) > 0) : String(value).trim() === "");
    const conflict = col.key === "C.Code" && r._codeConflict;
    const cls = `h-7 text-xs min-w-[100px] ${auto ? "bg-muted/40" : ""} ${missing || conflict ? "border-destructive" : ""}`;

    if (col.type === "select") {
      const opts = optionsFor(col.key);
      return (
        <Select value={String(value)} onValueChange={(v) => updateCell(r._idx, col.key, v)}>
          <SelectTrigger className={cls}><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    const input = (
      <Input
        type={col.type === "number" ? "number" : "text"}
        className={cls}
        value={value}
        onChange={(e) => updateCell(r._idx, col.key, e.target.value)}
      />
    );

    if (conflict) {
      return (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                {input}
                <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              এই কোড ইতোমধ্যে ব্যবহৃত: <strong>{r._codeConflict?.existingName}</strong>। অন্য কোড দিন।
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return input;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="h-6 w-6" /> বাল্ক ক্লায়েন্ট ইমপোর্ট</h1>
        <Button variant="outline" onClick={loadUnmatchedUsers} disabled={autoLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${autoLoading ? "animate-spin" : ""}`} />
          {autoLoading ? "লোড হচ্ছে..." : "MikroTik থেকে রিফ্রেশ"}
        </Button>
      </div>

      <Collapsible open={instructionOpen} onOpenChange={setInstructionOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                {instructionOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Info className="h-4 w-4" />
                <CardTitle className="text-base">ইমপোর্ট নির্দেশনা</CardTitle>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>✅ MikroTik থেকে আনম্যাচড ইউজার অটো লোড হয়। Zone, Conn.Type, Prot.Type, C.Type, Package, M.Bill, Bill.Month, Join.Date, Exp.Date — সব config থেকে অটো ফিল হয়।</p>
              <p>⚪ অটো-ফিল করা সেলগুলো হালকা ব্যাকগ্রাউন্ডে দেখানো হয়। আপনি চাইলে edit করতে পারবেন।</p>
              <p>🔴 Mandatory ফিল্ড খালি থাকলে border লাল হয় এবং Import disabled থাকে।</p>
              <p>📋 (Opt.) লেখা কলামগুলো optional — না দিলেও সমস্যা নেই।</p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {rows.length > 0 && (
        <Collapsible open={bulkOpen} onOpenChange={setBulkOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                <div className="flex items-center gap-2">
                  {bulkOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Wand2 className="h-4 w-4" />
                  <CardTitle className="text-base">একসাথে সেট করুন (Bulk Set)</CardTitle>
                  <Badge variant="secondary" className="ml-2">{selectedCount} সিলেক্টেড</Badge>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {BULK_FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-xs">{f.label}</Label>
                      {f.type === "select" ? (
                        <Select value={bulkValues[f.key] || ""} onValueChange={(v) => setBulkValue(f.key, v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {optionsFor(f.key).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={f.type === "month" ? "month" : f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                          min={f.type === "number" ? 1 : undefined}
                          max={f.type === "number" ? 31 : undefined}
                          className="h-8 text-xs"
                          value={bulkValues[f.key] || ""}
                          onChange={(e) => setBulkValue(f.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
                  <Button size="sm" onClick={applyBulk} disabled={selectedCount === 0}>
                    <Wand2 className="h-4 w-4 mr-1" /> Apply to Selected ({selectedCount})
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetSelectedToOriginal} disabled={selectedCount === 0}>
                    <Undo2 className="h-4 w-4 mr-1" /> Reset Selected to Original
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearBulk}>
                    Clear Form
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleAll(!allSelected)}>
                    {allSelected ? "Unselect All" : "Select All Visible"}
                  </Button>
                  {selectedCount === 0 && (
                    <span className="text-xs text-muted-foreground">আগে রো select করুন (টেবিলের প্রথম কলামে)</span>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={downloadSample}><Download className="h-4 w-4 mr-1" /> স্যাম্পল এক্সেল</Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" /> আপলোড (Excel)</Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            {rows.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={downloadEdited}><Download className="h-4 w-4 mr-1" /> এডিটেড ডাটা</Button>
                <Button variant="outline" size="sm" onClick={() => { setRows([]); toast.info("সব ক্লিয়ার হয়েছে"); }}><Trash2 className="h-4 w-4 mr-1" /> সব মুছুন</Button>
                <Button size="sm" onClick={importAll} disabled={importing || invalidCount > 0 || conflictCount > 0}>
                  <CheckCircle className="h-4 w-4 mr-1" /> সব ইমপোর্ট করুন ({rows.length})
                </Button>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> {invalidCount} টি সারিতে সমস্যা
                  </Badge>
                )}
                {conflictCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> {conflictCount} টি Client Code ইতোমধ্যে ব্যবহৃত
                  </Badge>
                )}
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>{autoLoading ? "MikroTik থেকে লোড হচ্ছে..." : "কোনো আনম্যাচড MikroTik ইউজার নেই"}</p>
              <p className="text-xs mt-1">অথবা Excel ফাইল আপলোড করুন</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(c) => toggleAll(!!c)}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-10">#</TableHead>
                    {COLUMNS.map((col) => (
                      <TableHead key={col.key} className="min-w-[100px] text-xs whitespace-nowrap">
                        {col.label}
                        {col.optional ? <span className="text-muted-foreground"> (Opt.)</span> : MANDATORY.includes(col.key) ? <span className="text-destructive"> *</span> : null}
                      </TableHead>
                    ))}
                    <TableHead>অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r._idx} className={!isRowValid(r) ? "bg-destructive/5" : r._selected ? "bg-primary/5" : ""}>
                      <TableCell className="p-1">
                        <Checkbox
                          checked={!!r._selected}
                          onCheckedChange={(c) => toggleRow(r._idx, !!c)}
                          aria-label={`Select row ${i + 1}`}
                        />
                      </TableCell>
                      <TableCell className="text-xs">{i + 1}</TableCell>
                      {COLUMNS.map((col) => (
                        <TableCell key={col.key} className="p-1">{renderCell(r, col)}</TableCell>
                      ))}
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRow(r._idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-3 text-sm text-muted-foreground">মোট: {rows.length} টি সারি {invalidCount > 0 && <span className="text-destructive">| {invalidCount} টি অসম্পূর্ণ</span>}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
