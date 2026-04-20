import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { Banknote, Plus, Check, ChevronsUpDown, History } from "lucide-react";
import { cn } from "@/lib/utils";

type PopRow = {
  id: string;
  branch_id: string | null;
  name: string;
  pop_code: string | null;
  company_name: string | null;
  balance: number | null;
};

const PAYMENT_METHODS = ["Cash", "bKash", "Nagad", "Rocket", "Bank Transfer", "Cheque"];

export default function Funding() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [popPickerOpen, setPopPickerOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const initialForm = {
    pop_id: "",
    branch_id: "",
    funding_amount: 0,
    received_amount: 0,
    discount: 0,
    invoice_number: "",
    received_by: "",
    received_on: today,
    payment_method: "Cash",
    remarks: "",
  };
  const [form, setForm] = useState(initialForm);

  const { data: fundings, isLoading } = useQuery({
    queryKey: ["branch-funding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_funding")
        .select("*, branches(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: pops } = useQuery({
    queryKey: ["pops-with-branch"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_managers")
        .select("id, branch_id, name, pop_code, company_name, balance")
        .order("pop_code", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PopRow[];
    },
  });

  const { data: users } = useQuery({
    queryKey: ["receivers-employees"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name").order("name");
      return data ?? [];
    },
  });

  const selectedPop = useMemo(
    () => pops?.find((p) => p.id === form.pop_id),
    [pops, form.pop_id]
  );

  const due = Math.max(0, Number(form.funding_amount) - Number(form.received_amount) - Number(form.discount));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.pop_id) throw new Error("POP নির্বাচন করুন");
      if (!form.funding_amount || form.funding_amount <= 0) throw new Error("Funding amount দিন");
      if (form.received_amount < 0) throw new Error("Received amount valid নয়");

      const status = due > 0 ? "pending" : "paid";
      const { error } = await supabase.from("branch_funding").insert({
        branch_id: selectedPop?.branch_id ?? null,
        amount: form.funding_amount,
        received_amount: form.received_amount,
        discount: form.discount,
        due_amount: due,
        invoice_number: form.invoice_number || null,
        received_by: form.received_by || null,
        received_on: form.received_on,
        funding_date: form.received_on,
        payment_method: form.payment_method,
        remarks: form.remarks || null,
        description: form.remarks || null,
        type: "credit",
        trans_type: "fund",
        status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-funding"] });
      qc.invalidateQueries({ queryKey: ["pops-with-branch"] });
      toast.success("ফান্ড যোগ হয়েছে — POP balance আপডেট করা হয়েছে");
      setOpen(false);
      setForm(initialForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">রিসেলার ফান্ডিং</h1>
          <p className="text-sm text-muted-foreground">POP-কে ফান্ড দিন ও ফান্ডিং হিস্ট্রি দেখুন</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/dashboard/branches/funding-history">
              <History className="h-4 w-4 mr-1" /> Fund History
            </Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> ফান্ড যোগ করুন</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>নতুন ফান্ড এন্ট্রি</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Reseller / POP <span className="text-destructive">*</span></Label>
                  <Popover open={popPickerOpen} onOpenChange={setPopPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        {selectedPop
                          ? `[${selectedPop.pop_code ?? "----"}] ${selectedPop.name}${selectedPop.company_name ? " — " + selectedPop.company_name : ""}`
                          : "POP বাছাই করুন (code বা name দিয়ে search করুন)"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search by code or name…" />
                        <CommandList>
                          <CommandEmpty>কোনো POP পাওয়া যায়নি</CommandEmpty>
                          <CommandGroup>
                            {pops?.map((p) => {
                              const label = `[${p.pop_code ?? "----"}] ${p.name}${p.company_name ? " — " + p.company_name : ""}`;
                              return (
                                <CommandItem
                                  key={p.id}
                                  value={`${p.pop_code ?? ""} ${p.name} ${p.company_name ?? ""}`}
                                  onSelect={() => {
                                    setForm({ ...form, pop_id: p.id, branch_id: p.branch_id ?? "" });
                                    setPopPickerOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      form.pop_id === p.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-sm">{label}</span>
                                    <span className="text-xs text-muted-foreground">
                                      Balance: ৳{Number(p.balance ?? 0).toLocaleString("en-BD")}
                                    </span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Funding Amount (৳) <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.funding_amount || ""}
                    onChange={(e) => setForm({ ...form, funding_amount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Received Amount (৳)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.received_amount || ""}
                    onChange={(e) => setForm({ ...form, received_amount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Discount (৳)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.discount || ""}
                    onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Due (auto)</Label>
                  <Input value={`৳${due.toLocaleString("en-BD")}`} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label>Invoice Number (auto if blank)</Label>
                  <Input
                    placeholder="FND-…"
                    value={form.invoice_number}
                    onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Received Date</Label>
                  <Input
                    type="date"
                    value={form.received_on}
                    onChange={(e) => setForm({ ...form, received_on: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Received By</Label>
                  <Select value={form.received_by} onValueChange={(v) => setForm({ ...form, received_by: v })}>
                    <SelectTrigger><SelectValue placeholder="বাছাই করুন" /></SelectTrigger>
                    <SelectContent>
                      {users?.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Remarks</Label>
                  <Textarea
                    rows={2}
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
                    {save.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Banknote className="h-5 w-5" /> সাম্প্রতিক ফান্ডিং
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">লোড হচ্ছে...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>POP</TableHead>
                    <TableHead>Fund (৳)</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fundings?.map((f: any, i) => (
                    <TableRow key={f.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{f.invoice_number || "-"}</TableCell>
                      <TableCell>{f.branches?.name || "-"}</TableCell>
                      <TableCell className="font-mono">৳{Number(f.amount ?? 0).toLocaleString("en-BD")}</TableCell>
                      <TableCell className="font-mono">৳{Number(f.received_amount ?? 0).toLocaleString("en-BD")}</TableCell>
                      <TableCell className="font-mono">৳{Number(f.discount ?? 0).toLocaleString("en-BD")}</TableCell>
                      <TableCell className="font-mono">৳{Number(f.due_amount ?? 0).toLocaleString("en-BD")}</TableCell>
                      <TableCell>{f.payment_method || "-"}</TableCell>
                      <TableCell>{f.received_on ? new Date(f.received_on).toLocaleDateString("en-GB") : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={f.status === "paid" ? "default" : "secondary"}>{f.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!fundings || fundings.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">কোনো ফান্ডিং নেই</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
