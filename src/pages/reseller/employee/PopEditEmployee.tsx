import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPopScope } from "@/lib/popScope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import EmployeeUserAccessSection from "@/components/reseller/EmployeeUserAccessSection";
import DivisionDistrictUpazilaSelect from "@/components/reseller/DivisionDistrictUpazilaSelect";
import { toast } from "sonner";

export default function PopEditEmployee() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { customer } = usePortalAuth();
  const { branchId } = getPopScope(customer);

  const [form, setForm] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  const { data: emp } = useQuery({
    queryKey: ["pop-emp-edit", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!emp) return;
    setForm(emp);
    setHasAccess(!!(emp as any).has_user_access);
    setUsername((emp as any).user_username || "");
    setPermissions(((emp as any).user_permissions as any) || {});
  }, [emp]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      if (hasAccess) {
        if (!username.trim()) throw new Error("Username আবশ্যক");
        if (password && password !== confirm) throw new Error("Password match হচ্ছে না");
      }

      const update: any = {
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        salary: form.salary ? Number(form.salary) : null,
        status: form.status || "active",
        designation: form.designation || null,
        department: form.department || null,
        division_id: form.division_id || null,
        district_id: form.district_id || null,
        upazila_id: form.upazila_id || null,
        has_user_access: hasAccess,
        user_username: hasAccess ? username : null,
        user_permissions: hasAccess ? permissions : {},
      };
      if (hasAccess && password) update.user_password = password;

      const { error } = await supabase.from("employees").update(update).eq("id", id!);
      if (error) throw error;

      // Sync sub-user
      if (hasAccess) {
        const subId = (emp as any).sub_user_id;
        if (subId) {
          const subUpdate: any = { name: form.name, username, permissions, portal_enabled: true, status: "active" };
          if (password) subUpdate.password = password;
          await supabase.from("branch_managers").update(subUpdate).eq("id", subId);
        } else {
          const { data: sub, error: subErr } = await supabase.from("branch_managers").insert({
            name: form.name, username, password: password || "changeme", email: form.email || null,
            branch_id: branchId, pop_type: "reseller_sub" as any, permissions, portal_enabled: true, status: "active",
          } as any).select().single();
          if (subErr) throw subErr;
          await supabase.from("employees").update({ sub_user_id: sub.id } as any).eq("id", id!);
        }
      } else if ((emp as any).sub_user_id) {
        await supabase.from("branch_managers").update({ portal_enabled: false, status: "inactive" }).eq("id", (emp as any).sub_user_id);
      }
    },
    onSuccess: () => { toast.success("Saved"); navigate("/pop-admin/employees"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!form) return <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card>;

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target ? e.target.value : e });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">Employee Edit</h1>

      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Employee Info</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name || ""} onChange={set("name")} required /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={form.email || ""} onChange={set("email")} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone || ""} onChange={set("phone")} /></div>
            <div className="space-y-1.5"><Label>Designation</Label><Input value={form.designation || ""} onChange={set("designation")} /></div>
            <div className="space-y-1.5"><Label>Department</Label><Input value={form.department || ""} onChange={set("department")} /></div>
            <div className="space-y-1.5"><Label>Salary</Label><Input type="number" value={form.salary || ""} onChange={set("salary")} /></div>
            <DivisionDistrictUpazilaSelect
              divisionId={form.division_id}
              districtId={form.district_id}
              upazilaId={form.upazila_id}
              onChange={(v) => setForm({ ...form, ...v })}
            />
            <div className="space-y-1.5 md:col-span-3"><Label>Address</Label><Textarea value={form.address || ""} onChange={set("address")} rows={2} /></div>
          </CardContent>
        </Card>

        <EmployeeUserAccessSection
          hasAccess={hasAccess} onHasAccessChange={setHasAccess}
          username={username} onUsernameChange={setUsername}
          password={password} onPasswordChange={setPassword}
          confirm={confirm} onConfirmChange={setConfirm}
          permissions={permissions} onPermissionsChange={setPermissions}
          isEditing
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/pop-admin/employees")}>Cancel</Button>
          <Button type="submit" disabled={save.isPending}>Save</Button>
        </div>
      </form>
    </div>
  );
}
