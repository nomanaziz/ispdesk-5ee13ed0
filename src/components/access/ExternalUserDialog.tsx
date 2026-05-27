import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Globe, Wrench } from "lucide-react";

interface Role { id: string; name: string; }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
  mode: "external" | "remote_support";
}

const REMOTE_SUPPORT_ROLE_ID = "44444444-4444-4444-4444-444444444444";

export default function ExternalUserDialog({ open, onOpenChange, onCreated, mode }: Props) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    username: "",
    password: "",
    confirm: "",
    role_id: mode === "remote_support" ? REMOTE_SUPPORT_ROLE_ID : "",
    purpose: "",
    expires_hours: mode === "remote_support" ? 24 : 168, // 24h / 7d
  });

  useEffect(() => {
    if (!open) return;
    supabase
      .from("app_roles")
      .select("id,name")
      .eq("status", "Active")
      .order("name")
      .then(({ data }) => setRoles((data as any) || []));
    setForm({
      full_name: "",
      email: "",
      username: "",
      password: "",
      confirm: "",
      role_id: mode === "remote_support" ? REMOTE_SUPPORT_ROLE_ID : "",
      purpose: "",
      expires_hours: mode === "remote_support" ? 24 : 168,
    });
  }, [open, mode]);

  const save = async () => {
    if (!form.username.trim()) return toast.error("Username দিন");
    if (!form.password) return toast.error("পাসওয়ার্ড দিন");
    if (form.password !== form.confirm) return toast.error("পাসওয়ার্ড মিলছে না");
    if (!form.role_id) return toast.error("Role সিলেক্ট করুন");

    const expires_at =
      form.expires_hours > 0
        ? new Date(Date.now() + form.expires_hours * 3600 * 1000).toISOString()
        : null;

    setLoading(true);
    const { error } = await supabase.from("app_users").insert({
      username: form.username.trim(),
      password: form.password,
      role_id: form.role_id,
      status: "Active",
      user_type: mode,
      full_name: form.full_name.trim() || null,
      email: form.email.trim() || null,
      purpose: form.purpose.trim() || null,
      access_expires_at: expires_at,
    } as any);
    setLoading(false);

    if (error) return toast.error(error.message);
    toast.success(mode === "remote_support" ? "Remote Support access দেওয়া হলো" : "External user তৈরি হলো");
    onOpenChange(false);
    onCreated?.();
  };

  const Icon = mode === "remote_support" ? Wrench : Globe;
  const title = mode === "remote_support" ? "Remote Support Access" : "External User যোগ করুন";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" /> {title}
          </DialogTitle>
          <DialogDescription>
            {mode === "remote_support"
              ? "Vendor/technician-কে temporary read-only access দিন। সময় শেষ হলে auto লগইন বন্ধ।"
              : "Company-র বাইরের কাউকে (vendor, partner, auditor) সীমিত মেয়াদের access দিন।"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>পুরো নাম</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Username *</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>পাসওয়ার্ড *</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <Label>Confirm *</Label>
              <Input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            </div>
          </div>

          {mode === "remote_support" ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              Role: <strong>Remote Support</strong> (read-only — Devices, Network, OLT, Tickets)
            </div>
          ) : (
            <div>
              <Label>Role *</Label>
              <Select value={form.role_id} onValueChange={(v) => setForm({ ...form, role_id: v })}>
                <SelectTrigger><SelectValue placeholder="রোল সিলেক্ট করুন" /></SelectTrigger>
                <SelectContent>
                  {roles
                    .filter((r) => r.id !== "33333333-3333-3333-3333-333333333333")
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Access Expiry (ঘণ্টা)</Label>
              <Input
                type="number"
                min={0}
                value={form.expires_hours}
                onChange={(e) => setForm({ ...form, expires_hours: Number(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">0 = কখনো expire হবে না</p>
            </div>
            <div>
              <Label>উদ্দেশ্য / Purpose</Label>
              <Input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="e.g. MikroTik troubleshoot"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={save} disabled={loading}>
            {loading ? "তৈরি হচ্ছে..." : "Access দিন"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
