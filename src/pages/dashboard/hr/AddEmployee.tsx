import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Save, ArrowLeft, Upload, User } from "lucide-react";

const initialForm = {
  employee_id: "",
  name: "",
  date_of_birth: "",
  gender: "",
  personal_phone: "",
  office_phone: "",
  guardian_phone: "",
  marital_status: "",
  nid_number: "",
  email: "",
  facebook_link: "",
  reference: "",
  division_id: "",
  district: "",
  district_id: "",
  upazila: "",
  working_experience: "",
  address: "",
  permanent_address: "",
  // Attendance
  zkteco_device_id: "",
  punch_card_id: "",
  default_in_time: "",
  default_out_time: "",
  // Education
  last_degree: "",
  institution: "",
  passing_year: "",
  // Posting
  joining_date: "",
  department_id: "",
  position_id: "",
  payroll_template_id: "",
  salary: "",
  show_on_website: false,
  image_url: "",
};

export default function AddEmployee() {
  const [form, setForm] = useState(initialForm);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [autoIdMode, setAutoIdMode] = useState(false);

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

  const { data: divisions } = useQuery({
    queryKey: ["divisions-active"],
    queryFn: async () => {
      const { data } = await supabase.from("divisions").select("*").eq("status", "active").order("name");
      return data || [];
    },
  });

  const { data: districts } = useQuery({
    queryKey: ["districts-active", form.division_id],
    queryFn: async () => {
      let q = supabase.from("districts").select("*").eq("status", "active").order("name");
      if (form.division_id) q = q.eq("division_id", form.division_id);
      const { data } = await q;
      return data || [];
    },
    enabled: true,
  });

  const { data: upazilas } = useQuery({
    queryKey: ["upazilas-active", form.district_id],
    queryFn: async () => {
      let q = supabase.from("upazilas").select("*").eq("status", "active").order("name");
      if (form.district_id) q = q.eq("district_id", form.district_id);
      const { data } = await q;
      return data || [];
    },
    enabled: true,
  });

  const { data: zktecoDevices } = useQuery({
    queryKey: ["zkteco-devices-active"],
    queryFn: async () => {
      const { data } = await supabase.from("zkteco_devices").select("*").eq("status", "active").order("name");
      return data || [];
    },
  });

  const { data: payrollTemplates } = useQuery({
    queryKey: ["payroll-templates-active"],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_templates").select("*").eq("status", "active").order("name");
      return data || [];
    },
  });

  // Fetch HR settings for auto ID
  const { data: hrSettings } = useQuery({
    queryKey: ["hr-settings-employee-id"],
    queryFn: async () => {
      const { data } = await supabase.from("hr_settings").select("*").eq("setting_key", "employee_id_config").single();
      return data;
    },
  });

  // Generate next employee ID
  useEffect(() => {
    if (!editId && hrSettings) {
      const config = hrSettings.setting_value as any;
      if (config?.mode === "auto") {
        setAutoIdMode(true);
        const num = String(config.next_number || 1).padStart(config.padding || 3, "0");
        setForm((p) => ({ ...p, employee_id: `${config.prefix || "EMP"}${num}` }));
      } else {
        setAutoIdMode(false);
      }
    }
  }, [hrSettings, editId]);

  useEffect(() => {
    if (editId) {
      supabase.from("employees").select("*").eq("id", editId).single().then(({ data }) => {
        if (data) {
          setForm({
            employee_id: data.employee_id || "",
            name: data.name || "",
            date_of_birth: data.date_of_birth || "",
            gender: data.gender || "",
            personal_phone: data.personal_phone || "",
            office_phone: data.office_phone || "",
            guardian_phone: data.guardian_phone || "",
            marital_status: data.marital_status || "",
            nid_number: data.nid_number || "",
            email: data.email || "",
            facebook_link: data.facebook_link || "",
            reference: data.reference || "",
            district: data.district || "",
            upazila: data.upazila || "",
            working_experience: data.working_experience || "",
            address: data.address || "",
            permanent_address: data.permanent_address || "",
            zkteco_device_id: data.zkteco_device_id || "",
            punch_card_id: data.punch_card_id || "",
            default_in_time: data.default_in_time || "",
            default_out_time: data.default_out_time || "",
            last_degree: data.last_degree || "",
            institution: data.institution || "",
            passing_year: data.passing_year || "",
            joining_date: data.joining_date || "",
            department_id: data.department_id || "",
            position_id: data.position_id || "",
            payroll_template_id: data.payroll_template_id || "",
            salary: data.salary?.toString() || "",
            show_on_website: data.show_on_website || false,
            image_url: data.image_url || "",
          });
        }
      });
    }
  }, [editId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("employee-photos").upload(fileName, file);
    if (error) {
      toast.error("ছবি আপলোড ব্যর্থ");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("employee-photos").getPublicUrl(fileName);
    set("image_url", urlData.publicUrl);
    setUploading(false);
    toast.success("ছবি আপলোড হয়েছে");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...form,
        salary: form.salary ? parseFloat(form.salary) : 0,
        department_id: form.department_id || null,
        position_id: form.position_id || null,
        zkteco_device_id: form.zkteco_device_id || null,
        payroll_template_id: form.payroll_template_id || null,
        default_in_time: form.default_in_time || null,
        default_out_time: form.default_out_time || null,
        phone: form.personal_phone, // keep legacy phone field in sync
      };
      // Remove fields not in DB
      delete payload.personal_phone;

      if (editId) {
        const { error } = await supabase.from("employees").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw error;
        // Increment auto ID counter
        if (autoIdMode && hrSettings) {
          const config = hrSettings.setting_value as any;
          await supabase.from("hr_settings").update({
            setting_value: { ...config, next_number: (config.next_number || 1) + 1 },
          }).eq("setting_key", "employee_id_config");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["hr-settings-employee-id"] });
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
    if (form.date_of_birth) {
      const dob = new Date(form.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      if (age < 12) {
        toast.error("কর্মীর বয়স সর্বনিম্ন ১২ বছর হতে হবে");
        return;
      }
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
          <Button variant="outline" onClick={() => navigate("/dashboard/hr/employees")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> ফিরে যান
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending} className="gap-2">
            <Save className="h-4 w-4" /> {mutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
          </Button>
        </div>
      </div>

      {/* Employee ID */}
      <Card>
        <CardHeader className="bg-primary/10 rounded-t-lg py-3">
          <CardTitle className="text-base">কর্মী আইডি</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>কর্মী আইডি <span className="text-destructive">*</span></Label>
              <Input
                value={form.employee_id}
                onChange={(e) => set("employee_id", e.target.value)}
                placeholder="EMP001"
                readOnly={autoIdMode && !editId}
                className={autoIdMode && !editId ? "bg-muted" : ""}
              />
              {autoIdMode && !editId && (
                <p className="text-xs text-muted-foreground mt-1">স্বয়ংক্রিয়ভাবে তৈরি হয়েছে</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Basic Information */}
        <Card className="lg:col-span-2">
          <CardHeader className="bg-primary/10 rounded-t-lg py-3">
            <CardTitle className="text-base">ব্যক্তিগত তথ্য</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>নাম <span className="text-destructive">*</span></Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="পুরো নাম" /></div>
              <div><Label>জন্ম তারিখ</Label><Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} max={new Date(new Date().getFullYear() - 12, new Date().getMonth(), new Date().getDate()).toISOString().split("T")[0]} /></div>
              <div>
                <Label>লিঙ্গ</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">পুরুষ</SelectItem>
                    <SelectItem value="female">মহিলা</SelectItem>
                    <SelectItem value="other">অন্যান্য</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>ব্যক্তিগত নম্বর</Label><Input value={form.personal_phone} onChange={(e) => set("personal_phone", e.target.value)} placeholder="01XXXXXXXXX" /></div>
              <div><Label>অফিস নম্বর</Label><Input value={form.office_phone} onChange={(e) => set("office_phone", e.target.value)} placeholder="01XXXXXXXXX" /></div>
              <div><Label>অভিভাবকের নম্বর</Label><Input value={form.guardian_phone} onChange={(e) => set("guardian_phone", e.target.value)} placeholder="01XXXXXXXXX" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>বৈবাহিক অবস্থা</Label>
                <Select value={form.marital_status} onValueChange={(v) => set("marital_status", v)}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">অবিবাহিত</SelectItem>
                    <SelectItem value="married">বিবাহিত</SelectItem>
                    <SelectItem value="divorced">তালাকপ্রাপ্ত</SelectItem>
                    <SelectItem value="widowed">বিধবা/বিপত্নীক</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>NID / জন্ম সনদ নম্বর</Label><Input value={form.nid_number} onChange={(e) => set("nid_number", e.target.value)} placeholder="NID নম্বর" /></div>
              <div><Label>ইমেইল</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@example.com" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>ফেসবুক লিংক</Label><Input value={form.facebook_link} onChange={(e) => set("facebook_link", e.target.value)} placeholder="https://facebook.com/..." /></div>
              <div><Label>রেফারেন্স</Label><Input value={form.reference} onChange={(e) => set("reference", e.target.value)} placeholder="রেফারেন্স ব্যক্তি" /></div>
              <div>
                <Label>বিভাগ</Label>
                <Select value={form.division_id} onValueChange={(v) => { set("division_id", v); set("district", ""); set("district_id", ""); set("upazila", ""); }}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>{(divisions || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>জেলা</Label>
                <Select value={form.district_id} onValueChange={(v) => { const d = (districts || []).find((x: any) => x.id === v); set("district_id", v); set("district", d?.name || ""); set("upazila", ""); }}>
                  <SelectTrigger><SelectValue placeholder={form.division_id ? "নির্বাচন করুন" : "আগে বিভাগ নির্বাচন করুন"} /></SelectTrigger>
                  <SelectContent>{(districts || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>উপজেলা</Label>
                <Select value={form.upazila} onValueChange={(v) => { const u = (upazilas || []).find((x: any) => x.id === v); set("upazila", u?.name || ""); }}>
                  <SelectTrigger><SelectValue placeholder={form.district_id ? "নির্বাচন করুন" : "আগে জেলা নির্বাচন করুন"} /></SelectTrigger>
                  <SelectContent>{(upazilas || []).map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>কর্মঅভিজ্ঞতা</Label><Textarea value={form.working_experience} onChange={(e) => set("working_experience", e.target.value)} placeholder="পূর্ববর্তী কর্মঅভিজ্ঞতার বিবরণ" rows={2} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>বর্তমান ঠিকানা</Label><Textarea value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="বর্তমান ঠিকানা" rows={2} /></div>
              <div><Label>স্থায়ী ঠিকানা</Label><Textarea value={form.permanent_address} onChange={(e) => set("permanent_address", e.target.value)} placeholder="স্থায়ী ঠিকানা" rows={2} /></div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Attendance Information */}
        <Card>
          <CardHeader className="bg-sky-500/10 rounded-t-lg py-3">
            <CardTitle className="text-base">উপস্থিতি তথ্য</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label>ডিভাইস (ZKTeco)</Label>
              <Select value={form.zkteco_device_id} onValueChange={(v) => set("zkteco_device_id", v)}>
                <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                <SelectContent>{(zktecoDevices || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>পাঞ্চ কার্ড আইডি</Label><Input value={form.punch_card_id} onChange={(e) => set("punch_card_id", e.target.value)} placeholder="কার্ড আইডি" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>ডিফল্ট ইন টাইম</Label><Input type="time" value={form.default_in_time} onChange={(e) => set("default_in_time", e.target.value)} /></div>
              <div><Label>ডিফল্ট আউট টাইম</Label><Input type="time" value={form.default_out_time} onChange={(e) => set("default_out_time", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Educational Qualification */}
        <Card>
          <CardHeader className="bg-amber-500/10 rounded-t-lg py-3">
            <CardTitle className="text-base">শিক্ষাগত যোগ্যতা</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div><Label>সর্বশেষ ডিগ্রি</Label><Input value={form.last_degree} onChange={(e) => set("last_degree", e.target.value)} placeholder="যেমন: HSC, BSc, MSc" /></div>
            <div><Label>প্রতিষ্ঠান / বোর্ড</Label><Input value={form.institution} onChange={(e) => set("institution", e.target.value)} placeholder="প্রতিষ্ঠানের নাম" /></div>
            <div><Label>পাসের সন</Label><Input value={form.passing_year} onChange={(e) => set("passing_year", e.target.value)} placeholder="যেমন: 2020" /></div>
          </CardContent>
        </Card>

        {/* 4. Posting Information */}
        <Card className="lg:col-span-2">
          <CardHeader className="bg-emerald-500/10 rounded-t-lg py-3">
            <CardTitle className="text-base">চাকুরি সম্পর্কিত তথ্য</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>যোগদানের তারিখ</Label><Input type="date" value={form.joining_date} onChange={(e) => set("joining_date", e.target.value)} /></div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>পেরোল টেমপ্লেট</Label>
                <Select value={form.payroll_template_id} onValueChange={(v) => set("payroll_template_id", v)}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>{(payrollTemplates || []).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>বেতন (৳)</Label><Input type="number" value={form.salary} onChange={(e) => set("salary", e.target.value)} placeholder="0" /></div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.show_on_website} onCheckedChange={(v) => set("show_on_website", v)} />
                <Label>ওয়েবসাইটে দেখান</Label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>প্রোফাইল ছবি</Label>
                <div className="flex items-center gap-4 mt-1">
                  {form.image_url ? (
                    <img src={form.image_url} alt="Profile" className="h-16 w-16 rounded-full object-cover border" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <span><Upload className="h-4 w-4" /> {uploading ? "আপলোড হচ্ছে..." : "ছবি আপলোড"}</span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
