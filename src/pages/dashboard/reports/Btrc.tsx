import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type AllocatedIpType = "user_id" | "mac_address" | "ip_address";
type DateFormat = "YYYY-MM-DD" | "DD-MM-YYYY" | "MM-DD-YYYY" | "DD/MM/YYYY" | "MM/DD/YYYY";
type DistPoint = "DC" | "NOC" | "POP" | "Server";

const pad = (n: number) => String(n).padStart(2, "0");

function formatDate(d: string | Date | null | undefined, fmt: DateFormat): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return String(d);
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  switch (fmt) {
    case "YYYY-MM-DD": return `${y}-${m}-${day}`;
    case "DD-MM-YYYY": return `${day}-${m}-${y}`;
    case "MM-DD-YYYY": return `${m}-${day}-${y}`;
    case "DD/MM/YYYY": return `${day}/${m}/${y}`;
    case "MM/DD/YYYY": return `${m}/${day}/${y}`;
  }
}

function monthOptions(count = 12) {
  const list: { value: string; label: string; from: string; to: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const fmt = (x: Date) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    list.push({
      value: fmt(first),
      label: `${monthNames[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`,
      from: fmt(first),
      to: fmt(last),
    });
  }
  return list;
}

export default function Btrc() {
  const months = useMemo(() => monthOptions(12), []);
  const def = months[0];

  const [f, setF] = useState({
    month: def.value,
    user_type: "all" as "all" | "admin" | "reseller",
    pop_id: "all",
    server_id: "all",
    service: "all",
    client_type: "all",
    connection_type: "all",
    b_status: "all",
    zone_id: "all",
    sub_zone_id: "all",
    box_id: "all",
    distributed_point: "POP" as DistPoint,
    allocated_ip_type: "ip_address" as AllocatedIpType,
    date_format: "DD-MM-YYYY" as DateFormat,
    from: def.from,
    to: def.to,
  });
  const [a, setA] = useState(f);
  const [noticeOpen, setNoticeOpen] = useState(false);

  // Sync month -> from/to
  useEffect(() => {
    const m = months.find((x) => x.value === f.month);
    if (m && (f.from !== m.from || f.to !== m.to)) {
      setF((p) => ({ ...p, from: m.from, to: m.to }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.month]);

  const { data: zones } = useQuery({ queryKey: ["btrc-zones"], queryFn: async () => (await supabase.from("zones").select("id,name").eq("status", "active")).data || [] });
  const { data: subZones } = useQuery({
    queryKey: ["btrc-subzones", f.zone_id],
    enabled: f.zone_id !== "all",
    queryFn: async () => (await supabase.from("sub_zones").select("id,name").eq("zone_id", f.zone_id)).data || [],
  });
  const { data: boxes } = useQuery({
    queryKey: ["btrc-boxes", f.sub_zone_id],
    enabled: f.sub_zone_id !== "all",
    queryFn: async () => (await supabase.from("boxes").select("id,name").eq("sub_zone_id", f.sub_zone_id)).data || [],
  });
  const { data: resellers } = useQuery({
    queryKey: ["btrc-resellers"],
    queryFn: async () => (await supabase.from("branch_managers").select("id, name, branch_id").eq("status", "active").order("name")).data || [],
  });
  const { data: servers } = useQuery({
    queryKey: ["btrc-servers"],
    queryFn: async () => (await supabase.from("mikrotik_devices").select("id, name").eq("enabled", true).order("name")).data || [],
  });

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["rpt-btrc", a],
    queryFn: async () => {
      let q = supabase
        .from("clients")
        .select(`
          id, client_id, user_id, name, contact, email, address, monthly_bill,
          client_type, connection_type, billing_status, mikrotik_status,
          joining_date, left_date, status,
          zone_id, sub_zone_id, box_id, package_id, branch_id, mikrotik_id,
          remote_address, mac_address, static_ip,
          division_id, district_id, upazila_id,
          division:division_id(name),
          district:district_id(name),
          upazila:upazila_id(name),
          zone:zone_id(name)
        `)
        .lte("joining_date", a.to)
        .or(`left_date.is.null,left_date.gte.${a.from}`)
        .limit(10000);

      // Active in selected month: status active OR mikrotik enabled
      q = q.or("status.eq.active,mikrotik_status.eq.enabled");

      if (a.client_type !== "all") q = q.eq("client_type", a.client_type);
      if (a.connection_type !== "all") q = q.eq("connection_type", a.connection_type);
      if (a.b_status !== "all") q = q.eq("billing_status", a.b_status);
      if (a.zone_id !== "all") q = q.eq("zone_id", a.zone_id);
      if (a.sub_zone_id !== "all") q = q.eq("sub_zone_id", a.sub_zone_id);
      if (a.box_id !== "all") q = q.eq("box_id", a.box_id);
      if (a.server_id !== "all") q = q.eq("mikrotik_id", a.server_id);
      if (a.user_type === "reseller" && a.pop_id !== "all") {
        const branchId = (resellers || []).find((r: any) => r.id === a.pop_id)?.branch_id;
        if (branchId) q = q.eq("branch_id", branchId);
        else q = q.eq("id", "00000000-0000-0000-0000-000000000000");
      }

      const { data, error } = await q;
      if (error) {
        toast.error(error.message);
        return [];
      }

      // Side-load packages (avoid embed ambiguity between packages/isp_packages)
      const pkgIds = Array.from(new Set((data || []).map((c: any) => c.package_id).filter(Boolean)));
      const pkgMap: Record<string, { name?: string; olt_range?: string }> = {};
      if (pkgIds.length) {
        const { data: pkgs } = await supabase.from("packages").select("id,name,olt_range").in("id", pkgIds);
        (pkgs || []).forEach((p: any) => { pkgMap[p.id] = { name: p.name, olt_range: p.olt_range }; });
        // Fallback: any package_ids that point to isp_packages instead
        const missing = pkgIds.filter((id) => !pkgMap[id as string]);
        if (missing.length) {
          const { data: isp } = await supabase.from("isp_packages").select("id,name,bandwidth_down,bandwidth_up").in("id", missing);
          (isp || []).forEach((p: any) => {
            pkgMap[p.id] = {
              name: p.name,
              olt_range: p.bandwidth_down ? `${p.bandwidth_down}${p.bandwidth_up ? "/" + p.bandwidth_up : ""} Mbps` : undefined,
            };
          });
        }
      }

      const allocatedFor = (c: any) => {
        if (a.allocated_ip_type === "user_id") return c.user_id || c.client_id || "";
        if (a.allocated_ip_type === "mac_address") return c.mac_address || "";
        return c.remote_address || c.static_ip || "";
      };

      return (data || []).map((c: any, i: number) => {
        const isWired = !["wireless"].includes((c.connection_type || "").toLowerCase());
        const bill = Number(c.monthly_bill) || 0;
        const pkg = c.package_id ? pkgMap[c.package_id] : undefined;
        return {
          id: c.id,
          sn: i + 1,
          client_type: c.client_type ? c.client_type.charAt(0).toUpperCase() + c.client_type.slice(1) : "Home",
          connection_type: isWired ? "Wired" : "Wireless",
          client_name: c.name || "",
          bandwidth_distribution_point: a.distributed_point,
          connectivity_type: c.client_type === "corporate" ? "Dedicated" : "Shared",
          activation_date: formatDate(c.joining_date, a.date_format),
          bandwidth_allocation: pkg?.olt_range || pkg?.name || "",
          allocated_ip: allocatedFor(c),
          division: c.division?.name || "",
          district: c.district?.name || "",
          thana: c.upazila?.name || "",
          address: c.address || "",
          client_mobile: c.contact || "",
          client_email: c.email || "",
          selling_price_bdt_excluding_vat: bill > 0 ? bill : 1,
        };
      });
    },
  });

  const handleSync = async () => {
    toast.loading("Syncing clients & servers...");
    await refetch();
    toast.dismiss();
    toast.success("Sync complete");
  };

  return (
    <>
      <div className="mb-2 flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setNoticeOpen(true)}
          className="inline-flex items-center gap-1 text-destructive font-semibold hover:underline"
        >
          <Info className="h-4 w-4" /> N.B: Click here
        </button>
      </div>

      <ReportLayout
        title="BTRC Monthly Report"
        breadcrumb="Report > BTRC Monthly Report"
        enableExcel
        extraActions={
          <Button onClick={handleSync} size="sm" variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Sync Clients & Servers
          </Button>
        }
        filters={
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs">Previous Month</Label>
              <Select value={f.month} onValueChange={(v) => setF({ ...f, month: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">User Type</Label>
              <Select value={f.user_type} onValueChange={(v: any) => setF({ ...f, user_type: v, pop_id: "all" })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="admin">Admin / Customer</SelectItem>
                  <SelectItem value="reseller">MAC Reseller</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">POPs</Label>
              <Select value={f.pop_id} onValueChange={(v) => setF({ ...f, pop_id: v })} disabled={f.user_type !== "reseller"}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(resellers || []).map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Servers</Label>
              <Select value={f.server_id} onValueChange={(v) => setF({ ...f, server_id: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(servers || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Service</Label>
              <Select value={f.service} onValueChange={(v) => setF({ ...f, service: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="fiber">Fiber</SelectItem>
                  <SelectItem value="broadband">Broadband</SelectItem>
                  <SelectItem value="wireless">Wireless</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Client Type</Label>
              <Select value={f.client_type} onValueChange={(v) => setF({ ...f, client_type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Connection Type</Label>
              <Select value={f.connection_type} onValueChange={(v) => setF({ ...f, connection_type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="fiber">Fiber (Wired)</SelectItem>
                  <SelectItem value="broadband">Broadband (Wired)</SelectItem>
                  <SelectItem value="wireless">Wireless</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">B.Status</Label>
              <Select value={f.b_status} onValueChange={(v) => setF({ ...f, b_status: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Zone</Label>
              <Select value={f.zone_id} onValueChange={(v) => setF({ ...f, zone_id: v, sub_zone_id: "all", box_id: "all" })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(zones || []).map((z: any) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date Format</Label>
              <Select value={f.date_format} onValueChange={(v: any) => setF({ ...f, date_format: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                  <SelectItem value="MM-DD-YYYY">MM-DD-YYYY</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Allocated IP Type</Label>
              <Select value={f.allocated_ip_type} onValueChange={(v: any) => setF({ ...f, allocated_ip_type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_id">User ID</SelectItem>
                  <SelectItem value="mac_address">MAC Address</SelectItem>
                  <SelectItem value="ip_address">IP Address</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Distributed Point Type</Label>
              <Select value={f.distributed_point} onValueChange={(v: any) => setF({ ...f, distributed_point: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DC">DC</SelectItem>
                  <SelectItem value="NOC">NOC</SelectItem>
                  <SelectItem value="POP">POP</SelectItem>
                  <SelectItem value="Server">Server</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Sub Zone</Label>
              <Select value={f.sub_zone_id} onValueChange={(v) => setF({ ...f, sub_zone_id: v, box_id: "all" })} disabled={f.zone_id === "all"}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(subZones || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Box</Label>
              <Select value={f.box_id} onValueChange={(v) => setF({ ...f, box_id: v })} disabled={f.sub_zone_id === "all"}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(boxes || []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div />

            <div>
              <Label className="text-xs">Activation From</Label>
              <Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Activation To</Label>
              <Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="h-9" />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <Button onClick={() => setA({ ...f })} className="bg-[#2c5f6e] hover:bg-[#245069] h-9">Apply Filters</Button>
            </div>
          </div>
        }
        columns={[
          { key: "client_type", label: "client_type" },
          { key: "connection_type", label: "connection_type" },
          { key: "client_name", label: "client_name" },
          { key: "bandwidth_distribution_point", label: "bandwidth_distribution_point" },
          { key: "connectivity_type", label: "connectivity_type" },
          { key: "activation_date", label: "activation_date" },
          { key: "bandwidth_allocation", label: "bandwidth_allocation" },
          { key: "allocated_ip", label: "allocated_ip" },
          { key: "division", label: "division" },
          { key: "district", label: "district" },
          { key: "thana", label: "thana" },
          { key: "address", label: "address" },
          { key: "client_mobile", label: "client_mobile" },
          { key: "client_email", label: "client_email" },
          { key: "selling_price_bdt_excluding_vat", label: "selling_price_bdt_excluding_vat", align: "right" },
        ]}
        rows={rows}
        loading={isLoading}
        rowKey={(r) => r.id}
      />

      <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notice!</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed">
            আপনি যখন বিটিআরসি রিপোর্ট টি ডাউনলোড করবেন, এক্সেল এ এক্টিভেশন ডেট টি নাম্বার আকারে শো করবে।
            আপনি চাইলে এক্সেল সিট থেকে ডেট ফরমেট চেঞ্জ করে এক্টিভেশন ডেট দেখতে পারবেন।
            <br /><br />
            <strong>বিশেষ দ্রষ্টব্য:</strong> বিটিআরসি শুধুমাত্র এক্টিভেশন ডেট টি নাম্বার ফরম্যাট এই এক্সেপ্ট করে।
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
