import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Search, FileText, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function ChangeRequest() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["change-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_requests")
        .select("*, clients:client_id(client_id, name, contact, username, zones:zone_id(name), isp_packages:package_id(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, request }: { id: string; status: string; request: any }) => {
      const payload: any = { status };
      if (status === "approved") {
        payload.approved_at = new Date().toISOString();
      }
      const { error } = await supabase.from("change_requests").update(payload).eq("id", id);
      if (error) throw error;

      // Auto-apply side effects on approval
      if (status === "approved" && request?.client_id) {
        if (request.request_type === "date_extend" && request.new_value) {
          await supabase
            .from("clients")
            .update({ expire_date: request.new_value })
            .eq("id", request.client_id);
        } else if (request.request_type === "billing_date" && request.new_value) {
          // Set billing_date to current month with the requested day
          const day = Math.max(1, Math.min(28, Number(request.new_value)));
          const today = new Date();
          const target = new Date(today.getFullYear(), today.getMonth(), day);
          await supabase
            .from("clients")
            .update({ billing_date: target.toISOString().slice(0, 10) })
            .eq("id", request.client_id);
        }
        // package: admin manually updates profile via existing flow
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-requests"] });
      toast.success("রিকোয়েস্ট আপডেট হয়েছে");
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const filtered = useMemo(() => {
    let list = requests || [];
    if (filterType !== "all") list = list.filter((r: any) => r.request_type === filterType);
    if (filterStatus !== "all") list = list.filter((r: any) => r.status === filterStatus);
    if (filterFromDate) list = list.filter((r: any) => r.created_at >= filterFromDate);
    if (filterToDate) list = list.filter((r: any) => r.created_at <= filterToDate + "T23:59:59");
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((r: any) => r.clients?.name?.toLowerCase().includes(s) || r.clients?.client_id?.toLowerCase().includes(s));
    }
    return list;
  }, [requests, search, filterType, filterStatus, filterFromDate, filterToDate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Client <span className="text-sm font-normal text-muted-foreground">Change Request (Package & Exp. Date)</span></h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" /> Generate PDF</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 border rounded-lg bg-card">
        <div>
          <Label className="text-xs uppercase">Request Type</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব</SelectItem>
              <SelectItem value="package">Package</SelectItem>
              <SelectItem value="billing_date">Billing Date</SelectItem>
              <SelectItem value="date_extend">Date Extend</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase">Request Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase">From Date</Label>
          <Input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs uppercase">To Date</Label>
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

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/10">
              <TableHead className="text-xs">Code</TableHead>
              <TableHead className="text-xs">ID/IP</TableHead>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Mobile</TableHead>
              <TableHead className="text-xs">Zone</TableHead>
              <TableHead className="text-xs">Request Type</TableHead>
              <TableHead className="text-xs">Old Value</TableHead>
              <TableHead className="text-xs">New Value</TableHead>
              <TableHead className="text-xs">Reason</TableHead>
              <TableHead className="text-xs">Created Date</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={12} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="text-center py-8">কোনো চেঞ্জ রিকোয়েস্ট পাওয়া যায়নি</TableCell></TableRow>
            ) : (
              filtered.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.clients?.client_id || "-"}</TableCell>
                  <TableCell className="text-xs">{r.clients?.username || "-"}</TableCell>
                  <TableCell className="text-xs font-medium">{r.clients?.name || "-"}</TableCell>
                  <TableCell className="text-xs">{r.clients?.contact || "-"}</TableCell>
                  <TableCell className="text-xs">{r.clients?.zones?.name || "-"}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-[10px]">{r.request_type}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{r.old_value || "-"}</TableCell>
                  <TableCell className="text-xs">{r.new_value || "-"}</TableCell>
                  <TableCell className="text-xs">{r.reason || "-"}</TableCell>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("bn-BD")}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-green-600" onClick={() => updateStatusMutation.mutate({ id: r.id, status: "approved", request: r })}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => updateStatusMutation.mutate({ id: r.id, status: "rejected", request: r })}>
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
