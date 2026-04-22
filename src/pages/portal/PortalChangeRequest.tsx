import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callPortal } from "@/lib/portalApi";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Send, Package, Calendar, CalendarPlus, Plus, X, Info } from "lucide-react";
import { toast } from "sonner";

type ReqType = "package" | "billing_date" | "date_extend";

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return String(d); }
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
    cancelled: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <Badge variant="outline" className={`${map[status] || ""} text-[10px] capitalize`}>
      {status === "pending" ? "Requested" : status}
    </Badge>
  );
};

const PortalChangeRequest = () => {
  const { customer } = usePortalAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [tab, setTab] = useState<ReqType>("package");
  const [openDialog, setOpenDialog] = useState<ReqType | null>(null);

  const { data: dashData } = useQuery({
    queryKey: ["portal-dashboard", customer?.sub],
    queryFn: () => callPortal<any>("get_dashboard"),
    enabled: !!customer?.sub,
  });
  const client = dashData?.client;
  const currentPkg = client?.package;
  const currentBillingDay = client?.billing_date ? new Date(client.billing_date).getDate() : null;
  const currentExpire = client?.expire_date;

  const { data: pkgData } = useQuery({
    queryKey: ["portal-available-packages"],
    queryFn: () => callPortal<any>("list_available_packages"),
  });
  const availablePackages = pkgData?.packages || [];

  const { data: reqData, isLoading } = useQuery({
    queryKey: ["portal-change-requests"],
    queryFn: () => callPortal<any>("list_change_requests"),
  });
  const allRequests = reqData?.requests || [];

  const requestsByType = useMemo(() => {
    const out: Record<ReqType, any[]> = { package: [], billing_date: [], date_extend: [] };
    for (const r of allRequests) {
      if (r.request_type in out) out[r.request_type as ReqType].push(r);
    }
    return out;
  }, [allRequests]);

  const createMut = useMutation({
    mutationFn: (vars: { request_type: ReqType; old_value: string; new_value: string; reason?: string }) =>
      callPortal("create_change_request", vars),
    onSuccess: () => {
      toast.success(t("রিকোয়েস্ট পাঠানো হয়েছে", "Request submitted"));
      qc.invalidateQueries({ queryKey: ["portal-change-requests"] });
      setOpenDialog(null);
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => callPortal("cancel_change_request", { id }),
    onSuccess: () => {
      toast.success(t("রিকোয়েস্ট বাতিল হয়েছে", "Request cancelled"));
      qc.invalidateQueries({ queryKey: ["portal-change-requests"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <Card className="border-0 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 text-white shadow-lg">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Send className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold">{t("চেঞ্জ / আপডেট রিকোয়েস্ট", "Change / Update Request")}</h1>
            <p className="text-xs text-white/85 mt-0.5">
              {t(
                "প্যাকেজ পরিবর্তন, বিলিং তারিখ পরিবর্তন বা মেয়াদ বাড়ানোর জন্য অনুরোধ পাঠান। অ্যাডমিন অনুমোদন করলে কার্যকর হবে।",
                "Submit a request to change package, shift billing date, or extend expiry. Takes effect after admin approval."
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReqType)}>
        <TabsList className="grid grid-cols-3 w-full h-auto">
          <TabsTrigger value="package" className="flex flex-col sm:flex-row items-center gap-1.5 py-2.5 text-xs">
            <Package className="h-4 w-4 text-violet-600" /> {t("প্যাকেজ", "Package")}
          </TabsTrigger>
          <TabsTrigger value="billing_date" className="flex flex-col sm:flex-row items-center gap-1.5 py-2.5 text-xs">
            <Calendar className="h-4 w-4 text-emerald-600" /> {t("বিলিং ডেট", "Billing Date")}
          </TabsTrigger>
          <TabsTrigger value="date_extend" className="flex flex-col sm:flex-row items-center gap-1.5 py-2.5 text-xs">
            <CalendarPlus className="h-4 w-4 text-amber-600" /> {t("মেয়াদ বৃদ্ধি", "Extend Date")}
          </TabsTrigger>
        </TabsList>

        {/* TAB A: Package */}
        <TabsContent value="package" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-sm">{t("বর্তমান প্যাকেজ", "Current Package")}</CardTitle>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Badge className="bg-violet-100 text-violet-800 border-violet-200" variant="outline">
                      {currentPkg?.name || "—"}
                    </Badge>
                    {currentPkg?.bandwidth_down && (
                      <span className="text-xs text-muted-foreground">
                        {currentPkg.bandwidth_down}{currentPkg.bandwidth_up ? `/${currentPkg.bandwidth_up}` : ""} Mbps
                      </span>
                    )}
                    {currentPkg?.price && (
                      <span className="text-xs text-muted-foreground">৳{Number(currentPkg.price).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700"
                  onClick={() => setOpenDialog("package")}
                  disabled={requestsByType.package.some((r) => r.status === "pending")}
                >
                  <Plus className="h-4 w-4 mr-1" /> {t("চেঞ্জ রিকোয়েস্ট", "Change Request")}
                </Button>
              </div>
              {requestsByType.package.some((r) => r.status === "pending") && (
                <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {t("একটি pending রিকোয়েস্ট আছে — অনুমোদনের অপেক্ষায়।", "You have a pending request awaiting approval.")}
                </div>
              )}
            </CardHeader>
          </Card>
          <HistoryTable
            type="package"
            rows={requestsByType.package}
            isLoading={isLoading}
            onCancel={(id) => cancelMut.mutate(id)}
            cols={[
              { label: t("বর্তমান প্যাকেজ", "Current Package"), key: "old_value" },
              { label: t("রিকোয়েস্টেড প্যাকেজ", "Requested Package"), key: "new_value" },
            ]}
          />
        </TabsContent>

        {/* TAB B: Billing Date */}
        <TabsContent value="billing_date" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-sm">{t("বর্তমান বিলিং ডেট", "Current Billing Day")}</CardTitle>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200" variant="outline">
                      {currentBillingDay
                        ? t(`প্রতি মাসের ${currentBillingDay} তারিখ`, `Day ${currentBillingDay} of every month`)
                        : "—"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {t("পরবর্তী cycle থেকে কার্যকর হবে", "Effective from next cycle")}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setOpenDialog("billing_date")}
                  disabled={requestsByType.billing_date.some((r) => r.status === "pending")}
                >
                  <Plus className="h-4 w-4 mr-1" /> {t("চেঞ্জ রিকোয়েস্ট", "Change Request")}
                </Button>
              </div>
            </CardHeader>
          </Card>
          <HistoryTable
            type="billing_date"
            rows={requestsByType.billing_date}
            isLoading={isLoading}
            onCancel={(id) => cancelMut.mutate(id)}
            cols={[
              { label: t("বর্তমান দিন", "Current Day"), key: "old_value" },
              { label: t("নতুন দিন", "New Day"), key: "new_value" },
            ]}
          />
        </TabsContent>

        {/* TAB C: Date Extend */}
        <TabsContent value="date_extend" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-sm">{t("বর্তমান মেয়াদ", "Current Expiry")}</CardTitle>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200" variant="outline">
                      {fmtDate(currentExpire)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {t("শুধু এই মাসের জন্য মেয়াদ বাড়ানো", "Extend only for current month")}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => setOpenDialog("date_extend")}
                  disabled={requestsByType.date_extend.some((r) => r.status === "pending")}
                >
                  <Plus className="h-4 w-4 mr-1" /> {t("চেঞ্জ রিকোয়েস্ট", "Change Request")}
                </Button>
              </div>
            </CardHeader>
          </Card>
          <HistoryTable
            type="date_extend"
            rows={requestsByType.date_extend}
            isLoading={isLoading}
            onCancel={(id) => cancelMut.mutate(id)}
            cols={[
              { label: t("বর্তমান মেয়াদ", "Current Expiry"), key: "old_value", isDate: true },
              { label: t("নতুন মেয়াদ", "New Expiry"), key: "new_value", isDate: true },
            ]}
          />
        </TabsContent>
      </Tabs>

      {openDialog === "package" && (
        <PackageDialog
          packages={availablePackages}
          currentPkgId={currentPkg?.id}
          currentPkgName={currentPkg?.name}
          onClose={() => setOpenDialog(null)}
          onSubmit={(newPkg, reason) =>
            createMut.mutate({
              request_type: "package",
              old_value: currentPkg?.name || "",
              new_value: newPkg,
              reason,
            })
          }
          submitting={createMut.isPending}
        />
      )}

      {openDialog === "billing_date" && (
        <BillingDateDialog
          currentDay={currentBillingDay}
          onClose={() => setOpenDialog(null)}
          onSubmit={(newDay, reason) =>
            createMut.mutate({
              request_type: "billing_date",
              old_value: String(currentBillingDay || ""),
              new_value: String(newDay),
              reason,
            })
          }
          submitting={createMut.isPending}
        />
      )}

      {openDialog === "date_extend" && (
        <DateExtendDialog
          currentExpire={currentExpire}
          onClose={() => setOpenDialog(null)}
          onSubmit={(newDate, reason) =>
            createMut.mutate({
              request_type: "date_extend",
              old_value: currentExpire || "",
              new_value: newDate,
              reason,
            })
          }
          submitting={createMut.isPending}
        />
      )}
    </div>
  );
};

const HistoryTable = ({
  type, rows, isLoading, onCancel, cols,
}: {
  type: ReqType;
  rows: any[];
  isLoading: boolean;
  onCancel: (id: string) => void;
  cols: { label: string; key: string; isDate?: boolean }[];
}) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {cols.map((c) => (
                  <TableHead key={c.key} className="text-xs">{c.label}</TableHead>
                ))}
                <TableHead className="text-xs">Reason</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={cols.length + 4} className="text-center py-6 text-xs">লোড হচ্ছে...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={cols.length + 4} className="text-center py-6 text-xs text-muted-foreground">কোনো রিকোয়েস্ট নেই</TableCell></TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    {cols.map((c) => (
                      <TableCell key={c.key} className="text-xs">
                        {c.isDate ? fmtDate(r[c.key]) : (r[c.key] || "—")}
                      </TableCell>
                    ))}
                    <TableCell className="text-xs max-w-[160px] truncate" title={r.reason}>{r.reason || "—"}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.created_at)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell>
                      {r.status === "pending" && (
                        <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => onCancel(r.id)}>
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Dialogs ---

const PackageDialog = ({ packages, currentPkgId, currentPkgName, onClose, onSubmit, submitting }: any) => {
  const [pkgId, setPkgId] = useState("");
  const [reason, setReason] = useState("");
  const selected = packages.find((p: any) => p.id === pkgId);
  const eligible = packages.filter((p: any) => p.id !== currentPkgId);

  const submit = () => {
    if (!selected) { toast.error("প্যাকেজ নির্বাচন করুন"); return; }
    onSubmit(selected.name, reason.trim() || undefined);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>প্যাকেজ পরিবর্তন রিকোয়েস্ট</DialogTitle>
          <DialogDescription>
            বর্তমান: <strong>{currentPkgName || "—"}</strong>। নতুন প্যাকেজ নির্বাচন করুন।
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">নতুন প্যাকেজ</Label>
            <Select value={pkgId} onValueChange={setPkgId}>
              <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
              <SelectContent>
                {eligible.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.bandwidth_down ? `· ${p.bandwidth_down} Mbps` : ""} {p.price ? `· ৳${p.price}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">কারণ (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>বাতিল</Button>
          <Button onClick={submit} disabled={submitting || !pkgId} className="bg-violet-600 hover:bg-violet-700">
            পাঠান
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const BillingDateDialog = ({ currentDay, onClose, onSubmit, submitting }: any) => {
  const [day, setDay] = useState<string>("");
  const [reason, setReason] = useState("");

  const submit = () => {
    const n = Number(day);
    if (!n || n < 1 || n > 28) { toast.error("দিন ১-২৮ এর মধ্যে দিন"); return; }
    if (n === currentDay) { toast.error("নতুন দিন আলাদা হতে হবে"); return; }
    onSubmit(n, reason.trim() || undefined);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>বিলিং ডেট পরিবর্তন</DialogTitle>
          <DialogDescription>পরবর্তী cycle থেকে নতুন দিন কার্যকর হবে। (১-২৮)</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">নতুন বিলিং দিন</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger><SelectValue placeholder="দিন নির্বাচন করুন" /></SelectTrigger>
              <SelectContent className="max-h-[260px]">
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <SelectItem key={d} value={String(d)} disabled={d === currentDay}>
                    {d} {d === currentDay ? "(বর্তমান)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">কারণ (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>বাতিল</Button>
          <Button onClick={submit} disabled={submitting || !day} className="bg-emerald-600 hover:bg-emerald-700">
            পাঠান
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DateExtendDialog = ({ currentExpire, onClose, onSubmit, submitting }: any) => {
  const [date, setDate] = useState<string>("");
  const [reason, setReason] = useState("");

  const minDate = currentExpire
    ? new Date(new Date(currentExpire).getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const maxDate = currentExpire
    ? new Date(new Date(currentExpire).getTime() + 28 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    : new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const submit = () => {
    if (!date) { toast.error("নতুন তারিখ নির্বাচন করুন"); return; }
    if (!reason.trim()) { toast.error("কারণ আবশ্যক"); return; }
    if (date < minDate) { toast.error("নতুন তারিখ বর্তমান মেয়াদের পরে হতে হবে"); return; }
    if (date > maxDate) { toast.error("সর্বোচ্চ ২৮ দিন পর্যন্ত বাড়ানো যাবে"); return; }
    onSubmit(date, reason.trim());
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>মেয়াদ বৃদ্ধির রিকোয়েস্ট</DialogTitle>
          <DialogDescription>
            বর্তমান মেয়াদ: <strong>{fmtDate(currentExpire)}</strong>। শুধু চলতি মাসের জন্য (সর্বোচ্চ +২৮ দিন)।
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">নতুন মেয়াদ তারিখ</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={minDate} max={maxDate} />
          </div>
          <div>
            <Label className="text-xs">কারণ <span className="text-destructive">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} placeholder="যেমন: এই মাসে কিছু সমস্যার কারণে..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>বাতিল</Button>
          <Button onClick={submit} disabled={submitting} className="bg-amber-600 hover:bg-amber-700">পাঠান</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PortalChangeRequest;
