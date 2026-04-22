import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowLeft, Mail, KeyRound, LogIn, Plus, ArrowLeftRight, Edit, MapPin, Phone,
} from "lucide-react";
import FundDeductionDialog from "@/components/branches/FundDeductionDialog";
import PasswordRegenerateDialog from "@/components/branches/PasswordRegenerateDialog";
import PopDebitHistory from "@/components/branches/PopDebitHistory";
import PopCreditHistory from "@/components/branches/PopCreditHistory";
import PopExportedClients from "@/components/branches/PopExportedClients";
import PopUnexportedClients from "@/components/branches/PopUnexportedClients";
import PopOnlineClients from "@/components/branches/PopOnlineClients";
import PopLeftClientsTab from "@/components/branches/PopLeftClientsTab";
import { loginAsUser } from "@/lib/impersonate";

export default function PopProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [fundOpen, setFundOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  const { data: pop, isLoading } = useQuery({
    queryKey: ["pop-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_managers")
        .select("*, reseller_tariffs(name, selling_rate, activation_days), branches(name)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["pop-clients", id, pop?.branch_id],
    enabled: !!pop?.branch_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, billing_status, status")
        .eq("branch_id", pop!.branch_id);
      return data ?? [];
    },
  });

  const { data: refundLogs } = useQuery({
    queryKey: ["pop-refund-logs", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_refund_logs")
        .select("*")
        .eq("pop_id", id!)
        .order("refunded_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["pop-transactions", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("pop_transactions")
        .select("*")
        .eq("pop_id", id!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const recoverMutation = useMutation({
    mutationFn: async (pppName: string) => {
      // Recover means: clear any portal-side mapping that may have been wrongly created
      // (MikroTik user untouched). For now this is a safe no-op + toast since unexported
      // means no client row exists. If a "left" client row exists with this username, reset it.
      const { error } = await supabase
        .from("clients")
        .update({ branch_id: null, status: "recovered" })
        .eq("username", pppName)
        .eq("status", "left");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recovered — admin can now reassign this user");
      qc.invalidateQueries({ queryKey: ["pop-unexported", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("branch_managers").update(patch).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pop-detail", id] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">লোড হচ্ছে...</div>;
  if (!pop) return <div className="p-6 text-muted-foreground">POP পাওয়া যায়নি</div>;

  const running = clients?.length ?? 0;
  const enabled = clients?.filter((c: any) => c.billing_status === "active" || c.billing_status === "enabled").length ?? 0;
  const disabled = clients?.filter((c: any) => c.billing_status === "disabled" || c.billing_status === "expired").length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/branches/managers")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold">POP Profile — {pop.company_name || pop.name}</h1>
        <Badge variant={pop.pop_type === "prepaid" ? "default" : "secondary"}>{pop.pop_type}</Badge>
        <Badge variant={pop.fund_started ? "default" : "secondary"}>
          {pop.fund_started ? "Fund Started" : "Fund Off"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={pop.logo_url || undefined} />
                <AvatarFallback className="text-xl">{(pop.name || "P")[0]}</AvatarFallback>
              </Avatar>
              <h2 className="mt-3 text-lg font-bold">{pop.company_name || pop.name}</h2>
              <p className="text-xs text-muted-foreground">POP Code: <span className="font-mono">{pop.pop_code}</span></p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Running" value={running} />
              <Stat label="Enabled" value={enabled} tone="text-emerald-600" />
              <Stat label="Disabled" value={disabled} tone="text-destructive" />
            </div>

            <div className="space-y-2 text-sm pt-2 border-t">
              <Row icon={<Mail className="h-4 w-4" />} label="Email" value={pop.email} />
              <Row icon={<Phone className="h-4 w-4" />} label="Mobile" value={pop.contact} />
              <Row icon={<MapPin className="h-4 w-4" />} label="Address" value={pop.address} />
              <Row label="Username" value={pop.username} mono />
              <Row label="Balance" value={`৳${Number(pop.balance || 0).toFixed(2)}`} />
              <Row label="Tariff" value={pop.reseller_tariffs?.name} />
              <Row label="Joined" value={pop.created_at ? new Date(pop.created_at).toLocaleDateString("bn-BD") : "-"} />
            </div>

            <div className="space-y-2 pt-2 border-t">
              {/* Common toggles */}
              <Toggle label="Set Prefix in Mikrotik" checked={pop.set_prefix_mikrotik} onChange={(v) => update.mutate({ set_prefix_mikrotik: v })} />
              <Toggle label="Fund Started" checked={pop.fund_started} onChange={(v) => update.mutate({ fund_started: v, fund_started_at: v ? new Date().toISOString() : null })} />
              <Toggle label="Is Locked" checked={pop.is_locked} onChange={(v) => update.mutate({ is_locked: v })} />

              {/* Postpaid-only */}
              {pop.pop_type === "postpaid" && (
                <>
                  <Toggle label="Client Create Permission" checked={pop.client_create_permission} onChange={(v) => update.mutate({ client_create_permission: v })} />
                  <Toggle label="Allow Negative Balance" checked={!!pop.allow_negative_balance} onChange={(v) => update.mutate({ allow_negative_balance: v })} />
                  <div className="flex items-center justify-between gap-2 py-1">
                    <label className="text-sm">Auto-disable Day of Month</label>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      defaultValue={pop.auto_disable_day ?? 10}
                      onBlur={(e) => {
                        const v = Math.max(1, Math.min(28, Number(e.target.value) || 10));
                        if (v !== (pop.auto_disable_day ?? 10)) update.mutate({ auto_disable_day: v });
                      }}
                      className="h-8 w-16 rounded border border-input bg-background px-2 text-sm text-right"
                    />
                  </div>
                </>
              )}

              {/* Prepaid-only */}
              {pop.pop_type === "prepaid" && (
                <Toggle
                  label="Credit Refund Policy"
                  checked={!!pop.credit_refund_policy}
                  onChange={(v) => update.mutate({ credit_refund_policy: v })}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/branches/edit-manager/${id}`)}><Edit className="h-3.5 w-3.5" /> Update</Button>
              <Button size="sm" variant="outline" onClick={() => toast.info("Coming soon")}><Mail className="h-3.5 w-3.5" /> Send Email</Button>
              <Button size="sm" variant="outline" onClick={() => update.mutate({ pop_type: pop.pop_type === "prepaid" ? "postpaid" : "prepaid" })}>
                <ArrowLeftRight className="h-3.5 w-3.5" /> Type Change
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPwdOpen(true)}><KeyRound className="h-3.5 w-3.5" /> Password</Button>
              <Button size="sm" variant="outline" onClick={() => loginAsUser("reseller", id!).then(() => toast.success("নতুন ট্যাবে লগইন হচ্ছে")).catch((e) => toast.error(e.message))}><LogIn className="h-3.5 w-3.5" /> Login as POP</Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/clients/add-client")}><Plus className="h-3.5 w-3.5" /> Add Client</Button>
              <Button size="sm" className="col-span-2" onClick={() => setFundOpen(true)}>Fund Add / Deduction</Button>
            </div>
          </CardContent>
        </Card>

        {/* Right tabs */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <Tabs defaultValue="info">
              <TabsList className="flex flex-wrap h-auto">
                <TabsTrigger value="info">POP Info</TabsTrigger>
                <TabsTrigger value="exported">Exported</TabsTrigger>
                <TabsTrigger value="unexported">Unexported</TabsTrigger>
                <TabsTrigger value="online">Online Clients</TabsTrigger>
                <TabsTrigger value="left">Left Clients</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="debit">Debit Transactions</TabsTrigger>
                <TabsTrigger value="credit">Credit Transactions</TabsTrigger>
                <TabsTrigger value="refunds">Credit Refunds ({refundLogs?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <Section title="Service Info">
                  <Field label="POP Type" value={pop.pop_type} />
                  <Field label="Tariff" value={pop.reseller_tariffs?.name} />
                  <Field label="Selling Rate" value={pop.reseller_tariffs?.selling_rate ? `৳${pop.reseller_tariffs.selling_rate}` : "-"} />
                  <Field label="Activation Days" value={pop.reseller_tariffs?.activation_days} />
                  <Field label="Min Balance" value={`৳${pop.min_balance ?? 0}`} />
                  <Field label="Min Recharge" value={`৳${pop.min_recharge ?? 0}`} />
                  {pop.pop_type === "prepaid" && (
                    <Field label="Credit Refund Policy" value={pop.credit_refund_policy ? "Enabled" : "Disabled"} />
                  )}
                  {pop.pop_type === "postpaid" && (
                    <>
                      <Field label="Allow Negative Balance" value={pop.allow_negative_balance ? "Yes" : "No"} />
                      <Field label="Auto-disable Day" value={pop.auto_disable_day ?? 10} />
                    </>
                  )}
                </Section>
                <Section title="Personal Info">
                  <Field label="Contact Person" value={pop.name} />
                  <Field label="Email" value={pop.email} />
                  <Field label="Mobile" value={pop.contact} />
                  <Field label="Phone" value={pop.phone} />
                  <Field label="National ID" value={pop.national_id || pop.nid_number} />
                  <Field label="Address" value={pop.address} />
                </Section>
                <Section title="Fund Info At A Glance">
                  <Field label="Current Balance" value={`৳${Number(pop.balance || 0).toFixed(2)}`} />
                  <Field label="Fund Started" value={pop.fund_started ? "Yes" : "No"} />
                  <Field label="Fund Started At" value={pop.fund_started_at ? new Date(pop.fund_started_at).toLocaleString("bn-BD") : "-"} />
                </Section>
              </TabsContent>

              <TabsContent value="exported" className="mt-4">
                <PopExportedClients popId={id!} branchId={pop.branch_id} />
              </TabsContent>

              <TabsContent value="unexported" className="mt-4">
                <PopUnexportedClients popId={id!} branchId={pop.branch_id} />
              </TabsContent>

              <TabsContent value="online" className="mt-4">
                <PopOnlineClients branchId={pop.branch_id} />
              </TabsContent>

              <TabsContent value="left" className="mt-4">
                <PopLeftClientsTab branchId={pop.branch_id} />
              </TabsContent>

              <TabsContent value="transactions" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance After</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs">{new Date(t.created_at).toLocaleString("bn-BD")}</TableCell>
                        <TableCell>
                          <Badge variant={t.type === "credit" || t.type === "fund_add" ? "default" : "destructive"}>{t.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">৳{Number(t.amount).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">৳{Number(t.balance_after ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.description || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {(!transactions || transactions.length === 0) && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">কোনো লেনদেন নেই</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="debit" className="mt-4">
                <PopDebitHistory branchId={pop.branch_id || undefined} popName={pop.name} />
              </TabsContent>

              <TabsContent value="credit" className="mt-4">
                <PopCreditHistory popId={id} popName={pop.name} mode="admin" />
              </TabsContent>

              <TabsContent value="refunds" className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">
                  Prepaid POP-এর client left/delete হলে unused দিনের টাকা automatic ফেরত। নিচে log:
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Daily Rate</TableHead>
                      <TableHead className="text-right">Refund Days</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refundLogs?.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{new Date(r.refunded_at).toLocaleString("bn-BD")}</TableCell>
                        <TableCell>
                          <div className="text-sm">{r.client_name || "-"}</div>
                          <div className="font-mono text-xs text-muted-foreground">{r.client_username || ""}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">৳{Number(r.daily_rate).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{r.refund_days}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600">+৳{Number(r.refund_amount).toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.reason || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {(!refundLogs || refundLogs.length === 0) && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">কোনো refund হয়নি</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="permissions" className="mt-4">
                <div className="text-sm text-muted-foreground mb-3">এই POP-এর জন্য allowed menu keys</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries((pop.permissions as any) || {})
                    .filter(([, v]) => v)
                    .map(([k]) => (
                      <Badge key={k} variant="outline" className="font-mono text-xs">{k}</Badge>
                    ))}
                  {Object.keys((pop.permissions as any) || {}).length === 0 && (
                    <span className="text-sm text-muted-foreground">কোনো পারমিশন সেট করা নেই</span>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <FundDeductionDialog open={fundOpen} onOpenChange={setFundOpen} pop={pop as any} />
      <PasswordRegenerateDialog open={pwdOpen} onOpenChange={setPwdOpen} pop={pop as any} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className={`text-lg font-bold ${tone || ""}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
function Row({ icon, label, value, mono }: { icon?: React.ReactNode; label: string; value: any; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground flex items-center gap-1.5">{icon}{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{value || "-"}</span>
    </div>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "-"}</span>
    </div>
  );
}
