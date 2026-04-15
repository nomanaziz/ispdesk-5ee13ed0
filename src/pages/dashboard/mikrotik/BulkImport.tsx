import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Download, Upload, Trash2, FileSpreadsheet, ChevronDown, ChevronRight, Info, CheckCircle, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

const SAMPLE_COLUMNS = [
  "C.Code", "Name", "Mobile", "Email", "NationalID", "Address", "Zone", "Conn.Type",
  "Server", "Prot.Type", "Profile", "UserName", "Password", "R.Address", "C.Type",
  "Package", "B.Status", "M.Bill", "Bill.Month", "Join.Date", "Exp.Date",
  "DateOfBirth", "FatherName", "MotherName", "Occupation"
];

interface ImportRow {
  _idx: number;
  _mikrotik_client_id?: string;
  "C.Code": string;
  Name: string;
  Mobile: string;
  Email: string;
  NationalID: string;
  Address: string;
  Zone: string;
  "Conn.Type": string;
  Server: string;
  "Prot.Type": string;
  Profile: string;
  UserName: string;
  Password: string;
  "R.Address": string;
  "C.Type": string;
  Package: string;
  "B.Status": string;
  "M.Bill": number;
  "Bill.Month": string;
  "Join.Date": string;
  "Exp.Date": string;
  DateOfBirth: string;
  FatherName: string;
  MotherName: string;
  Occupation: string;
  [key: string]: any;
}

