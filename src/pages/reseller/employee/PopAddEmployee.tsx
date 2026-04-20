import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPopScope } from "@/lib/popScope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PopAddEmployee() {
  const navigate = useNavigate();
  const { customer } = usePortalAuth();
  const { branchId } = getPopScope(customer);
  const [form, setForm] = useState({
    name: "", mobile: "", email: "", designation: "", department: "", salary: "", address: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error("Branch assign করা নেই");
      const { error } = await supabase.from("employees").insert({
        ...form,
        salary: form.salary ? Number(form.salary) : null,
        branch_id: branchId,
        status: "active",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee যোগ হয়েছে");
      navigate("/pop-admin/employees");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!branchId) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground">এই POP-এর জন্য branch assign করা নেই</CardContent></Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">নতুন Employee যোগ করুন</h1>
      <Card>
        <CardHeader><CardTitle>Employee Information</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); if (!form.name.trim()) { toast.error("Name আবশ্যক"); return; } create.mutate(); }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Designation</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Salary</Label><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/pop-admin/employees")}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? "সংরক্ষণ হচ্ছে..." : "Save Employee"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
