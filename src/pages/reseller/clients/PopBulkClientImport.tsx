import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPopScope } from "@/lib/popScope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Upload, Trash2, FileSpreadsheet, ChevronDown, AlertCircle, Edit, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ImportRow {
  __id: string;
  Name?: string;
  Mobile?: string;
  Email?: string;
  NationalID?: string;
  Address?: string;
  Zone?: string;
  ConnType?: string;
  Server?: string;
  ProtType?: string;
  Profile?: string;
  UserName?: string;
  Password?: string;
  CType?: string;
  Package?: string;
  ValidityDate?: string;
  BStatus?: string;
  MBill?: string | number;
  BillMonth?: string;
  JoinDate?: string;
  ExpDate?: string;
  __errors?: string[];
}

const COLUMNS: { key: keyof ImportRow; label: string; w?: string }[] = [
  { key: "Name", label: "Name" },
  { key: "Mobile", label: "Mobile" },
  { key: "Email", label: "Email" },
  { key: "NationalID", label: "NationalID" },
  { key: "Address", label: "Address" },
  { key: "Zone", label: "Zone" },
  { key: "ConnType", label: "Conn.Type" },
  { key: "Server", label: "Server" },
  { key: "ProtType", label: "Prot.Type" },
  { key: "Profile", label: "Profile" },
  { key: "UserName", label: "UserName" },
  { key: "Password", label: "Password" },
  { key: "CType", label: "C.Type" },
  { key: "Package", label: "Package" },
  { key: "ValidityDate", label: "Validity.Date" },
  { key: "BStatus", label: "B.Status" },
  { key: "MBill", label: "M.Bill" },
  { key: "BillMonth", label: "Bill.Month" },
  { key: "JoinDate", label: "Join.Date" },
  { key: "ExpDate", label: "Exp.Date" },
];

