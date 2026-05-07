import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Info, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES = [
  { value: "asset",     label: "Asset"          },
  { value: "expense",   label: "Expense"        },
  { value: "income",    label: "Income"         },
  { value: "liability", label: "Liabilities"    },
  { value: "equity",    label: "Owner's Equity" },
] as const;

type AcctType = typeof TYPES[number]["value"];

// Subtypes shown for each type (same order as Galaxy Net reference)
const SUBTYPES: Record<AcctType, string[]> = {
  asset: [
    "Cash and Bank",
    "Depreciation and Amortization",
    "Expected Payments from Customers",
    "Inventory",
    "Money in Transit",
    "Other Long-Term Asset",
    "Other Short-Term Asset",
    "Property, Plant, Equipment",
    "Vendor Prepayments and Vendor Credits",
  ],
  expense: [
    "Cost of Goods Sold",
    "Discount",
    "Loss On Foreign Exchange",
    "Operating Expense",
    "Payment Processing Fee",
    "Payroll Expense",
    "Uncategorized Expense",
  ],
  income: [
    "Discount",
    "Gain On Foreign Exchange",
    "Income",
    "Other Income",
    "Uncategorized Income",
  ],
  liability: [
    "Credit Card",
    "Customer Prepayments and Customer Credits",
    "Due For Payroll",
    "Due to You and Other Business Owners",
    "Expected Payments to Vendors",
    "Loan and Line of Credit",
    "Other Long-Term Liability",
    "Other Short-Term Liability",
    "Sales Taxes",
  ],
  equity: [
    "Business Owner Contribution and Drawing",
    "Retained Earnings",
  ],
};

interface Account {
  id: string;
  code: string;
  name: string;
  type: AcctType;
  subtype: string | null;
  description: string | null;
  status: string;
  balance: number | null;
  parent_id: string | null;
}

const emptyForm = {
  code: "",
  name: "",
  type: "asset" as AcctType,
  subtype: "",
  description: "",
  status: "active",
  balance: 0,
};

export default function ChartOfAccounts() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<AcctType>("asset");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .order("code");
      if (error) throw error;
      return (data || []) as unknown as Account[];
    },
  });

  const counts = useMemo(() => {
    const list = accounts ?? [];
    const filt = (t: AcctType) =>
      list.filter(
        (a) =>
          a.type === t &&
          (statusFilter === "all" || a.status === statusFilter),
      ).length;
    return {
      asset: filt("asset"),
      expense: filt("expense"),
      income: filt("income"),
      liability: filt("liability"),
      equity: filt("equity"),
    };
  }, [accounts, statusFilter]);

  // Group accounts of active tab by subtype, in defined order
  const grouped = useMemo(() => {
    const list = (accounts ?? []).filter(
      (a) => a.type === activeTab && (statusFilter === "all" || a.status === statusFilter),
    );
    const order = SUBTYPES[activeTab];
    const map: Record<string, Account[]> = {};
    order.forEach((s) => (map[s] = []));
    for (const a of list) {
      const key = a.subtype && order.includes(a.subtype) ? a.subtype : (a.subtype || "Other");
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    // Order respecting SUBTYPES list, then any unknown subtypes appended
    const known = order.map((s) => [s, map[s] || []] as const);
    const extras = Object.entries(map)
      .filter(([k]) => !order.includes(k))
      .map(([k, v]) => [k, v] as const);
    return [...known, ...extras];
  }, [accounts, activeTab, statusFilter]);

  const openCreate = (subtype?: string) => {
    setEditId(null);
    setForm({ ...emptyForm, type: activeTab, subtype: subtype || "" });
    setOpen(true);
  };

  const openEdit = (a: Account) => {
    setEditId(a.id);
    setForm({
      code: a.code,
      name: a.name,
      type: a.type,
      subtype: a.subtype || "",
      description: a.description || "",
      status: a.status,
      balance: Number(a.balance) || 0,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type,
        subtype: form.subtype || null,
        description: form.description.trim() || null,
        status: form.status,
        balance: Number(form.balance) || 0,
      };
      if (!payload.code || !payload.name) throw new Error("কোড ও নাম দরকার");
      if (editId) {
        const { error } = await supabase.from("chart_of_accounts").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chart_of_accounts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      qc.invalidateQueries({ queryKey: ["accounting-dashboard"] });
      toast.success(editId ? "আপডেট হয়েছে" : "নতুন অ্যাকাউন্ট তৈরি হয়েছে");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chart_of_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      qc.invalidateQueries({ queryKey: ["accounting-dashboard"] });
      toast.success("মুছে ফেলা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Chart of Accounts</h1>
            <p className="text-xs text-muted-foreground">সকল অ্যাকাউন্টের তালিকা ও শ্রেণীবিভাগ</p>
          </div>
        </div>
        <Button onClick={() => openCreate()} className="gap-1">
          <Plus className="h-4 w-4" /> Create New Account
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase text-muted-foreground tracking-wider">Filter by status</span>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Type Tabs (pill style like reference) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {TYPES.map((t) => {
          const isActive = activeTab === t.value;
          const count = counts[t.value];
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setActiveTab(t.value)}
              className={cn(
                "rounded-full border h-9 px-4 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow"
                  : "bg-background text-foreground hover:bg-muted border-border",
              )}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grouped accounts */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([subtype, items]) => (
            <Card key={subtype} className="overflow-hidden border-border">
              {/* Section header (dark band) */}
              <div className="flex items-center justify-between bg-slate-800 text-white px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span>{subtype}</span>
                  <Info className="h-3.5 w-3.5 opacity-60" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-white hover:bg-white/10 gap-1"
                  onClick={() => openCreate(subtype)}
                >
                  <Plus className="h-3.5 w-3.5" /> Create New Account
                </Button>
              </div>
              {/* Rows */}
              {items.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">No Data Found</div>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((a, idx) => (
                    <div
                      key={a.id}
                      className={cn(
                        "grid grid-cols-[80px_1fr_auto_auto] items-center gap-3 px-4 py-2.5",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/30",
                      )}
                    >
                      <div className="font-mono text-sm">{a.code}</div>
                      <div className="text-sm font-medium text-amber-700 dark:text-amber-400 truncate">
                        {a.name}
                      </div>
                      <div className="text-xs text-muted-foreground max-w-md truncate hidden md:block">
                        {a.description || ""}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                          <Pencil className="h-3.5 w-3.5 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => {
                            if (confirm(`"${a.name}" delete করবেন?`)) del.mutate(a.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Account" : "Create New Account"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Code *</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. 1001"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Type *</label>
                <Select
                  value={form.type}
                  onValueChange={(v: AcctType) => setForm((f) => ({ ...f, type: v, subtype: "" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Cash"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Subtype (group)</label>
              <Select
                value={form.subtype || "__none"}
                onValueChange={(v) => setForm((f) => ({ ...f, subtype: v === "__none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None —</SelectItem>
                  {SUBTYPES[form.type].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Description</label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional explanation shown next to the account name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Opening Balance</label>
                <Input
                  type="number"
                  value={form.balance}
                  onChange={(e) => setForm((f) => ({ ...f, balance: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving..." : editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
