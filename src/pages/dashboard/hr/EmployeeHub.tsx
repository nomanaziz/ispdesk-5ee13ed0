import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Check, X, ExternalLink, CalendarDays, Wallet, UserX, ClipboardList, UserCog, Receipt, UtensilsCrossed } from "lucide-react";

type Counts = {
  leave: number; advance: number; resignation: number; requisition: number;
  profile: number; conveyance: number; meals_today: number;
};

function usePendingCounts(): Counts {
  const { data } = useQuery({
    queryKey: ["emp-hub-counts"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const head = { count: "exact" as const, head: true };
      const [a, b, c, d, e, f, g] = await Promise.all([
        supabase.from("leave_applications").select("id", head).eq("status", "pending"),
        supabase.from("salary_advance_requests" as any).select("id", head).eq("status", "pending"),
        supabase.from("resignation_requests" as any).select("id", head).eq("status", "pending"),
        supabase.from("requisitions" as any).select("id", head).eq("status", "pending").eq("request_type", "employee"),
        supabase.from("profile_change_requests" as any).select("id", head).eq("status", "pending"),
        supabase.from("conveyance_bills" as any).select("id", head).eq("status", "pending"),
        supabase.from("meal_orders" as any).select("id", head).eq("order_date", today).neq("status", "cancelled"),
      ]);
      return {
        leave: a.count || 0, advance: b.count || 0, resignation: c.count || 0,
        requisition: d.count || 0, profile: e.count || 0, conveyance: f.count || 0,
        meals_today: g.count || 0,
      } as Counts;
    },
  });
  return data || { leave: 0, advance: 0, resignation: 0, requisition: 0, profile: 0, conveyance: 0, meals_today: 0 };
}

const TABS = [
  { key: "leave",       label: "ছুটি",            icon: CalendarDays, color: "text-cyan-600" },
  { key: "advance",     label: "অগ্রিম বেতন",    icon: Wallet,       color: "text-orange-600" },
  { key: "resignation", label: "পদত্যাগ",         icon: UserX,        color: "text-red-600" },
  { key: "requisition", label: "রিকুইজিশন",       icon: ClipboardList,color: "text-indigo-600" },
  { key: "profile",     label: "প্রোফাইল পরিবর্তন",icon: UserCog,     color: "text-fuchsia-600" },
  { key: "conveyance",  label: "কনভেয়েন্স",       icon: Receipt,      color: "text-teal-600" },
  { key: "meals",       label: "খাবার (আজ)",      icon: UtensilsCrossed, color: "text-amber-600" },
] as const;

export default function EmployeeHub() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "leave";
  const counts = usePendingCounts();
  const setTab = (v: string) => { sp.set("tab", v); setSp(sp, { replace: true }); };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> কর্মী আবেদন কেন্দ্র
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">সব employee request এক জায়গায় — অনুমোদন, প্রত্যাখ্যান ও ইতিহাস।</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
            {TABS.map((t) => {
              const c = (counts as any)[t.key === "meals" ? "meals_today" : t.key] as number;
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition ${tab === t.key ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                  <Icon className={`h-5 w-5 ${t.color}`} />
                  <div className="text-xs font-medium">{t.label}</div>
                  <Badge variant={c > 0 ? "default" : "outline"} className="text-[10px] h-5">{c}</Badge>
                </button>
              );
            })}
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="hidden">{TABS.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}</TabsList>

            <TabsContent value="leave"><LeavePanel /></TabsContent>
            <TabsContent value="advance"><GenericPanel table="salary_advance_requests" qKey="hub-advance" cols={[
              { h: "পরিমাণ", get: (r: any) => `৳${Number(r.amount || 0).toLocaleString()}` },
              { h: "কারণ", get: (r: any) => r.reason || "—", className: "text-xs max-w-xs truncate" },
            ]} deepLink="/dashboard/hr/advance-salary" /></TabsContent>
            <TabsContent value="resignation"><GenericPanel table="resignation_requests" qKey="hub-resig" cols={[
              { h: "কার্যকর", get: (r: any) => r.effective_date || "—" },
              { h: "কারণ", get: (r: any) => r.reason || "—", className: "text-xs max-w-xs truncate" },
            ]} deepLink="/dashboard/hr/resignations" /></TabsContent>
            <TabsContent value="requisition"><GenericPanel table="requisitions" qKey="hub-req" extraFilter={(q) => q.eq("request_type", "employee")} cols={[
              { h: "আইটেম", get: (r: any) => `${r.item_name || "—"} (${r.category || "—"})`, className: "font-medium" },
              { h: "পরিমাণ", get: (r: any) => r.quantity || 1 },
              { h: "আনুমানিক", get: (r: any) => `৳${Number(r.estimated_cost || 0).toLocaleString()}` },
            ]} /></TabsContent>
            <TabsContent value="profile"><ProfilePanel /></TabsContent>
            <TabsContent value="conveyance"><GenericPanel table="conveyance_bills" qKey="hub-conv" cols={[
              { h: "তারিখ", get: (r: any) => r.bill_date },
              { h: "পরিমাণ", get: (r: any) => `৳${Number((r.fare_amount || 0) + (r.other_amount || 0)).toLocaleString()}` },
              { h: "কারণ", get: (r: any) => r.purpose || "—", className: "text-xs max-w-xs truncate" },
            ]} reviewedField="reviewed_at" deepLink="/dashboard/hr/conveyance-bills" /></TabsContent>
            <TabsContent value="meals"><MealsPanel /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Leave Panel ============
