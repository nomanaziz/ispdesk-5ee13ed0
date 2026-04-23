import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight, RefreshCw, LogIn, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { loginAsUser } from "@/lib/impersonate";
import BwCustomerPasswordDialog from "@/components/bw-sale/BwCustomerPasswordDialog";

interface Customer {
  id: string;
  customer_name: string;
  customer_code: string | null;
  contact_person: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  pop_id: string | null;
  reference_by: string | null;
  address: string | null;
  remarks: string | null;
  facebook_url: string | null;
  skype_id: string | null;
  website: string | null;
  nttn_info: string | null;
  vlan_info: any;
  scr_link_id: string | null;
  activation_date: string | null;
  ip_addresses: any;
  pop_name_last_mile: string | null;
  username: string | null;
  password: string | null;
  activity_status: string;
  created_at: string;
}

const emptyForm = {
  customer_name: "", customer_code: "", contact_person: "", email: "", mobile: "", phone: "",
  reference_by: "", address: "", remarks: "", facebook_url: "", skype_id: "", website: "",
  nttn_info: "", vlan_info: [{ vlan: "", info: "" }], scr_link_id: "", activation_date: "",
  ip_addresses: [""], pop_name_last_mile: "", username: "", password: "", confirm_password: "", activity_status: "active",
};

function generateCode(name: string, existingCodes: Set<string>): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 4) || "CUS";
  let n = 1;
  let code = `${initials}-${String(n).padStart(3, "0")}`;
  while (existingCodes.has(code)) {
    n++;
    code = `${initials}-${String(n).padStart(3, "0")}`;
  }
  return code;
}