export default function BulkImport() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [instructionOpen, setInstructionOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);

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
      const { data, error } = await supabase.from("zones").select("id, name").order("name");
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

  // Auto-load unmatched MikroTik users
  const loadUnmatchedUsers = async () => {
    setAutoLoading(true);
    try {
      // Get all mikrotik_clients not yet exported
      const { data: mkClients, error: mkErr } = await supabase
        .from("mikrotik_clients")
        .select("*, mikrotik_devices(name)")
        .eq("exported", false)
        .order("created_at", { ascending: false });
      if (mkErr) throw mkErr;

      // Get all existing client usernames
      const { data: existingClients } = await supabase.from("clients").select("username");
      const existingUsernames = new Set(
        (existingClients || []).map((c: any) => c.username?.toLowerCase()).filter(Boolean)
      );

      // Filter out already-existing clients
      const unmatched = (mkClients || []).filter(
        (mc: any) => !existingUsernames.has(mc.name?.toLowerCase())
      );

      if (unmatched.length === 0) {
        toast.info("সকল MikroTik ইউজার ইতোমধ্যে ক্লায়েন্ট লিস্টে আছে");
        setAutoLoading(false);
        return;
      }

      // Map to import rows with auto-populated fields
      const mapped: ImportRow[] = unmatched.map((mc: any, idx: number) => {
        const matchedPkg = packages.find(p => p.mikrotik_profile === mc.profile);
        const serverName = mc.mikrotik_devices?.name || mc.server_name || "";
        return {
          _idx: idx,
          _mikrotik_client_id: mc.id,
          "C.Code": mc.name || "",
          Name: "",
          Mobile: "",
          Email: "",
          NationalID: "",
          Address: "",
          Zone: "",
          "Conn.Type": "",
          Server: serverName,
          "Prot.Type": mc.service || "pppoe",
          Profile: mc.profile || "",
          UserName: mc.name || "",
          Password: mc.password || "",
          "R.Address": mc.remote_address || "",
          "C.Type": "Home",
          Package: matchedPkg?.name || "",
          "B.Status": "Active",
          "M.Bill": matchedPkg?.price || 500,
          "Bill.Month": "",
          "Join.Date": new Date().toISOString().split("T")[0],
          "Exp.Date": "",
          DateOfBirth: "",
          FatherName: "",
          MotherName: "",
          Occupation: "",
        };
      });

      setRows(mapped);
      toast.success(`${mapped.length} জন আনম্যাচড MikroTik ইউজার লোড হয়েছে`);
    } catch (e: any) {
      toast.error("লোড ব্যর্থ: " + e.message);
    } finally {
      setAutoLoading(false);
    }
  };

  // Auto-load on mount
  useEffect(() => {
    if (packages.length > 0) {
      loadUnmatchedUsers();
    }
  }, [packages]);

  const downloadSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([SAMPLE_COLUMNS, SAMPLE_COLUMNS.map(() => "")]);
    ws["!cols"] = SAMPLE_COLUMNS.map(() => ({ wch: 16 }));
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
        _idx: idx + rows.length,
        ...row,
      }));

      let warnings = 0;
      parsed.forEach((r) => {
        const pkg = packages.find((p) => p.name === r.Package);
        if (r.Package && !pkg) warnings++;
        if (r.Profile && pkg?.mikrotik_profile && r.Profile !== pkg.mikrotik_profile) warnings++;
      });
      if (warnings > 0) toast.warning(`${warnings} টি সারিতে প্যাকেজ/প্রোফাইল মিসম্যাচ পাওয়া গেছে`);

      setRows(prev => [...prev, ...parsed]);
      toast.success(`${parsed.length} টি সারি লোড হয়েছে`);
    };
    reader.readAsBinaryString(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const deleteRow = (idx: number) => setRows((prev) => prev.filter((r) => r._idx !== idx));

  const downloadEdited = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map(({ _idx, _mikrotik_client_id, ...rest }) => rest));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Edited Data");
    XLSX.writeFile(wb, "edited_import_data.xlsx");
    toast.success("এডিটেড ডাটা ডাউনলোড হয়েছে");
  };

  const importAll = async () => {
    if (rows.length === 0) { toast.error("ইমপোর্ট করার ডাটা নেই"); return; }
    setImporting(true);
    try {
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
          joining_date: r["Join.Date"] || null,
          expire_date: r["Exp.Date"] || null,
          date_of_birth: r.DateOfBirth || null,
          father_name: r.FatherName || null,
          mother_name: r.MotherName || null,
          occupation: r.Occupation || null,
          status: "active",
        };
      });

      const { error } = await supabase.from("clients").insert(clientsToInsert);
      if (error) throw error;

      // Mark mikrotik_clients as exported
      const mkIds = rows.map(r => r._mikrotik_client_id).filter(Boolean);
      if (mkIds.length > 0) {
        await supabase
          .from("mikrotik_clients")
          .update({ exported: true, exported_to: "client_list" })
          .in("id", mkIds);
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

  const updateCell = (idx: number, key: string, value: string) => {
    setRows((prev) => prev.map((r) => (r._idx === idx ? { ...r, [key]: value } : r)));
  };

  const displayCols = SAMPLE_COLUMNS.slice(0, 15);

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
              <p>✅ এই পেজে MikroTik থেকে সিঙ্ক করা ইউজার যারা ক্লায়েন্ট লিস্টে নেই, তারা অটো লোড হবে।</p>
              <p>✅ Client Code, UserName, Password, Server, Profile, R.Address অটো পূরণ হবে।</p>
              <p>✅ Package ও M.Bill প্রোফাইল অনুযায়ী অটো ম্যাচ হবে (ডিফল্ট ৫০০ টাকা)।</p>
              <p>📋 এছাড়াও Excel আপলোড করেও ক্লায়েন্ট যোগ করতে পারবেন।</p>
              <p>📥 "সব ইমপোর্ট করুন" বাটনে ক্লিক করলে ক্লায়েন্ট লিস্টে যোগ হবে এবং MikroTik থেকে exported মার্ক হবে।</p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
                <Button size="sm" onClick={importAll} disabled={importing}><CheckCircle className="h-4 w-4 mr-1" /> সব ইমপোর্ট করুন ({rows.length})</Button>
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
                    <TableHead className="w-10">#</TableHead>
                    {displayCols.map((col) => <TableHead key={col} className="min-w-[100px] text-xs">{col}</TableHead>)}
                    <TableHead>অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r._idx}>
                      <TableCell className="text-xs">{i + 1}</TableCell>
                      {displayCols.map((col) => (
                        <TableCell key={col} className="p-1">
                          <Input
                            className="h-7 text-xs min-w-[80px]"
                            value={r[col] || ""}
                            onChange={(e) => updateCell(r._idx, col, e.target.value)}
                          />
                        </TableCell>
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
              <div className="mt-3 text-sm text-muted-foreground">মোট: {rows.length} টি সারি</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