function LeavePanel() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["hub-leave"],
    queryFn: async () => {
      const { data } = await supabase.from("leave_applications")
        .select("*, employees(name, employee_id), leave_categories(name)")
        .order("created_at", { ascending: false }).limit(100);
      return (data as any[]) ?? [];
    },
  });
  const decide = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase.from("leave_applications").update({
        status: accept ? "approved" : "rejected", approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("সম্পন্ন"); qc.invalidateQueries({ queryKey: ["hub-leave"] }); qc.invalidateQueries({ queryKey: ["emp-hub-counts"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="space-y-2">
      <DeepLink href="/dashboard/hr/leave" label="ছুটি ম্যানেজমেন্ট পেজ" />
      <Table>
        <TableHeader><TableRow>
          <TableHead>তারিখ</TableHead><TableHead>কর্মী</TableHead><TableHead>ক্যাটাগরি</TableHead>
          <TableHead>শুরু</TableHead><TableHead>শেষ</TableHead><TableHead>দিন</TableHead>
          <TableHead>কারণ</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead className="w-32"></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {(data ?? []).map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("bn-BD")}</TableCell>
              <TableCell>{r.employees?.name} <span className="text-xs text-muted-foreground">({r.employees?.employee_id})</span></TableCell>
              <TableCell className="text-xs">{r.leave_categories?.name || "—"}</TableCell>
              <TableCell>{r.start_date}</TableCell>
              <TableCell>{r.end_date}</TableCell>
              <TableCell>{r.days}</TableCell>
              <TableCell className="text-xs max-w-xs truncate">{r.reason || "—"}</TableCell>
              <TableCell><StatusBadge s={r.status} /></TableCell>
              <TableCell>{r.status === "pending" && <ActionButtons onAccept={() => decide.mutate({ id: r.id, accept: true })} onReject={() => decide.mutate({ id: r.id, accept: false })} />}</TableCell>
            </TableRow>
          ))}
          {(data ?? []).length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-4">কোনো আবেদন নেই</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

// ============ Generic Panel ============
function GenericPanel({ table, qKey, cols, extraFilter, reviewedField, deepLink }: {
  table: string; qKey: string;
  cols: { h: string; get: (r: any) => any; className?: string }[];
  extraFilter?: (q: any) => any;
  reviewedField?: string;
  deepLink?: string;
}) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: [qKey],
    queryFn: async () => {
      let q = supabase.from(table as any).select("*, employees(name, employee_id)");
      if (extraFilter) q = extraFilter(q);
      const { data } = await q.order("created_at", { ascending: false }).limit(100);
      return (data as any[]) ?? [];
    },
  });
  const decide = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const update: any = { status: accept ? "approved" : "rejected" };
      update[reviewedField || "approved_at"] = new Date().toISOString();
      const { error } = await supabase.from(table as any).update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("সম্পন্ন"); qc.invalidateQueries({ queryKey: [qKey] }); qc.invalidateQueries({ queryKey: ["emp-hub-counts"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="space-y-2">
      {deepLink && <DeepLink href={deepLink} label="বিস্তারিত পেজ" />}
      <Table>
        <TableHeader><TableRow>
          <TableHead>তারিখ</TableHead><TableHead>কর্মী</TableHead>
          {cols.map((c) => <TableHead key={c.h}>{c.h}</TableHead>)}
          <TableHead>স্ট্যাটাস</TableHead><TableHead className="w-32"></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {(data ?? []).map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("bn-BD")}</TableCell>
              <TableCell>{r.employees?.name} <span className="text-xs text-muted-foreground">({r.employees?.employee_id})</span></TableCell>
              {cols.map((c) => <TableCell key={c.h} className={c.className}>{c.get(r)}</TableCell>)}
              <TableCell><StatusBadge s={r.status} /></TableCell>
              <TableCell>{r.status === "pending" && <ActionButtons onAccept={() => decide.mutate({ id: r.id, accept: true })} onReject={() => decide.mutate({ id: r.id, accept: false })} />}</TableCell>
            </TableRow>
          ))}
          {(data ?? []).length === 0 && <TableRow><TableCell colSpan={5 + cols.length} className="text-center text-muted-foreground py-4">কোনো আবেদন নেই</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

// ============ Profile change panel (special: applies the changes JSON) ============
function ProfilePanel() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["hub-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profile_change_requests" as any)
        .select("*, employees(name, employee_id)")
        .order("created_at", { ascending: false }).limit(100);
      return (data as any[]) ?? [];
    },
  });
  const decide = useMutation({
    mutationFn: async ({ id, accept, employee_id, changes }: any) => {
      if (accept) {
        const { error: upErr } = await supabase.from("employees").update(changes).eq("id", employee_id);
        if (upErr) throw upErr;
      }
      const { error } = await supabase.from("profile_change_requests" as any).update({
        status: accept ? "approved" : "rejected", reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("সম্পন্ন"); qc.invalidateQueries({ queryKey: ["hub-profile"] }); qc.invalidateQueries({ queryKey: ["emp-hub-counts"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="space-y-2">
      <DeepLink href="/dashboard/hr/profile-approvals" label="বিস্তারিত পেজ" />
      <Table>
        <TableHeader><TableRow>
          <TableHead>তারিখ</TableHead><TableHead>কর্মী</TableHead><TableHead>পরিবর্তন</TableHead>
          <TableHead>স্ট্যাটাস</TableHead><TableHead className="w-32"></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {(data ?? []).map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("bn-BD")}</TableCell>
              <TableCell>{r.employees?.name}</TableCell>
              <TableCell className="text-xs"><pre className="whitespace-pre-wrap max-w-md">{JSON.stringify(r.changes, null, 2)}</pre></TableCell>
              <TableCell><StatusBadge s={r.status} /></TableCell>
              <TableCell>{r.status === "pending" && <ActionButtons
                onAccept={() => decide.mutate({ id: r.id, accept: true, employee_id: r.employee_id, changes: r.changes })}
                onReject={() => decide.mutate({ id: r.id, accept: false })} />}
              </TableCell>
            </TableRow>
          ))}
          {(data ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">কোনো আবেদন নেই</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

// ============ Meals (today only, view-only summary) ============
function MealsPanel() {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = useQuery({
    queryKey: ["hub-meals", today],
    queryFn: async () => {
      const { data } = await supabase.from("meal_orders" as any)
        .select("*, employees(name, employee_id), catering_services(name)")
        .eq("order_date", today)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });
  const total = (data ?? []).reduce((s, r: any) => s + Number(r.price || 0), 0);
  return (
    <div className="space-y-2">
      <DeepLink href="/dashboard/hr/catering" label="ক্যাটারিং সেটআপ" />
      <div className="flex gap-3 text-sm">
        <Badge variant="outline">আজকের তারিখ: {today}</Badge>
        <Badge variant="default">মোট অর্ডার: {(data ?? []).length}</Badge>
        <Badge variant="secondary">মোট মূল্য: ৳{total.toLocaleString()}</Badge>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>কর্মী</TableHead><TableHead>সার্ভিস</TableHead><TableHead>সেট</TableHead>
          <TableHead>মূল্য</TableHead><TableHead>স্ট্যাটাস</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {(data ?? []).map((r: any) => (
            <TableRow key={r.id}>
              <TableCell>{r.employees?.name} <span className="text-xs text-muted-foreground">({r.employees?.employee_id})</span></TableCell>
              <TableCell className="text-xs">{r.catering_services?.name || "—"}</TableCell>
              <TableCell className="text-xs">{r.menu_snapshot?.set_name || "—"}{r.is_guest ? " (Guest)" : ""}</TableCell>
              <TableCell>৳{Number(r.price || 0).toLocaleString()}</TableCell>
              <TableCell><StatusBadge s={r.status} /></TableCell>
            </TableRow>
          ))}
          {(data ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">আজকের কোনো অর্ডার নেই</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

// ============ Shared widgets ============
function StatusBadge({ s }: { s: string }) {
  return <Badge variant={s === "approved" ? "default" : s === "rejected" ? "destructive" : "outline"}>{s}</Badge>;
}
function ActionButtons({ onAccept, onReject }: { onAccept: () => void; onReject: () => void }) {
  return (
    <div className="flex gap-1">
      <Button size="icon" variant="outline" onClick={onAccept}><Check className="h-4 w-4 text-green-600" /></Button>
      <Button size="icon" variant="outline" onClick={onReject}><X className="h-4 w-4 text-destructive" /></Button>
    </div>
  );
}
function DeepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link to={href} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
      <ExternalLink className="h-3 w-3" /> {label}
    </Link>
  );
}
