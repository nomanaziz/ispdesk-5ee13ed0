import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callPortal } from "@/lib/portalApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { UserCog, Upload, FileText, Image as ImageIcon, ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      resolve(s.split(",")[1] || "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const PortalProfile = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["portal-profile"],
    queryFn: () => callPortal<any>("get_profile"),
  });
  const client = data?.client;
  const requests: any[] = data?.requests || [];

  const [form, setForm] = useState<any>({});
  const [docName, setDocName] = useState("");
  const [docNid, setDocNid] = useState("");
  const fileRefs = {
    photo: useRef<HTMLInputElement>(null),
    nidFront: useRef<HTMLInputElement>(null),
    nidBack: useRef<HTMLInputElement>(null),
  };
  const [pendingDocs, setPendingDocs] = useState<{ photo_url?: string; nid_front_url?: string; nid_back_url?: string }>({});

  useEffect(() => {
    if (!client) return;
    setForm({
      contact: client.contact || "",
      email: client.email || "",
      present_address: client.present_address || client.address || "",
      permanent_address: client.permanent_address || "",
    });
    setDocName(client.name || "");
    setDocNid(client.nid_number || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  const saveProfile = useMutation({
    mutationFn: () => callPortal("update_profile", form),
    onSuccess: () => {
      toast.success("প্রোফাইল আপডেট হয়েছে");
      qc.invalidateQueries({ queryKey: ["portal-profile"] });
      qc.invalidateQueries({ queryKey: ["portal-dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const upload = async (file: File): Promise<string | null> => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ফাইল ৫MB এর বেশি");
      return null;
    }
    const base64 = await fileToBase64(file);
    const res = await callPortal<any>("upload_document", {
      filename: file.name,
      content_type: file.type,
      base64,
    });
    return res.url || null;
  };

  const onPick = async (kind: "photo_url" | "nid_front_url" | "nid_back_url", file?: File) => {
    if (!file) return;
    const url = await upload(file);
    if (url) {
      setPendingDocs((p) => ({ ...p, [kind]: url }));
      toast.success("ফাইল আপলোড হয়েছে — Submit করে অনুমোদনের জন্য পাঠান");
    }
  };

  const submitDocs = useMutation({
    mutationFn: () => callPortal("submit_doc_update", {
      changes: {
        ...pendingDocs,
        ...(docName && docName !== client?.name ? { name: docName } : {}),
        ...(docNid && docNid !== client?.nid_number ? { nid_number: docNid } : {}),
      },
      note: "Self-submitted via portal",
    }),
    onSuccess: () => {
      toast.success("Update request পাঠানো হয়েছে — admin approval এর জন্য pending");
      setPendingDocs({});
      qc.invalidateQueries({ queryKey: ["portal-profile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const initials = client?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const hasDocChanges = Object.keys(pendingDocs).length > 0 || docName !== client?.name || docNid !== client?.nid_number;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow">
          <UserCog className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">My Profile</h1>
          <p className="text-sm text-muted-foreground">নিজের তথ্য আপডেট করুন</p>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">লোড হচ্ছে...</CardContent></Card>
      ) : (
        <>
          {/* Self-update fields */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCog className="h-4 w-4 text-violet-600" /> Contact & Address (instant)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Mobile</Label>
                  <Input value={form.contact || ""} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Present Address</Label>
                <Textarea rows={2} value={form.present_address || ""} onChange={(e) => setForm({ ...form, present_address: e.target.value })} />
              </div>
              <div>
                <Label>Permanent Address</Label>
                <Textarea rows={2} value={form.permanent_address || ""} onChange={(e) => setForm({ ...form, permanent_address: e.target.value })} />
              </div>
              <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
                {saveProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Documents — needs approval */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600" /> Identity Documents
                <Badge variant="outline" className="ml-2 text-[10px]">Admin approval needed</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Full Name</Label>
                  <Input value={docName} onChange={(e) => setDocName(e.target.value)} />
                </div>
                <div>
                  <Label>NID Number</Label>
                  <Input value={docNid} onChange={(e) => setDocNid(e.target.value)} />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <FileSlot
                  label="Profile Photo"
                  icon={<ImageIcon className="h-4 w-4" />}
                  current={client?.photo_url}
                  pending={pendingDocs.photo_url}
                  refEl={fileRefs.photo}
                  onPick={(f) => onPick("photo_url", f)}
                  fallback={<Avatar className="h-16 w-16"><AvatarFallback>{initials}</AvatarFallback></Avatar>}
                />
                <FileSlot
                  label="NID Front"
                  icon={<FileText className="h-4 w-4" />}
                  current={client?.nid_front_url}
                  pending={pendingDocs.nid_front_url}
                  refEl={fileRefs.nidFront}
                  onPick={(f) => onPick("nid_front_url", f)}
                />
                <FileSlot
                  label="NID Back"
                  icon={<FileText className="h-4 w-4" />}
                  current={client?.nid_back_url}
                  pending={pendingDocs.nid_back_url}
                  refEl={fileRefs.nidBack}
                  onPick={(f) => onPick("nid_back_url", f)}
                />
              </div>

              <Button onClick={() => submitDocs.mutate()} disabled={!hasDocChanges || submitDocs.isPending}>
                {submitDocs.isPending ? "Submitting..." : "Submit for Approval"}
              </Button>
            </CardContent>
          </Card>

          {/* Pending requests */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-sky-600" /> My Update Requests</CardTitle></CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No requests yet</p>
              ) : (
                <div className="space-y-2">
                  {requests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                      <div>
                        <div className="font-medium capitalize">{r.request_type} update</div>
                        <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                        {r.note && <div className="text-xs mt-1">{r.note}</div>}
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

const FileSlot = ({ label, icon, current, pending, refEl, onPick, fallback }: any) => (
  <div className="border rounded-lg p-3 space-y-2">
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{icon} {label}</div>
    <div className="aspect-[4/3] bg-muted/30 rounded flex items-center justify-center overflow-hidden">
      {pending ? (
        <img src={pending} alt={label} className="w-full h-full object-cover" />
      ) : current ? (
        <img src={current} alt={label} className="w-full h-full object-cover" />
      ) : fallback || <ImageIcon className="h-8 w-8 text-muted-foreground/40" />}
    </div>
    <input
      ref={refEl}
      type="file"
      accept="image/*,application/pdf"
      className="hidden"
      onChange={(e) => onPick(e.target.files?.[0])}
    />
    <Button variant="outline" size="sm" className="w-full" onClick={() => refEl.current?.click()}>
      <Upload className="h-3.5 w-3.5" /> {pending ? "Replace" : current ? "Change" : "Upload"}
    </Button>
    {pending && <Badge className="w-full justify-center bg-amber-100 text-amber-700 border-0">Pending submit</Badge>}
  </div>
);

export default PortalProfile;
