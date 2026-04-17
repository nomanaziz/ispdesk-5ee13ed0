import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Server, Search, Power, PowerOff, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function ResellerMikrotikUsers() {
  const { customer } = usePortalAuth();
  const qc = useQueryClient();
  // For sub-users, use parent reseller id; otherwise their own id
  const popId = customer?.type === "reseller_sub" ? customer?.parent_reseller_id : customer?.sub;
  const [activeMt, setActiveMt] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});

  const { data: pop } = useQuery({
    queryKey: ["reseller_pop", popId],
    queryFn: async () => {
      if (!popId) return null;
      const { data } = await supabase.from("branch_managers").select("id, name, branch_id, pop_code").eq("id", popId).maybeSingle();
      return data;
    },
    enabled: !!popId,
  });

  const { data: mikrotiks = [] } = useQuery({
    queryKey: ["reseller_mikrotiks", popId, pop?.branch_id],
    queryFn: async () => {
      // Devices visible to this POP: either same branch_id, or directly transferred to
      const branchId = pop?.branch_id;
      const orFilters: string[] = [];
      if (branchId) orFilters.push(`branch_id.eq.${branchId}`);
      // also include any MT that has a transferred client to this POP
      const { data: transferredMtIds } = await supabase
        .from("mikrotik_clients")
        .select("transferred_to_mikrotik_id")
        .eq("transferred_to_pop_id", popId!)
        .not("transferred_to_mikrotik_id", "is", null);
      const ids = Array.from(new Set((transferredMtIds || []).map((r: any) => r.transferred_to_mikrotik_id).filter(Boolean)));

      let q = supabase.from("mikrotik_devices").select("id, name, ip_address, status").order("name");
      if (orFilters.length > 0 && ids.length > 0) {
        q = q.or(`${orFilters.join(",")},id.in.(${ids.join(",")})`);
      } else if (orFilters.length > 0) {
        q = q.or(orFilters.join(","));
      } else if (ids.length > 0) {
        q = q.in("id", ids);
      } else {
        return [];
      }
      const { data } = await q;
      return data || [];
    },
    enabled: !!popId,
  });

  // Default-select first MT
  if (mikrotiks.length > 0 && !activeMt) {
    setActiveMt(mikrotiks[0].id);
  }

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["reseller_mt_users", popId, activeMt],
    queryFn: async () => {
      if (!activeMt) return [];
      const { data } = await supabase
        .from("mikrotik_clients")
        .select("*")
        .eq("transferred_to_pop_id", popId!)
        .eq("transferred_to_mikrotik_id", activeMt)
        .order("name");
      return data || [];
    },
    enabled: !!popId && !!activeMt,
  });

  const filtered = users.filter((u: any) =>
    [u.name, u.caller_id, u.profile, u.remote_address].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const next = currentStatus === "disabled" ? "active" : "disabled";
      const { error } = await supabase.from("mikrotik_clients").update({ status: next }).eq("id", id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      qc.invalidateQueries({ queryKey: ["reseller_mt_users"] });
      toast.success(next === "disabled" ? "ইউজার ডিজেবল হয়েছে" : "ইউজার এনাবল হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6" /> MikroTik ইউজার্স
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            POP: <span className="font-medium text-foreground">{pop?.name}</span>
            {pop?.pop_code && <Badge variant="outline" className="ml-2">{pop.pop_code}</Badge>}
          </p>
        </div>
      </div>

      {mikrotiks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Server className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>আপনার POP-এ এখনো কোনো MikroTik server assign করা হয়নি।</p>
            <p className="text-sm mt-1">Admin-এর সাথে যোগাযোগ করুন।</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">MikroTik সার্ভার নির্বাচন করুন</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeMt} onValueChange={setActiveMt}>
              <TabsList className="flex-wrap h-auto">
                {mikrotiks.map((m: any) => (
                  <TabsTrigger key={m.id} value={m.id} className="gap-2">
                    <span className={`h-2 w-2 rounded-full ${m.status === "online" ? "bg-green-500" : "bg-muted-foreground"}`} />
                    {m.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {mikrotiks.map((m: any) => (
                <TabsContent key={m.id} value={m.id} className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                      <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        placeholder="ইউজার সার্চ..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      মোট: <span className="font-medium text-foreground">{filtered.length}</span> জন
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>নাম</TableHead>
                          <TableHead>পাসওয়ার্ড</TableHead>
                          <TableHead>সার্ভিস</TableHead>
                          <TableHead>প্রোফাইল</TableHead>
                          <TableHead>Caller ID</TableHead>
                          <TableHead>রিমোট অ্যাড্রেস</TableHead>
                          <TableHead>স্ট্যাটাস</TableHead>
                          <TableHead className="text-right">অ্যাকশন</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow><TableCell colSpan={8} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                          <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">কোনো ইউজার ট্রান্সফার করা হয়নি</TableCell></TableRow>
                        ) : filtered.map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-xs">{showPwd[u.id] ? u.password : "••••••"}</span>
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowPwd((p) => ({ ...p, [u.id]: !p[u.id] }))}>
                                  {showPwd[u.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{u.service}</TableCell>
                            <TableCell>{u.profile}</TableCell>
                            <TableCell className="font-mono text-xs">{u.caller_id || "—"}</TableCell>
                            <TableCell className="font-mono text-xs">{u.remote_address || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={u.status === "disabled" ? "destructive" : "default"}>
                                {u.status || "active"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleStatus.mutate({ id: u.id, currentStatus: u.status || "active" })}
                                disabled={toggleStatus.isPending}
                              >
                                {u.status === "disabled" ? (
                                  <><Power className="h-4 w-4 mr-1" /> এনাবল</>
                                ) : (
                                  <><PowerOff className="h-4 w-4 mr-1" /> ডিজেবল</>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