export default function Pop() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [pwdTarget, setPwdTarget] = useState<{ id: string; customer_name: string; username: string | null } | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [cRes, iRes] = await Promise.all([
      supabase.from("bw_sale_customers").select("*").order("created_at", { ascending: false }),
      supabase.from("bw_sales_invoices").select("customer_id, total_amount, amount, paid_amount, discount"),
    ]);
    if (cRes.data) setCustomers(cRes.data);
    if (iRes.data) setInvoices(iRes.data);
    setLoading(false);
  }

  const dueByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    invoices.forEach(i => {
      const amt = Number(i.total_amount || i.amount || 0);
      const paid = Number(i.paid_amount || 0);
      const disc = Number(i.discount || 0);
      const due = Math.max(0, amt - paid - disc);
      map.set(i.customer_id, (map.get(i.customer_id) || 0) + due);
    });
    return map;
  }, [invoices]);

  const filtered = customers.filter(c =>
    c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.customer_code || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_person || "").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalDue = filtered.reduce((s, c) => s + (dueByCustomer.get(c.id) || 0), 0);

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setStep(1);
    setDialogOpen(true);
  }

  function openEdit(c: Customer) {
    setEditId(c.id);
    setForm({
      customer_name: c.customer_name, customer_code: c.customer_code || "", contact_person: c.contact_person || "",
      email: c.email || "", mobile: c.mobile || "", phone: c.phone || "",
      reference_by: c.reference_by || "", address: c.address || "", remarks: c.remarks || "",
      facebook_url: c.facebook_url || "", skype_id: c.skype_id || "", website: c.website || "",
      nttn_info: c.nttn_info || "",
      vlan_info: Array.isArray(c.vlan_info) && c.vlan_info.length > 0 ? c.vlan_info : [{ vlan: "", info: "" }],
      scr_link_id: c.scr_link_id || "", activation_date: c.activation_date || "",
      ip_addresses: Array.isArray(c.ip_addresses) && c.ip_addresses.length > 0 ? c.ip_addresses : [""],
      pop_name_last_mile: c.pop_name_last_mile || "",
      username: c.username || "", password: c.password || "", confirm_password: c.password || "",
      activity_status: c.activity_status,
    });
    setStep(1);
    setDialogOpen(true);
  }

  function regenCode() {
    const existing = new Set(customers.filter(c => c.id !== editId).map(c => (c.customer_code || "").toUpperCase()).filter(Boolean));
    const code = generateCode(form.customer_name || "Customer", existing);
    setForm(f => ({ ...f, customer_code: code }));
  }

  // Auto-generate code when typing name in Add mode and code is empty
  useEffect(() => {
    if (!dialogOpen || editId) return;
    if (form.customer_code) return;
    if (!form.customer_name.trim()) return;
    const existing = new Set(customers.map(c => (c.customer_code || "").toUpperCase()).filter(Boolean));
    const code = generateCode(form.customer_name, existing);
    setForm(f => ({ ...f, customer_code: code }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.customer_name, dialogOpen, editId]);

  async function handleSave() {
    if (!form.customer_name.trim()) { toast.error("Customer name is required"); return; }
    if (step === 3 && form.password !== form.confirm_password) { toast.error("Passwords do not match"); return; }

    const payload: any = { ...form };
    delete payload.confirm_password;
    if (!payload.activation_date) payload.activation_date = null;

    if (editId) {
      const { error } = await supabase.from("bw_sale_customers").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Customer updated");
    } else {
      const { error } = await supabase.from("bw_sale_customers").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Customer added");
    }
    setDialogOpen(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("bw_sale_customers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchData(); }
  }

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <CardTitle className="text-lg">Bandwidth Sale — POP Customers</CardTitle>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Customer</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{[10,25,50,100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8 h-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>

          <div className="overflow-x-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">SN</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
                ) : paginated.map((c, i) => {
                  const due = dueByCustomer.get(c.id) || 0;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-muted-foreground">{(page - 1) * perPage + i + 1}</TableCell>
                      <TableCell className="font-medium">{c.customer_name}</TableCell>
                      <TableCell className="font-mono text-xs">{c.customer_code || "—"}</TableCell>
                      <TableCell>{c.contact_person || "—"}</TableCell>
                      <TableCell>{c.mobile || "—"}</TableCell>
                      <TableCell className={`text-right font-semibold ${due > 0 ? "text-destructive" : ""}`}>৳{Math.round(due).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={(c.activity_status || "").toLowerCase() === "active" ? "default" : "secondary"}>
                          {c.activity_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/dashboard/bw-sale/pop/${c.id}`)}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-warning"
                              title="Password Regenerate"
                              onClick={() => setPwdTarget({ id: c.id, customer_name: c.customer_name, username: c.username })}
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary"
                              title="Login as Customer"
                              onClick={() =>
                                loginAsUser("bw_customer", c.id)
                                  .then(() => toast.success("নতুন ট্যাবে লগইন হচ্ছে"))
                                  .catch((e) => toast.error(e.message))
                              }
                            >
                              <LogIn className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {!loading && filtered.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-muted/40">
                    <TableCell colSpan={5} className="text-right font-semibold">Total Due</TableCell>
                    <TableCell className="text-right font-bold text-destructive">৳{Math.round(totalDue).toLocaleString()}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>Showing {filtered.length === 0 ? 0 : (page-1)*perPage+1} to {Math.min(page*perPage, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page<=1} onClick={() => setPage(p=>p-1)}><ChevronLeft className="h-4 w-4" /></Button>
              {Array.from({length: Math.min(totalPages, 5)}, (_, i) => i+1).map(p => (
                <Button key={p} variant={p===page?"default":"outline"} size="sm" className="w-8 h-8" onClick={() => setPage(p)}>{p}</Button>
              ))}
              <Button variant="outline" size="sm" disabled={page>=totalPages} onClick={() => setPage(p=>p+1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Add"} Customer — Step {step}/3</DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Customer Name *</Label><Input value={form.customer_name} onChange={e => set("customer_name", e.target.value)} /></div>
              <div>
                <Label>Customer Code <span className="text-xs text-muted-foreground">(auto, used for bKash payment ref)</span></Label>
                <div className="flex gap-2">
                  <Input value={form.customer_code} onChange={e => set("customer_code", e.target.value.toUpperCase())} className="font-mono" />
                  <Button type="button" variant="outline" size="icon" onClick={regenCode} title="Regenerate"><RefreshCw className="h-4 w-4" /></Button>
                </div>
              </div>
              <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => set("contact_person", e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
              <div><Label>Mobile</Label><Input value={form.mobile} onChange={e => set("mobile", e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
              <div><Label>Reference By</Label><Input value={form.reference_by} onChange={e => set("reference_by", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Address</Label><Textarea rows={2} value={form.address} onChange={e => set("address", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Remarks</Label><Textarea rows={2} value={form.remarks} onChange={e => set("remarks", e.target.value)} /></div>
              <div><Label>Facebook URL</Label><Input value={form.facebook_url} onChange={e => set("facebook_url", e.target.value)} /></div>
              <div><Label>Skype ID</Label><Input value={form.skype_id} onChange={e => set("skype_id", e.target.value)} /></div>
              <div><Label>Website</Label><Input value={form.website} onChange={e => set("website", e.target.value)} /></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Label>NTTN Info</Label><Input value={form.nttn_info} onChange={e => set("nttn_info", e.target.value)} /></div>
                <div><Label>SCR / Link ID</Label><Input value={form.scr_link_id} onChange={e => set("scr_link_id", e.target.value)} /></div>
                <div><Label>Activation Date</Label><Input type="date" value={form.activation_date} onChange={e => set("activation_date", e.target.value)} /></div>
                <div><Label>POP Name (Last Mile)</Label><Input value={form.pop_name_last_mile} onChange={e => set("pop_name_last_mile", e.target.value)} /></div>
              </div>
              <div>
                <Label>VLAN Info</Label>
                {form.vlan_info.map((v: any, i: number) => (
                  <div key={i} className="flex gap-2 mt-1">
                    <Input placeholder="VLAN" value={v.vlan} onChange={e => { const arr = [...form.vlan_info]; arr[i] = { ...arr[i], vlan: e.target.value }; set("vlan_info", arr); }} />
                    <Input placeholder="Info" value={v.info} onChange={e => { const arr = [...form.vlan_info]; arr[i] = { ...arr[i], info: e.target.value }; set("vlan_info", arr); }} />
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => set("vlan_info", form.vlan_info.filter((_: any, j: number) => j !== i))}>×</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="mt-2" onClick={() => set("vlan_info", [...form.vlan_info, { vlan: "", info: "" }])}>+ VLAN</Button>
              </div>
              <div>
                <Label>IP Addresses</Label>
                {form.ip_addresses.map((ip: string, i: number) => (
                  <div key={i} className="flex gap-2 mt-1">
                    <Input placeholder="IP Address" value={ip} onChange={e => { const arr = [...form.ip_addresses]; arr[i] = e.target.value; set("ip_addresses", arr); }} />
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => set("ip_addresses", form.ip_addresses.filter((_: any, j: number) => j !== i))}>×</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="mt-2" onClick={() => set("ip_addresses", [...form.ip_addresses, ""])}>+ IP</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Username</Label><Input value={form.username} onChange={e => set("username", e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" value={form.password} onChange={e => set("password", e.target.value)} /></div>
              <div><Label>Confirm Password</Label><Input type="password" value={form.confirm_password} onChange={e => set("confirm_password", e.target.value)} /></div>
              <div>
                <Label>Activity Status</Label>
                <Select value={form.activity_status} onValueChange={v => set("activity_status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Previous</Button>}
            {step < 3 ? (
              <Button onClick={() => { if (step === 1 && !form.customer_name.trim()) { toast.error("Name required"); return; } setStep(s => s + 1); }}>Next</Button>
            ) : (
              <Button onClick={handleSave}>{editId ? "Update" : "Save"}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BwCustomerPasswordDialog
        open={!!pwdTarget}
        onOpenChange={(v) => { if (!v) setPwdTarget(null); }}
        customer={pwdTarget}
        onSaved={fetchData}
      />
    </div>
  );
}