export default function PopBulkClientImport({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const { customer } = usePortalAuth();
  const { branchId } = getPopScope(customer);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [filter, setFilter] = useState<"all" | "valid" | "invalid">("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const tariffId = (customer as any)?.tariff_id;
  const { data: lookups } = useQuery({
    queryKey: ["pop-bulk-lookups", branchId, tariffId],
    enabled: !!branchId,
    queryFn: async () => {
      const [zonesRes, pkgsRes, clientsRes] = await Promise.all([
        supabase.from("zones").select("name").eq("branch_id", branchId!),
        tariffId
          ? supabase.from("reseller_tariff_packages").select("isp_packages(name)").eq("tariff_id", tariffId)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("clients").select("username").eq("branch_id", branchId!),
      ]);
      return {
        zones: (zonesRes.data || []).map((z: any) => z.name),
        packages: (pkgsRes.data || []).map((p: any) => p.isp_packages?.name).filter(Boolean),
        usernames: new Set((clientsRes.data || []).map((c: any) => (c.username || "").toLowerCase())),
      };
    },
  });

  const validateRow = (r: ImportRow, existingUsers: Set<string>, batchUsernames: Map<string, number>): string[] => {
    const errs: string[] = [];
    if (!r.Name?.trim()) errs.push("Name আবশ্যক");
    if (!r.Mobile?.trim()) errs.push("Mobile আবশ্যক");
    else if (!/^01\d{9}$/.test(r.Mobile.trim())) errs.push("Mobile format ভুল (01xxxxxxxxx)");
    if (r.UserName?.trim()) {
      const u = r.UserName.trim().toLowerCase();
      if (existingUsers.has(u)) errs.push("Username পূর্বে আছে");
      if ((batchUsernames.get(u) || 0) > 1) errs.push("Username file-এ duplicate");
    }
    if (lookups && r.Zone?.trim() && !lookups.zones.some(z => z.toLowerCase() === r.Zone!.trim().toLowerCase())) {
      errs.push(`Zone "${r.Zone}" POP-এ নেই`);
    }
    if (lookups && r.Package?.trim() && !lookups.packages.some(p => p.toLowerCase() === r.Package!.trim().toLowerCase())) {
      errs.push(`Package "${r.Package}" POP-এ নেই`);
    }
    if (r.JoinDate && isNaN(Date.parse(r.JoinDate))) errs.push("Join.Date invalid");
    if (r.ExpDate && isNaN(Date.parse(r.ExpDate))) errs.push("Exp.Date invalid");
    return errs;
  };

  const revalidate = (list: ImportRow[]): ImportRow[] => {
    const existing = lookups?.usernames || new Set<string>();
    const counts = new Map<string, number>();
    list.forEach(r => {
      const u = (r.UserName || "").trim().toLowerCase();
      if (u) counts.set(u, (counts.get(u) || 0) + 1);
    });
    return list.map(r => ({ ...r, __errors: validateRow(r, existing, counts) }));
  };

  const stats = useMemo(() => {
    const valid = rows.filter(r => (r.__errors?.length || 0) === 0).length;
    return { total: rows.length, valid, invalid: rows.length - valid };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (filter === "valid") return rows.filter(r => (r.__errors?.length || 0) === 0);
    if (filter === "invalid") return rows.filter(r => (r.__errors?.length || 0) > 0);
    return rows;
  }, [rows, filter]);

  const handleDownloadSample = () => {
    const sample = [{
      Name: "John Doe", Mobile: "01700000000", Email: "john@example.com", NationalID: "1234567890",
      Address: "Dhaka", Zone: lookups?.zones[0] || "Default Zone", ConnType: "PPPoE", Server: "MikroTik-1",
      ProtType: "PPP", Profile: "5M", UserName: "john01", Password: "pass123",
      CType: "Home", Package: lookups?.packages[0] || "5Mbps", ValidityDate: "30",
      BStatus: "Active", MBill: 500, BillMonth: new Date().toISOString().slice(0, 7),
      JoinDate: new Date().toISOString().slice(0, 10), ExpDate: "",
    }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sample), "Clients");
    const lookupSheet = [
      ["Zones (POP-এ available)"],
      ...((lookups?.zones || []).map(z => [z])),
      [""],
      ["Packages (POP-এ available)"],
      ...((lookups?.packages || []).map(p => [p])),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lookupSheet), "Lookup");
    XLSX.writeFile(wb, "bulk-clients-sample.xlsx");
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const mapped: ImportRow[] = json.map((r, i) => ({
          __id: `r-${Date.now()}-${i}`,
          Name: r.Name || r.name,
          Mobile: String(r.Mobile || r.mobile || ""),
          Email: r.Email || r.email,
          NationalID: String(r.NationalID || r.nid || ""),
          Address: r.Address || r.address,
          Zone: r.Zone || r.zone,
          ConnType: r.ConnType || r["Conn.Type"],
          Server: r.Server,
          ProtType: r.ProtType || r["Prot.Type"],
          Profile: r.Profile,
          UserName: r.UserName || r.username,
          Password: r.Password || r.password,
          CType: r.CType || r["C.Type"],
          Package: r.Package || r.package,
          ValidityDate: String(r.ValidityDate || r["Validity.Date"] || ""),
          BStatus: r.BStatus || r["B.Status"] || "Active",
          MBill: r.MBill || r["M.Bill"],
          BillMonth: r.BillMonth || r["Bill.Month"],
          JoinDate: r.JoinDate || r["Join.Date"],
          ExpDate: r.ExpDate || r["Exp.Date"],
        }));
        setRows(revalidate(mapped));
        toast.success(`${mapped.length} row upload হয়েছে`);
      } catch (err: any) {
        toast.error("File parse error: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleDownloadEdited = () => {
    const out = rows.map(({ __id, __errors, ...rest }) => rest);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(out), "Clients");
    XLSX.writeFile(wb, "bulk-clients-edited.xlsx");
  };

  const updateCell = (id: string, key: keyof ImportRow, value: string) => {
    setRows(prev => revalidate(prev.map(r => r.__id === id ? { ...r, [key]: value } : r)));
  };

  const deleteRow = (id: string) => {
    setRows(prev => revalidate(prev.filter(r => r.__id !== id)));
  };

  const transfer = useMutation({
    mutationFn: async () => {
      const valid = rows.filter(r => (r.__errors?.length || 0) === 0);
      if (valid.length === 0) throw new Error("Valid row নেই");
      if (!branchId) throw new Error("Branch নেই");

      const payload = valid.map((r) => ({
        name: r.Name!.trim(),
        contact: r.Mobile!.trim(),
        email: r.Email?.trim() || null,
        nid_number: r.NationalID?.trim() || null,
        address: r.Address?.trim() || null,
        username: r.UserName?.trim() || null,
        password: r.Password?.trim() || null,
        monthly_bill: Number(r.MBill) || 0,
        join_date: r.JoinDate || null,
        expire_date: r.ExpDate || null,
        billing_status: r.BStatus || "Active",
        branch_id: branchId,
        owner_scope: "pop" as any,
        status: "active",
      }));
      const { error, count } = await supabase.from("clients").insert(payload as any, { count: "exact" });
      if (error) throw error;
      return count || valid.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} client transfer হয়েছে`);
      setRows([]);
      setTimeout(() => navigate("/pop-admin/clients"), 800);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      {!embedded && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6" /> Bulk Clients Import
            </h1>
            <p className="text-sm text-muted-foreground">Excel sheet upload করে multiple client একবারে যোগ করুন</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/pop-admin/clients")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      )}

      <Collapsible>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  Learn How to Import Clients ...
                </span>
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="text-sm space-y-1.5 text-muted-foreground">
              <p>1. Upload-করা data ২৪ ঘণ্টা/page reload পরে আর available থাকবে না।</p>
              <p>2. MikroTik client available কিনা check করুন।</p>
              <p>3. Zone create করুন (Configuration → Zones)।</p>
              <p>4. Package create করুন (Configuration → Packages)।</p>
              <p>5. Bill Period activate করুন (System → Bill Period)।</p>
              <p>6. Employee create করুন (যদি দরকার থাকে)।</p>
              <p>7. Sample Excel download করুন।</p>
              <p>8. Sample fill করে upload করুন।</p>
              <p>9. Upload-এর পর invalid row edit/delete করুন।</p>
              <p>10. "Transfer to Client List" → save।</p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleDownloadSample} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Download Sample (Excel)
        </Button>
        <Button onClick={() => setRows([])} variant="outline" className="gap-2">
          <Trash2 className="h-4 w-4" /> Clear All
        </Button>
        <label>
          <Button asChild variant="outline" className="gap-2 cursor-pointer">
            <span>
              <Upload className="h-4 w-4" /> Upload Excel
              <input type="file" accept=".xlsx,.xls" hidden onChange={handleUpload} />
            </span>
          </Button>
        </label>
        <Button onClick={handleDownloadEdited} variant="outline" disabled={rows.length === 0} className="gap-2">
          <Download className="h-4 w-4" /> Download Edited Data
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary">Total: {stats.total}</Badge>
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 border" variant="outline">
            Valid: {stats.valid}
          </Badge>
          <Badge variant="destructive">Invalid: {stats.invalid}</Badge>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              <SelectItem value="valid">Only Valid</SelectItem>
              <SelectItem value="invalid">Only Invalid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNS.map(c => <TableHead key={c.key as string} className="whitespace-nowrap">{c.label}</TableHead>)}
                    <TableHead className="text-right sticky right-0 bg-card">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={COLUMNS.length + 1} className="text-center text-muted-foreground py-10">
                        কোনো data নেই — Sample download করুন, fill করুন, upload করুন
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredRows.map((r) => {
                    const isInvalid = (r.__errors?.length || 0) > 0;
                    const isEditing = editingId === r.__id;
                    return (
                      <Tooltip key={r.__id}>
                        <TooltipTrigger asChild>
                          <TableRow className={isInvalid ? "bg-destructive/10 hover:bg-destructive/15" : ""}>
                            {COLUMNS.map(c => (
                              <TableCell key={c.key as string} className="whitespace-nowrap text-xs">
                                {isEditing ? (
                                  <Input
                                    value={String(r[c.key] ?? "")}
                                    onChange={(e) => updateCell(r.__id, c.key, e.target.value)}
                                    className="h-7 text-xs min-w-[100px]"
                                  />
                                ) : (
                                  String(r[c.key] ?? "—")
                                )}
                              </TableCell>
                            ))}
                            <TableCell className="text-right sticky right-0 bg-inherit">
                              <div className="flex justify-end gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(isEditing ? null : r.__id)}>
                                  {isEditing ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Edit className="h-3.5 w-3.5" />}
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteRow(r.__id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        </TooltipTrigger>
                        {isInvalid && (
                          <TooltipContent side="left" className="max-w-xs">
                            <ul className="text-xs space-y-0.5">
                              {r.__errors!.map((e, i) => <li key={i}>• {e}</li>)}
                            </ul>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={() => transfer.mutate()}
          disabled={transfer.isPending || stats.valid === 0}
          className="gap-2"
        >
          <CheckCircle2 className="h-5 w-5" />
          {transfer.isPending ? "Saving..." : `Transfer ${stats.valid} Valid Client${stats.valid === 1 ? "" : "s"} to Client List`}
        </Button>
      </div>
    </div>
  );
}
