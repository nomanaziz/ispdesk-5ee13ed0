import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, ArrowLeft, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  username: string;
  password: string;
  profile: string | null;
  caller_id: string | null;
  remote_address: string | null;
  service: string | null;
  mikrotik_id: string | null;
  // editable
  name: string;
  contact: string;
  address: string;
  package_id: string;
  zone_id: string;
  joining_date: string;
  selected: boolean;
};

export default function ResellerMikrotikBulkCreate() {
  const { customer } = usePortalAuth();
  const qc = useQueryClient();
  const popId = customer?.type === "reseller_sub" ? (customer as any)?.parent_reseller_id : customer?.sub;
  const branchId = (customer as any)?.branch_id;
  const tariffId = (customer as any)?.tariff_id;
  const [rows, setRows] = useState<Row[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: tariffPackages = [] } = useQuery({
    queryKey: ["pop_tariff_packages_bulk", tariffId],
    queryFn: async () => {
      if (!tariffId) return [];
      const { data } = await supabase
        .from("reseller_tariff_packages")
        .select("id, package_id, selling_rate, isp_packages(id, name)")
        .eq("tariff_id", tariffId)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!tariffId,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["pop_zones_bulk", branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data } = await supabase.from("zones").select("id, name").eq("branch_id", branchId).order("name");
      return data || [];
    },
    enabled: !!branchId,
  });

  const { isLoading, refetch } = useQuery({
    queryKey: ["bulk_mt_transferred", popId],
    queryFn: async () => {
      if (!popId) return [];
      const { data } = await supabase
        .from("mikrotik_clients")
        .select("id, name, password, profile, caller_id, remote_address, service, transferred_to_mikrotik_id, linked_client_id")
        .eq("transferred_to_pop_id", popId)
        .is("linked_client_id", null)
        .order("name");
      const today = new Date().toISOString().slice(0, 10);
      const mapped: Row[] = (data || []).map((u: any) => ({
        id: u.id,
        username: u.name,
        password: u.password,
        profile: u.profile,
        caller_id: u.caller_id,
        remote_address: u.remote_address,
        service: u.service,
        mikrotik_id: u.transferred_to_mikrotik_id,
        name: u.name,
        contact: "",
        address: "",
        package_id: "",
        zone_id: "",
        joining_date: today,
        selected: false,
      }));
      setRows(mapped);
      return data || [];
    },
    enabled: !!popId,
  });

  const selectedCount = useMemo(() => rows.filter((r) => r.selected).length, [rows]);
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const toggleAll = () => setRows((rs) => rs.map((r) => ({ ...r, selected: !allSelected })));

  const bulkCreate = async () => {
    const picked = rows.filter((r) => r.selected && r.name.trim());
    if (picked.length === 0) {
      toast.error("কমপক্ষে একটি ইউজার select করুন এবং নাম দিন");
      return;
    }
    if (!branchId) {
      toast.error("POP-এর branch পাওয়া যায়নি");
      return;
    }
    setIsSaving(true);
    try {
      const payload = picked.map((r) => {
        const pkg = tariffPackages.find((p: any) => p.package_id === r.package_id);
        return {
          name: r.name,
          username: r.username,
          password: r.password,
          mac_address: r.caller_id || null,
          remote_address: r.remote_address || null,
          profile: r.profile || null,
          mikrotik_id: r.mikrotik_id || null,
          protocol_type: r.service || null,
          contact: r.contact || null,
          address: r.address || null,
          package_id: r.package_id || null,
          zone_id: r.zone_id || null,
          monthly_bill: pkg?.selling_rate || null,
          joining_date: r.joining_date,
          status: "active",
          branch_id: branchId,
          client_id: "TMP-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
          documents: {},
        };
      });
      const { data: inserted, error } = await supabase.from("clients").insert(payload).select("id, username");
      if (error) throw error;
      const idMap = new Map<string, string>();
      (inserted || []).forEach((row: any) => idMap.set(row.username?.toLowerCase(), row.id));
      await Promise.all(
        picked.map((r) => {
          const cid = idMap.get(r.username?.toLowerCase());
          return supabase
            .from("mikrotik_clients")
            .update({ linked_client_id: cid, exported: true, exported_to: "pop_client" })
            .eq("id", r.id);
        }),
      );
      toast.success(`${picked.length} জন ক্লায়েন্ট তৈরি হয়েছে`);
      qc.invalidateQueries({ queryKey: ["reseller_mt_users"] });
      refetch();
    } catch (e: any) {
      toast.error("তৈরি ব্যর্থ: " + (e.message || "অজানা"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" /> Bulk Client Import
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Transferred MikroTik users থেকে একসাথে multiple billing client তৈরি করুন।
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/pop-admin/mikrotik-users"><ArrowLeft className="h-4 w-4 mr-1" /> ফিরে যান</Link>
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> রিফ্রেশ
          </Button>
          <Button onClick={bulkCreate} disabled={isSaving || selectedCount === 0}>
            <Save className="h-4 w-4 mr-1" /> Selected তৈরি করুন ({selectedCount})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>মোট transferred users: {rows.length}</span>
            <Badge variant="outline">Linked client না থাকা ইউজার দেখানো হচ্ছে</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>UserName</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead className="min-w-[180px]">পূর্ণ নাম *</TableHead>
                  <TableHead className="min-w-[140px]">মোবাইল</TableHead>
                  <TableHead className="min-w-[180px]">ঠিকানা</TableHead>
                  <TableHead className="min-w-[160px]">প্যাকেজ</TableHead>
                  <TableHead className="min-w-[140px]">Zone</TableHead>
                  <TableHead className="min-w-[140px]">Joining Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    কোনো transferred MikroTik user পাওয়া যায়নি যা এখনো client হয়নি।
                  </TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox checked={r.selected} onCheckedChange={(c) => update(r.id, { selected: !!c })} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.username}</TableCell>
                    <TableCell className="text-xs">{r.profile || "—"}</TableCell>
                    <TableCell>
                      <Input value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} className="h-8" />
                    </TableCell>
                    <TableCell>
                      <Input value={r.contact} onChange={(e) => update(r.id, { contact: e.target.value })} className="h-8" />
                    </TableCell>
                    <TableCell>
                      <Input value={r.address} onChange={(e) => update(r.id, { address: e.target.value })} className="h-8" />
                    </TableCell>
                    <TableCell>
                      <Select value={r.package_id} onValueChange={(v) => update(r.id, { package_id: v })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="সিলেক্ট" /></SelectTrigger>
                        <SelectContent>
                          {tariffPackages.map((p: any) => (
                            <SelectItem key={p.id} value={p.package_id}>
                              {p.isp_packages?.name} — ৳{p.selling_rate}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={r.zone_id} onValueChange={(v) => update(r.id, { zone_id: v })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="সিলেক্ট" /></SelectTrigger>
                        <SelectContent>
                          {zones.map((z: any) => (
                            <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="date" value={r.joining_date} onChange={(e) => update(r.id, { joining_date: e.target.value })} className="h-8" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
