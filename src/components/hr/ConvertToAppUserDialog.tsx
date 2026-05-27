import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { UserPlus, ShieldCheck } from "lucide-react";

interface Employee { id: string; name: string; employee_id?: string | null; }
interface Props {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}

interface Role { id: string; name: string; }

const EMPLOYEE_ROLE_ID = "33333333-3333-3333-3333-333333333333";

export default function ConvertToAppUserDialog({ employee, open, onOpenChange, onCreated }: Props) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [existing, setExisting] = useState<{ id: string; username: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirm: "",
    role_id: EMPLOYEE_ROLE_ID,
    extra_role_ids: [] as string[],
  });

  useEffect(() => {
    if (!open || !employee) return;
    (async () => {
      const [r, u] = await Promise.all([
        supabase.from("app_roles").select("id,name").eq("status", "Active").order("name"),
        supabase.from("app_users").select("id,username").eq("employee_id", employee.id).maybeSingle(),
      ]);
      if (r.data) setRoles(r.data as any);
      setExisting((u.data as any) || null);
      setForm({
        username:
          employee.employee_id ||
          employee.name?.toLowerCase().replace(/\s+/g, ".") ||
          "",
        password: "",
        confirm: "",
        role_id: EMPLOYEE_ROLE_ID,
        extra_role_ids: [],
      });
    })();
  }, [open, employee]);

  const toggleExtra = (id: string) => {
    setForm((f) => ({
      ...f,
      extra_role_ids: f.extra_role_ids.includes(id)
        ? f.extra_role_ids.filter((x) => x !== id)
        : [...f.extra_role_ids, id],
    }));
  };

  const save = async () => {
    if (!employee) return;
    if (existing) {
      toast.error("এই employee-র জন্য আগে থেকেই App User আছে");
      return;
    }
    if (!form.username.trim()) return toast.error("Username দিন");
    if (!form.password) return toast.error("পাসওয়ার্ড দিন");
    if (form.password !== form.confirm) return toast.error("পাসওয়ার্ড মিলছে না");

    setLoading(true);
    const { data, error } = await supabase
      .from("app_users")
      .insert({
        employee_id: employee.id,
        username: form.username.trim(),
        password: form.password,
        role_id: form.role_id,
        status: "Active",
      })
      .select("id")
      .single();

    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    const extras = form.extra_role_ids.filter((rid) => rid !== form.role_id);
    if (extras.length > 0 && data?.id) {
      await supabase
        .from("app_user_extra_roles")
        .insert(extras.map((rid) => ({ user_id: data.id, role_id: rid })));
    }

    setLoading(false);
    toast.success("App User তৈরি হয়েছে — Employee role auto-attached");
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> App User বানান
          </DialogTitle>
          <DialogDescription>
            {employee?.name} {employee?.employee_id ? `(${employee.employee_id})` : ""}
          </DialogDescription>
        </DialogHeader>

        {existing ? (
          <div className="p-4 rounded-md border bg-muted/40 text-sm">
            এই employee-র App User আগেই আছে: <Badge>{existing.username}</Badge>
            <div className="mt-2 text-xs text-muted-foreground">
              পরিবর্তন করতে Access → App Users পেজে যান।
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border bg-primary/5 p-3 text-xs flex gap-2">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5" />
              <span>
                <strong>Employee</strong> role-এর common permissions (food, attendance, payslip, conveyance)
                automatic যুক্ত হবে — তার উপরে আপনি বাড়তি role দিতে পারেন।
              </span>
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
            <div>
              <Label>Primary Role</Label>
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="font-medium">Employee</span>
                <Badge variant="outline" className="ml-auto text-xs">🔒 Fixed</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Employee-র জন্য primary role সবসময় "Employee" — পরিবর্তনযোগ্য না।
              </p>
            </div>
            <div>
              <Label>অতিরিক্ত Role (Department-ভিত্তিক)</Label>
              <div className="rounded-md border p-2 grid grid-cols-2 gap-2 max-h-40 overflow-auto">
                {roles
                  .filter((r) => r.id !== form.role_id && r.id !== EMPLOYEE_ROLE_ID)
                  .map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.extra_role_ids.includes(r.id)}
                        onCheckedChange={() => toggleExtra(r.id)}
                      />
                      {r.name}
                    </label>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Billing, HR, Accounts ইত্যাদি department-ভিত্তিক বাড়তি permission যুক্ত করুন।
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          {!existing && (
            <Button onClick={save} disabled={loading}>
              {loading ? "তৈরি হচ্ছে..." : "App User তৈরি করুন"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
