import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { callPortal } from "@/lib/portalApi";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Server, Search, Power, PowerOff, Eye, EyeOff, UserPlus, Layers, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ResellerMikrotikUsers() {
  const { customer } = usePortalAuth();
  const qc = useQueryClient();
  const popId = customer?.type === "reseller_sub" ? (customer as any)?.parent_reseller_id : customer?.sub;
  const branchId = (customer as any)?.branch_id;
  const [activeMt, setActiveMt] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [target, setTarget] = useState<any>(null);
  const [form, setForm] = useState({ name: "", contact: "", address: "", package_id: "", zone_id: "", joining_date: new Date().toISOString().slice(0, 10) });

  const serversQuery = useQuery({
    queryKey: ["pop_mt_servers", popId],
    queryFn: async () => await callPortal<{ pop: any; servers: any[] }>("get_pop_mikrotik_servers"),
    enabled: !!popId,
  });
  const pop = serversQuery.data?.pop;
  const mikrotiks = serversQuery.data?.servers || [];

  useEffect(() => {
    if (mikrotiks.length > 0 && !activeMt) setActiveMt(mikrotiks[0].id);
  }, [mikrotiks, activeMt]);

  const usersQuery = useQuery({
    queryKey: ["pop_mt_users", popId, activeMt],
    queryFn: async () =>
      await callPortal<{ users: any[]; tariff_packages: any[]; zones: any[] }>(
        "get_pop_mikrotik_users",
        { mikrotik_id: activeMt }
      ),
    enabled: !!popId && !!activeMt,
  });
  const users = usersQuery.data?.users || [];
  const tariffPackages = usersQuery.data?.tariff_packages || [];
  const zones = usersQuery.data?.zones || [];
  const isLoading = usersQuery.isLoading;

  const filtered = users.filter((u: any) =>
    [u.name, u.caller_id, u.profile, u.remote_address].some((v) => v?.toLowerCase().includes(search.toLowerCase())),
  );

  const toggleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const next = currentStatus === "disabled" ? "active" : "disabled";
      const { error } = await supabase.from("mikrotik_clients").update({ status: next }).eq("id", id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      qc.invalidateQueries({ queryKey: ["pop_mt_users"] });
      toast.success(next === "disabled" ? "ইউজার ডিজেবল হয়েছে" : "ইউজার এনাবল হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = (u: any) => {
    setTarget(u);
    setForm({
      name: u.name || "",
      contact: "",
      address: "",
      package_id: "",
      zone_id: "",
      joining_date: new Date().toISOString().slice(0, 10),
    });
    setCreateOpen(true);
  };

  const createClient = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error("No user selected");
      if (!branchId) throw new Error("POP-এর branch পাওয়া যায়নি");
      const pkg = tariffPackages.find((p: any) => p.id === form.package_id);
      const monthly = pkg?.selling_rate || null;
      const { data: created, error } = await supabase
        .from("clients")
        .insert({
          name: form.name,
          username: target.name,
          password: target.password,
          mac_address: target.caller_id || null,
          remote_address: target.remote_address || null,
          profile: target.profile || null,
          server_name: target.server_name || null,
          mikrotik_id: target.transferred_to_mikrotik_id || target.mikrotik_id || null,
          protocol_type: target.service || null,
          contact: form.contact || null,
          address: form.address || null,
          package_id: form.package_id || null,
          zone_id: form.zone_id || null,
          monthly_bill: monthly,
          joining_date: form.joining_date,
          status: "active",
          branch_id: branchId,
          client_id: "TMP-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
          documents: {},
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("mikrotik_clients").update({ linked_client_id: created.id, exported: true, exported_to: "pop_client" }).eq("id", target.id);
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reseller_mt_users"] });
      toast.success("ক্লায়েন্ট তৈরি হয়েছে");
      setCreateOpen(false);
    },
    onError: (e: any) => toast.error("তৈরি ব্যর্থ: " + e.message),
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
        <Button asChild variant="outline">
          <Link to="/pop-admin/mikrotik-users/bulk-create">
            <Layers className="h-4 w-4 mr-1" /> Bulk Client Import →
          </Link>
        </Button>
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
                          <TableHead>অবস্থা</TableHead>
                          <TableHead className="text-right">অ্যাকশন</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow><TableCell colSpan={8} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                          <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">কোনো ইউজার পাওয়া যায়নি</TableCell></TableRow>
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
                              {u.linked_client_id ? (
                                <Badge variant="default">Client</Badge>
                              ) : u.status === "disabled" ? (
                                <Badge variant="destructive">Disabled</Badge>
                              ) : u.transferred_to_pop_id === popId ? (
                                <Badge variant="secondary">Transferred</Badge>
                              ) : (
                                <Badge variant="outline">Available</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              {!u.linked_client_id && (
                                <Button variant="default" size="sm" onClick={() => openCreate(u)}>
                                  <UserPlus className="h-4 w-4 mr-1" /> ক্লায়েন্ট বানান
                                </Button>
                              )}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ক্লায়েন্ট তৈরি করুন</DialogTitle>
            <DialogDescription>
              MikroTik ইউজার <b>{target?.name}</b> থেকে full billing client বানানো হবে।
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label>পূর্ণ নাম *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>মোবাইল</Label>
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div>
              <Label>Joining Date</Label>
              <Input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>ঠিকানা</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>প্যাকেজ</Label>
              <Select value={form.package_id} onValueChange={(v) => setForm({ ...form, package_id: v })}>
                <SelectTrigger><SelectValue placeholder="সিলেক্ট করুন" /></SelectTrigger>
                <SelectContent>
                  {tariffPackages.map((p: any) => (
                    <SelectItem key={p.id} value={p.package_id}>
                      {p.isp_packages?.name} — ৳{p.selling_rate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Zone</Label>
              <Select value={form.zone_id} onValueChange={(v) => setForm({ ...form, zone_id: v })}>
                <SelectTrigger><SelectValue placeholder="সিলেক্ট করুন" /></SelectTrigger>
                <SelectContent>
                  {zones.map((z: any) => (
                    <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>বাতিল</Button>
            <Button onClick={() => createClient.mutate()} disabled={createClient.isPending || !form.name}>
              {createClient.isPending ? "তৈরি হচ্ছে..." : "তৈরি করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
