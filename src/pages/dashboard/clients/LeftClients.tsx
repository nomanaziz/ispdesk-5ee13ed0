import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Search, FileSpreadsheet, FileText } from "lucide-react";

export default function LeftClients() {
  const [search, setSearch] = useState("");
  const [filterZone, setFilterZone] = useState("all");
  const [filterConnType, setFilterConnType] = useState("all");
  const [filterClientType, setFilterClientType] = useState("all");
  const [filterPackage, setFilterPackage] = useState("all");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");

  const { data: clients, isLoading } = useQuery({
    queryKey: ["left-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, zones:zone_id(name), isp_packages:package_id(name, bandwidth_down)")
        .or("status.eq.left,billing_status.eq.Left")
        .order("left_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: zones } = useQuery({ queryKey: ["zones-active"], queryFn: async () => { const { data } = await supabase.from("zones").select("id, name").eq("status", "active"); return data || []; } });
  const { data: connectionTypes } = useQuery({ queryKey: ["connection-types-active"], queryFn: async () => { const { data } = await supabase.from("connection_types_config").select("id, name").eq("status", "active"); return data || []; } });
  const { data: clientTypes } = useQuery({ queryKey: ["client-types-active"], queryFn: async () => { const { data } = await supabase.from("client_types").select("id, name").eq("status", "active"); return data || []; } });
  const { data: packages } = useQuery({ queryKey: ["isp-packages-active"], queryFn: async () => { const { data } = await supabase.from("isp_packages").select("id, name").eq("status", "active"); return data || []; } });

  const filtered = useMemo(() => {
    let list = clients || [];
    if (filterZone !== "all") list = list.filter((c: any) => c.zone_id === filterZone);
    if (filterConnType !== "all") list = list.filter((c: any) => c.connection_type === filterConnType);
    if (filterClientType !== "all") list = list.filter((c: any) => c.client_type === filterClientType);
    if (filterPackage !== "all") list = list.filter((c: any) => c.package_id === filterPackage);
    if (filterFromDate) list = list.filter((c: any) => c.left_date && c.left_date >= filterFromDate);
    if (filterToDate) list = list.filter((c: any) => c.left_date && c.left_date <= filterToDate);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((c: any) => c.name?.toLowerCase().includes(s) || c.client_id?.toLowerCase().includes(s) || c.contact?.includes(s));
    }
    return list;
  }, [clients, search, filterZone, filterConnType, filterClientType, filterPackage, filterFromDate, filterToDate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Left Clients <span className="text-sm font-normal text-muted-foreground">View All Left Client</span></h1>
      </div>

      {/* Filters */}
      <div className="p-4 border rounded-lg bg-card space-y-3">
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm"><FileSpreadsheet className="h-4 w-4 mr-1" /> Generate Excel</Button>
          <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" /> Generate Pdf</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs uppercase">Zone</Label>
            <Select value={filterZone} onValueChange={setFilterZone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব</SelectItem>
                {zones?.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">Connection Type</Label>
            <Select value={filterConnType} onValueChange={setFilterConnType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব</SelectItem>
                {connectionTypes?.map(ct => <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">Client Type</Label>
            <Select value={filterClientType} onValueChange={setFilterClientType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব</SelectItem>
                {clientTypes?.map((ct: any) => <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">Package</Label>
            <Select value={filterPackage} onValueChange={setFilterPackage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব</SelectItem>
                {packages?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">From Left Date</Label>
            <Input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs uppercase">To Left Date</Label>
            <Input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs uppercase">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/10">
              <TableHead className="text-xs">C.Code</TableHead>
              <TableHead className="text-xs">ID/IP</TableHead>
              <TableHead className="text-xs">Client Name</TableHead>
              <TableHead className="text-xs">Mobile</TableHead>
              <TableHead className="text-xs">Zone</TableHead>
              <TableHead className="text-xs">Conn. Type</TableHead>
              <TableHead className="text-xs">Client Type</TableHead>
              <TableHead className="text-xs">R.Address</TableHead>
              <TableHead className="text-xs">Package/Speed</TableHead>
              <TableHead className="text-xs">M.Bill</TableHead>
              <TableHead className="text-xs">Server</TableHead>
              <TableHead className="text-xs">B.Status</TableHead>
              <TableHead className="text-xs">Left Date</TableHead>
              <TableHead className="text-xs">Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={14} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={14} className="text-center py-8">কোনো বন্ধ ক্লায়েন্ট পাওয়া যায়নি</TableCell></TableRow>
            ) : (
              filtered.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs font-medium">{c.client_id}</TableCell>
                  <TableCell className="text-xs">{c.username || c.user_id || "-"}</TableCell>
                  <TableCell className="text-xs font-medium">{c.name}</TableCell>
                  <TableCell className="text-xs">{c.contact}</TableCell>
                  <TableCell className="text-xs">{c.zones?.name || "-"}</TableCell>
                  <TableCell className="text-xs">{c.connection_type || "-"}</TableCell>
                  <TableCell className="text-xs">{c.client_type || "-"}</TableCell>
                  <TableCell className="text-xs">{c.remote_address || "-"}</TableCell>
                  <TableCell className="text-xs">{c.isp_packages ? `${c.isp_packages.name}/${c.isp_packages.bandwidth_down}Mb` : "-"}</TableCell>
                  <TableCell className="text-xs">{c.monthly_bill || 0}</TableCell>
                  <TableCell className="text-xs">{c.server_name || "-"}</TableCell>
                  <TableCell className="text-xs"><Badge variant="destructive" className="text-[10px]">Left</Badge></TableCell>
                  <TableCell className="text-xs">{c.left_date || "-"}</TableCell>
                  <TableCell className="text-xs">{c.left_reason || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
