import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownToLine, ArrowUpFromLine, Activity } from "lucide-react";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${u[i]}`;
}

function monthOffsetStart(offset: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function monthLabel(offset: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return d.toLocaleString("bn-BD", { month: "long", year: "numeric" });
}

export default function TopUsers() {
  const [offset, setOffset] = useState("0");
  const [sortKey, setSortKey] = useState<"download" | "upload" | "total">("download");
  const [search, setSearch] = useState("");

  const monthStart = monthOffsetStart(parseInt(offset));

  const { data, isLoading } = useQuery({
    queryKey: ["top-users", monthStart],
    queryFn: async () => {
      const { data: traffic } = await supabase
        .from("client_traffic_monthly")
        .select("client_id, username, total_download, total_upload")
        .eq("month", monthStart)
        .order("total_download", { ascending: false })
        .limit(200);
      const ids = (traffic ?? []).map((t: any) => t.client_id).filter(Boolean);
      const { data: clients } = ids.length
        ? await supabase.from("clients").select("id, name, contact, isp_packages(name)").in("id", ids)
        : { data: [] as any };
      const cMap = new Map((clients ?? []).map((c: any) => [c.id, c]));
      return (traffic ?? []).map((t: any) => {
        const c: any = cMap.get(t.client_id) || {};
        const dn = Number(t.total_download) || 0;
        const up = Number(t.total_upload) || 0;
        return {
          username: t.username || "—",
          name: c.name || t.username || "—",
          contact: c.contact || "—",
          package: c.isp_packages?.name || "—",
          download: dn,
          upload: up,
          total: dn + up,
        };
      });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = (data ?? []).slice();
    if (q) rows = rows.filter(r => [r.name, r.username, r.contact].some(v => (v || "").toLowerCase().includes(q)));
    rows.sort((a, b) => (b as any)[sortKey] - (a as any)[sortKey]);
    return rows;
  }, [data, search, sortKey]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/15 grid place-items-center">
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">টপ অ্যাক্টিভ ব্যবহারকারী</h1>
          <p className="text-xs text-muted-foreground">মাসিক ডাউনলোড/আপলোড অনুযায়ী সর্বোচ্চ ব্যবহারকারী</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={offset} onValueChange={setOffset}>
              <TabsList>
                <TabsTrigger value="0">এই মাস</TabsTrigger>
                <TabsTrigger value="1">গত মাস</TabsTrigger>
                <TabsTrigger value="2">২ মাস আগে</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={sortKey} onValueChange={(v: any) => setSortKey(v)}>
              <TabsList>
                <TabsTrigger value="download">ডাউনলোড</TabsTrigger>
                <TabsTrigger value="upload">আপলোড</TabsTrigger>
                <TabsTrigger value="total">টোটাল</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input placeholder="খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs ml-auto" />
          </div>
          <CardTitle className="text-sm font-semibold mt-2 text-muted-foreground">{monthLabel(parseInt(offset))} — {filtered.length} জন</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>নাম</TableHead>
                    <TableHead>ইউজারনেম</TableHead>
                    <TableHead>মোবাইল</TableHead>
                    <TableHead>প্যাকেজ</TableHead>
                    <TableHead className="text-right"><ArrowDownToLine className="h-3 w-3 inline" /> ডাউনলোড</TableHead>
                    <TableHead className="text-right"><ArrowUpFromLine className="h-3 w-3 inline" /> আপলোড</TableHead>
                    <TableHead className="text-right">টোটাল</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">কোনো ডেটা নেই</TableCell></TableRow>
                  ) : filtered.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{i + 1}</Badge></TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.username}</TableCell>
                      <TableCell className="text-xs">{r.contact}</TableCell>
                      <TableCell className="text-xs">{r.package}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600">{formatBytes(r.download)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sky-600">{formatBytes(r.upload)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{formatBytes(r.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
