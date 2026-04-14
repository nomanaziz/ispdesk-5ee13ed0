import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Save, ArrowLeft } from "lucide-react";

const initialForm = {
  employee_id: "", name: "", email: "", phone: "", address: "",
  department_id: "", position_id: "", joining_date: "", salary: "",
  show_on_website: false,
};

export default function AddEmployee() {
  const [form, setForm] = useState(initialForm);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: departments } = useQuery({
    queryKey: ["departments-active"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").eq("status", "active").order("name");
      return data || [];
    },
  });

  const { data: positions } = useQuery({
    queryKey: ["positions-active"],
    queryFn: async () => {
      const { data } = await supabase.from("positions").select("*").eq("status", "active").order("name");
      return data || [];
    },
  });

  useEffect(() => {
    if (editId) {
      supabase.from("employees").select("*").eq("id", editId).single().then(({ data }) => {
        if (data) {
          setForm({
            employee_id: data.employee_id || "",
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            department_id: data.department_id || "",
            position_id: data.position_id || "",
            joining_date: data.joining_date || "",
            salary: data.salary?.toString() || "",
            show_on_website: data.show_on_website || false,
          });
        }
      });
    }
  }, [editId]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        salary: form.salary ? parseFloat(form.salary) : 0,
        department_id: form.department_id || null,
        position_id: form.position_id || null,
      };
      if (editId) {
        const { error } = await supabase.from("employees").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(editId ? "কর্মী আপডেট হয়েছে" : "কর্মী যোগ হয়েছে");
      navigate("/dashboard/hr/employees");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.employee_id.trim() || !form.name.trim()) {
      toast.error("কর্মী আইডি ও নাম আবশ্যক");
      return;
    }
    mutation.mutate();
  };

  const set = (key: string, val: any) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{editId ? "কর্মী সম্পাদনা" : "নতুন কর্মী যোগ"}</h1>
          <p className="text-sm text-muted-foreground">HR & Payroll</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/dashboard/hr/employees")} className="gap-2"><ArrowLeft className="h-4 w-4" /> ফিরে যান</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending} className="gap-2"><Save className="h-4 w-4" /> {mutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="bg-primary/10 rounded-t-lg"><CardTitle className="text-base">ব্যক্তিগত তথ্য</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>কর্মী আইডি <span className="text-destructive">*</span></Label><Input value={form.employee_id} onChange={(e) => set("employee_id", e.target.value)} placeholder="EMP-001" /></div>
              <div><Label>নাম <span className="text-destructive">*</span></Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="পুরো নাম" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>ইমেইল</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@example.com" /></div>
              <div><Label>ফোন</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01XXXXXXXXX" /></div>
            </div>
            <div><Label>ঠিকানা</Label><Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="বর্তমান ঠিকানা" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-emerald-500/10 rounded-t-lg"><CardTitle className="text-base">চাকুরি সম্পর্কিত তথ্য</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ডিপার্টমেন্ট</Label>
                <Select value={form.department_id} onValueChange={(v) => set("department_id", v)}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>{(departments || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>পদবী</Label>
                <Select value={form.position_id} onValueChange={(v) => set("position_id", v)}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>{(positions || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>যোগদানের তারিখ</Label><Input type="date" value={form.joining_date} onChange={(e) => set("joining_date", e.target.value)} /></div>
              <div><Label>বেতন (৳)</Label><Input type="number" value={form.salary} onChange={(e) => set("salary", e.target.value)} placeholder="0" /></div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch checked={form.show_on_website} onCheckedChange={(v) => set("show_on_website", v)} />
              <Label>ওয়েবসাইটে দেখান</Label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
