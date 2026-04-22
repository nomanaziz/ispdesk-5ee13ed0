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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmployeeUserAccessSection from "@/components/reseller/EmployeeUserAccessSection";
import DivisionDistrictUpazilaSelect from "@/components/reseller/DivisionDistrictUpazilaSelect";
import { toast } from "sonner";

export default function PopAddEmployee() {
  const navigate = useNavigate();
  const { customer } = usePortalAuth();
  const { branchId, popId } = getPopScope(customer);

  const [form, setForm] = useState<any>({
    name: "", email: "", phone: "", address: "",
    date_of_birth: "", gender: "", personal_phone: "", office_phone: "", guardian_phone: "",
    marital_status: "", nid_number: "", facebook_link: "", reference: "",
    division_id: null, district_id: null, upazila_id: null, permanent_address: "",
    working_experience: "", last_degree: "", institution: "", passing_year: "",
    joining_date: "", department: "", designation: "", salary: "", status: "active",
  });

  const [hasAccess, setHasAccess] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  const create = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error("Branch assign করা নেই");
      if (!form.name.trim()) throw new Error("Name আবশ্যক");
      if (hasAccess) {
        if (!username.trim() || !password) throw new Error("Username এবং Password আবশ্যক");
        if (password !== confirm) throw new Error("Password match হচ্ছে না");
      }

      // 1. Create employee
      const employee_id = `EMP-${Date.now().toString().slice(-8)}`;
      const { data: emp, error } = await supabase.from("employees").insert({
        employee_id,
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        personal_phone: form.personal_phone || null,
        office_phone: form.office_phone || null,
        guardian_phone: form.guardian_phone || null,
        marital_status: form.marital_status || null,
        nid_number: form.nid_number || null,
        facebook_link: form.facebook_link || null,
        reference: form.reference || null,
        division_id: form.division_id || null,
        district_id: form.district_id || null,
        upazila_id: form.upazila_id || null,
        permanent_address: form.permanent_address || null,
        working_experience: form.working_experience || null,
        last_degree: form.last_degree || null,
        institution: form.institution || null,
        passing_year: form.passing_year || null,
        joining_date: form.joining_date || null,
        salary: form.salary ? Number(form.salary) : null,
        branch_id: branchId,
        status: form.status,
        has_user_access: hasAccess,
        user_username: hasAccess ? username : null,
        user_password: hasAccess ? password : null,
        user_permissions: hasAccess ? permissions : {},
      } as any).select().single();
      if (error) throw error;

      // 2. If has_user_access, create branch_managers sub-user
      if (hasAccess && popId) {
        const { data: sub, error: subErr } = await supabase.from("branch_managers").insert({
          name: form.name,
          username,
          password,
          email: form.email || null,
          contact: form.personal_phone || form.phone || null,
          branch_id: branchId,
          pop_type: "reseller_sub" as any,
          permissions,
          portal_enabled: true,
          status: "active",
        } as any).select().single();
        if (subErr) throw subErr;
        await supabase.from("employees").update({ sub_user_id: sub.id } as any).eq("id", emp.id);
      }
    },
    onSuccess: () => {
      toast.success("Employee যোগ হয়েছে");
      navigate("/pop-admin/employees");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!branchId) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">এই POP-এর জন্য branch assign করা নেই</CardContent></Card>;
  }

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target ? e.target.value : e });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">নতুন Employee যোগ করুন</h1>

      <form
        onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        className="space-y-5"
      >
        <Card>
          <CardHeader><CardTitle className="text-base">Employee Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={set("name")} required /></div>
            <div className="space-y-1.5"><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={set("date_of_birth")} /></div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Personal Phone</Label><Input value={form.personal_phone} onChange={set("personal_phone")} /></div>
            <div className="space-y-1.5"><Label>Office Phone</Label><Input value={form.office_phone} onChange={set("office_phone")} /></div>
            <div className="space-y-1.5"><Label>Guardian Phone</Label><Input value={form.guardian_phone} onChange={set("guardian_phone")} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={set("email")} /></div>
            <div className="space-y-1.5">
              <Label>Marital Status</Label>
              <Select value={form.marital_status} onValueChange={(v) => setForm({ ...form, marital_status: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="married">Married</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>NID Number</Label><Input value={form.nid_number} onChange={set("nid_number")} /></div>
            <div className="space-y-1.5"><Label>Facebook Link</Label><Input value={form.facebook_link} onChange={set("facebook_link")} /></div>
            <div className="space-y-1.5"><Label>Reference</Label><Input value={form.reference} onChange={set("reference")} /></div>
            <DivisionDistrictUpazilaSelect
              divisionId={form.division_id}
              districtId={form.district_id}
              upazilaId={form.upazila_id}
              onChange={(v) => setForm({ ...form, ...v })}
            />
            <div className="space-y-1.5 md:col-span-3"><Label>Present Address</Label><Textarea value={form.address} onChange={set("address")} rows={2} /></div>
            <div className="space-y-1.5 md:col-span-3"><Label>Permanent Address</Label><Textarea value={form.permanent_address} onChange={set("permanent_address")} rows={2} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Educational Qualification</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Working Experience</Label><Input value={form.working_experience} onChange={set("working_experience")} /></div>
            <div className="space-y-1.5"><Label>Last Degree</Label><Input value={form.last_degree} onChange={set("last_degree")} /></div>
            <div className="space-y-1.5"><Label>Institution</Label><Input value={form.institution} onChange={set("institution")} /></div>
            <div className="space-y-1.5"><Label>Passing Year</Label><Input value={form.passing_year} onChange={set("passing_year")} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Posting Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label>Joining Date</Label><Input type="date" value={form.joining_date} onChange={set("joining_date")} /></div>
            <div className="space-y-1.5"><Label>Department</Label><Input value={form.department} onChange={set("department")} /></div>
            <div className="space-y-1.5"><Label>Designation</Label><Input value={form.designation} onChange={set("designation")} /></div>
            <div className="space-y-1.5"><Label>Salary</Label><Input type="number" value={form.salary} onChange={set("salary")} /></div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <EmployeeUserAccessSection
          hasAccess={hasAccess}
          onHasAccessChange={setHasAccess}
          username={username} onUsernameChange={setUsername}
          password={password} onPasswordChange={setPassword}
          confirm={confirm} onConfirmChange={setConfirm}
          permissions={permissions} onPermissionsChange={setPermissions}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate("/pop-admin/employees")}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? "সংরক্ষণ হচ্ছে..." : "Save Employee"}</Button>
        </div>
      </form>
    </div>
  );
}
