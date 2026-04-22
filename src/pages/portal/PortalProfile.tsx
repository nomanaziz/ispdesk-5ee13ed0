import { useState, useRef, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callPortal } from "@/lib/portalApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  UserCog, Upload, KeyRound, Phone, Image as ImageIcon, ClipboardList,
  CheckCircle2, XCircle, Clock, ShieldAlert, IdCard, Calendar, MapPin, Eye, EyeOff,
} from "lucide-react";

/* ---------------- helpers (module-level, do NOT define inside parent — causes remount) ---------------- */
const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(((r.result as string).split(",")[1]) || "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const onlyAlpha = (s: string) => s.replace(/[^A-Za-z\u0980-\u09FF\s.'-]/g, "");
const onlyDigits = (s: string, max = 11) => s.replace(/\D/g, "").slice(0, max);
const onlyAlphaExt = (s: string) => s.replace(/[^A-Za-z\u0980-\u09FF\s.,'-]/g, "");
const validBdMobile = (m: string) => /^01[3-9]\d{8}$/.test(m);

const Row = ({ label, value }: { label: string; value: any }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-xs font-medium text-right truncate max-w-[60%]">{value}</span>
  </div>
);

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b pb-2">
    {icon} {title}
  </div>
);

const BdPhoneInput = ({
  value, onChange, placeholder = "01XXXXXXXXX",
}: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div className="flex">
    <div className="flex items-center gap-1 px-2 border border-r-0 rounded-l-md bg-muted text-xs whitespace-nowrap">
      🇧🇩 +880
    </div>
    <Input
      className="rounded-l-none"
      value={value}
      maxLength={11}
      inputMode="numeric"
      placeholder={placeholder}
      onChange={(e) => onChange(onlyDigits(e.target.value, 11))}
    />
  </div>
);

/* ---------------- Page ---------------- */
const PortalProfile = () => {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "personal";

  const { data, isLoading } = useQuery({
    queryKey: ["portal-profile"],
    queryFn: () => callPortal<any>("get_profile"),
  });
  const client = data?.client;
  const requests: any[] = data?.requests || [];

  const initials = client?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow">
          <UserCog className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">My Profile</h1>
          <p className="text-sm text-muted-foreground">নিজের তথ্য আপডেট ও পাসওয়ার্ড পরিবর্তন করুন</p>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">লোড হচ্ছে...</CardContent></Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left summary */}
          <Card className="lg:col-span-1 overflow-hidden h-fit">
            <div className="h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500" />
            <CardContent className="-mt-10 pb-5 text-center">
              <Avatar className="h-20 w-20 mx-auto ring-4 ring-background shadow">
                {client?.photo_url && <AvatarImage src={client.photo_url} alt={client.name} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="mt-3 font-semibold text-base">{client?.name}</div>
              <Badge variant="outline" className="mt-1 text-[11px]">{client?.client_id}</Badge>

              <div className="mt-4 space-y-2 text-left text-sm border-t pt-4">
                <Row label="Login ID" value={client?.username} />
                <Row label="User ID" value={client?.client_id} />
                <Row label="Status" value={
                  <Badge className={
                    client?.status === "active" ? "bg-emerald-100 text-emerald-700 border-0" :
                    "bg-rose-100 text-rose-700 border-0"
                  }>{client?.status || "—"}</Badge>
                } />
                <Row label="Package" value={
                  client?.package?.name
                    ? `${client.package.name}${client.package.bandwidth_down ? ` (${client.package.bandwidth_down}M)` : ""}`
                    : "—"
                } />
                <Row label="Joined" value={client?.joining_date ? new Date(client.joining_date).toLocaleDateString() : "—"} />
                <Row label="Mobile" value={client?.contact ? `+880 ${client.contact}` : "—"} />
              </div>

              <Button asChild variant="outline" className="w-full mt-5 border-rose-200 text-rose-700 hover:bg-rose-50">
                <Link to="/portal/change-request">
                  <ShieldAlert className="h-4 w-4" /> Discontinue Request
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Right tabs */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4 sm:p-5">
              <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
                <TabsList className="grid grid-cols-5 h-auto bg-muted/60">
                  <TabsTrigger value="personal" className="text-[11px] sm:text-xs gap-1.5 py-2">
                    <UserCog className="h-3.5 w-3.5" /><span className="hidden sm:inline">Personal</span>
                  </TabsTrigger>
                  <TabsTrigger value="password" className="text-[11px] sm:text-xs gap-1.5 py-2">
                    <KeyRound className="h-3.5 w-3.5" /><span className="hidden sm:inline">Password</span>
                  </TabsTrigger>
                  <TabsTrigger value="picture" className="text-[11px] sm:text-xs gap-1.5 py-2">
                    <ImageIcon className="h-3.5 w-3.5" /><span className="hidden sm:inline">Picture</span>
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="text-[11px] sm:text-xs gap-1.5 py-2">
                    <Phone className="h-3.5 w-3.5" /><span className="hidden sm:inline">Mobile</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-[11px] sm:text-xs gap-1.5 py-2">
                    <ClipboardList className="h-3.5 w-3.5" /><span className="hidden sm:inline">History</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="mt-5">
                  <PersonalTab client={client} qc={qc} />
                </TabsContent>
                <TabsContent value="password" className="mt-5">
                  <PasswordTab />
                </TabsContent>
                <TabsContent value="picture" className="mt-5">
                  <PictureTab client={client} qc={qc} />
                </TabsContent>
                <TabsContent value="mobile" className="mt-5">
                  <MobileTab client={client} qc={qc} />
                </TabsContent>
                <TabsContent value="history" className="mt-5">
                  <HistoryTab requests={requests} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

/* ---------------- Personal Tab ---------------- */
const PersonalTab = ({ client, qc }: any) => {
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (!client) return;
    setForm({
      contact: client.contact || "",
      email: client.email || "",
      phone_number: client.phone_number || "",
      father_name: client.father_name || "",
      mother_name: client.mother_name || "",
      occupation: client.occupation || "",
      gender: client.gender || "",
      date_of_birth: client.date_of_birth ? String(client.date_of_birth).slice(0, 10) : "",
      road_number: client.road_number || "",
      house_number: client.house_number || "",
      present_address: client.present_address || client.address || "",
      permanent_address: client.permanent_address || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      // validation
      if (form.contact && !validBdMobile(form.contact))
        throw new Error("সঠিক ১১ ডিজিট মোবাইল নম্বর দিন (01XXXXXXXXX)");
      if (form.phone_number && !validBdMobile(form.phone_number))
        throw new Error("Alternate phone সঠিক ১১ ডিজিট হতে হবে");
      if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
        throw new Error("সঠিক email দিন");
      return callPortal("update_profile", form);
    },
    onSuccess: () => {
      toast.success("প্রোফাইল আপডেট হয়েছে");
      qc.invalidateQueries({ queryKey: ["portal-profile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <SectionTitle icon={<UserCog className="h-4 w-4 text-blue-600" />} title="Contact Info" />
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Mobile</Label>
          <BdPhoneInput value={form.contact || ""} onChange={(v) => set("contact", v)} />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value.trim())} />
        </div>
        <div>
          <Label className="text-xs">Alternate Phone</Label>
          <BdPhoneInput value={form.phone_number || ""} onChange={(v) => set("phone_number", v)} />
        </div>
        <div>
          <Label className="text-xs">Date of Birth</Label>
          <Input type="date" value={form.date_of_birth || ""} onChange={(e) => set("date_of_birth", e.target.value)} />
        </div>
      </div>

      <SectionTitle icon={<IdCard className="h-4 w-4 text-violet-600" />} title="Personal Details" />
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Father's Name</Label>
          <Input value={form.father_name || ""} onChange={(e) => set("father_name", onlyAlpha(e.target.value))} />
        </div>
        <div>
          <Label className="text-xs">Mother's Name</Label>
          <Input value={form.mother_name || ""} onChange={(e) => set("mother_name", onlyAlpha(e.target.value))} />
        </div>
        <div>
          <Label className="text-xs">Occupation</Label>
          <Input value={form.occupation || ""} onChange={(e) => set("occupation", onlyAlphaExt(e.target.value))} />
        </div>
        <div>
          <Label className="text-xs">Gender</Label>
          <Select value={form.gender || ""} onValueChange={(v) => set("gender", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <SectionTitle icon={<MapPin className="h-4 w-4 text-emerald-600" />} title="Address" />
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">House No.</Label>
          <Input value={form.house_number || ""} onChange={(e) => set("house_number", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Road No.</Label>
          <Input value={form.road_number || ""} onChange={(e) => set("road_number", e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Present Address</Label>
        <Textarea rows={2} value={form.present_address || ""} onChange={(e) => set("present_address", e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Permanent Address</Label>
        <Textarea rows={2} value={form.permanent_address || ""} onChange={(e) => set("permanent_address", e.target.value)} />
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        {save.isPending ? "Saving..." : "Update Personal Info"}
      </Button>
    </div>
  );
};

/* ---------------- Password Tab ---------------- */
const PasswordTab = () => {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);

  const save = useMutation({
    mutationFn: () => callPortal("change_password", { current: pw.current, new: pw.next }),
    onSuccess: () => {
      toast.success("পাসওয়ার্ড পরিবর্তিত হয়েছে");
      setPw({ current: "", next: "", confirm: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = () => {
    if (!pw.current || !pw.next) return toast.error("সব ফিল্ড পূরণ করুন");
    if (pw.next.length < 6) return toast.error("নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে");
    if (pw.next !== pw.confirm) return toast.error("Confirm password মিলছে না");
    save.mutate();
  };

  return (
    <div className="space-y-4 max-w-md">
      <SectionTitle icon={<KeyRound className="h-4 w-4 text-amber-600" />} title="Change Password" />
      <div className="space-y-3">
        {[
          { k: "current", l: "Current Password" },
          { k: "next", l: "New Password" },
          { k: "confirm", l: "Confirm New Password" },
        ].map(({ k, l }) => (
          <div key={k}>
            <Label className="text-xs">{l}</Label>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={(pw as any)[k]}
                onChange={(e) => setPw({ ...pw, [k]: e.target.value })}
              />
              {k === "current" && (
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded p-2">
        🔐 কমপক্ষে ৬ অক্ষর। পরিবর্তনের পর নতুন পাসওয়ার্ড দিয়ে আবার লগইন করতে হবে না — এই session সচল থাকবে।
      </div>
      <Button onClick={submit} disabled={save.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
        {save.isPending ? "Updating..." : "Update Password"}
      </Button>
    </div>
  );
};

/* ---------------- Picture Tab ---------------- */
const PictureTab = ({ client, qc }: any) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () => callPortal("submit_doc_update", {
      changes: { photo_url: pending },
      note: "Profile picture update",
    }),
    onSuccess: () => {
      toast.success("Picture update request পাঠানো হয়েছে — admin approval pending");
      setPending(null);
      qc.invalidateQueries({ queryKey: ["portal-profile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const onPick = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("ফাইল ৫MB এর বেশি");
    const base64 = await fileToBase64(file);
    const res = await callPortal<any>("upload_document", { filename: file.name, content_type: file.type, base64 });
    if (res.url) {
      setPending(res.url);
      toast.success("Upload হয়েছে — Submit করুন");
    }
  };

  return (
    <div className="space-y-4 max-w-md">
      <SectionTitle icon={<ImageIcon className="h-4 w-4 text-pink-600" />} title="Update Profile Picture" />
      <div className="flex items-center gap-4">
        <Avatar className="h-24 w-24 ring-2 ring-border">
          {(pending || client?.photo_url) && <AvatarImage src={pending || client?.photo_url} />}
          <AvatarFallback className="bg-muted">?</AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Choose Image
          </Button>
          {pending && <Badge className="bg-amber-100 text-amber-700 border-0 ml-1">Pending submit</Badge>}
          <p className="text-[11px] text-muted-foreground">JPG/PNG, max 5MB</p>
        </div>
      </div>
      <Button onClick={() => submit.mutate()} disabled={!pending || submit.isPending} className="bg-pink-600 hover:bg-pink-700 text-white">
        {submit.isPending ? "Submitting..." : "Submit for Approval"}
      </Button>
    </div>
  );
};

/* ---------------- Mobile Tab ---------------- */
const MobileTab = ({ client, qc }: any) => {
  const [mobile, setMobile] = useState("");
  const [reason, setReason] = useState("");

  const submit = useMutation({
    mutationFn: () => callPortal("submit_doc_update", {
      changes: { contact: mobile },
      note: reason || "Mobile number change",
    }),
    onSuccess: () => {
      toast.success("Mobile change request পাঠানো হয়েছে");
      setMobile(""); setReason("");
      qc.invalidateQueries({ queryKey: ["portal-profile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const onSubmit = () => {
    if (!validBdMobile(mobile)) return toast.error("সঠিক ১১ ডিজিট মোবাইল নম্বর দিন");
    submit.mutate();
  };

  return (
    <div className="space-y-4 max-w-md">
      <SectionTitle icon={<Phone className="h-4 w-4 text-cyan-600" />} title="Change Mobile Number" />
      <div className="bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900 rounded p-3 text-xs">
        Current: <span className="font-semibold">{client?.contact ? `+880 ${client.contact}` : "—"}</span>
      </div>
      <div>
        <Label className="text-xs">New Mobile Number</Label>
        <BdPhoneInput value={mobile} onChange={setMobile} />
      </div>
      <div>
        <Label className="text-xs">Reason (optional)</Label>
        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <Button onClick={onSubmit} disabled={submit.isPending || !mobile} className="bg-cyan-600 hover:bg-cyan-700 text-white">
        {submit.isPending ? "Submitting..." : "Submit for Approval"}
      </Button>
    </div>
  );
};

/* ---------------- History Tab ---------------- */
const HistoryTab = ({ requests }: any) => (
  <div className="space-y-3">
    <SectionTitle icon={<ClipboardList className="h-4 w-4 text-sky-600" />} title="Update Request History" />
    {requests.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-8">No requests yet</p>
    ) : (
      <div className="space-y-2">
        {requests.map((r: any) => (
          <div key={r.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
            <div className="min-w-0">
              <div className="font-medium capitalize">{r.request_type} update</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="h-3 w-3" />{new Date(r.created_at).toLocaleString()}
              </div>
              {r.note && <div className="text-xs mt-1 text-muted-foreground truncate">{r.note}</div>}
            </div>
            <Badge className={
              r.status === "approved" ? "bg-emerald-100 text-emerald-700 border-0" :
              r.status === "rejected" ? "bg-rose-100 text-rose-700 border-0" :
              "bg-amber-100 text-amber-700 border-0"
            }>
              {r.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {r.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
              {r.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
              {r.status}
            </Badge>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default PortalProfile;
