import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, Info } from "lucide-react";

interface CBSettings {
  payment_status_enable: boolean;
  allow_inactive_last_day: boolean;
  client_code_mode: "automatic" | "customizable";
  due_sms_basis: "billing_date" | "remaining_days";
  unpaid_sms_before_days: number[];
  expire_extension_who: "admin" | "pop_admin" | "both";
  expire_extension_days: number;
  pop_scheduler_auto_approval: boolean;
  status_time_active: string;
  status_time_inactive: string;
  status_time_pending: string;
  status_time_expired: string;
  status_time_disabled: string;
  pop_recharge_pg_approval: boolean;
  expiry_update_on_payment: "payment_date" | "billing_date" | "next_cycle";
  mikrotik_sync_comments: boolean;
}

const defaults: CBSettings = {
  payment_status_enable: true,
  allow_inactive_last_day: false,
  client_code_mode: "automatic",
  due_sms_basis: "billing_date",
  unpaid_sms_before_days: [3],
  expire_extension_who: "admin",
  expire_extension_days: 3,
  pop_scheduler_auto_approval: false,
  status_time_active: "00:00",
  status_time_inactive: "00:00",
  status_time_pending: "00:00",
  status_time_expired: "00:00",
  status_time_disabled: "00:00",
  pop_recharge_pg_approval: true,
  expiry_update_on_payment: "billing_date",
  mikrotik_sync_comments: false,
};

function Section({ title, info, children }: { title: string; info: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium flex items-center justify-between gap-3">
        <span className="flex items-center gap-2"><Info className="h-4 w-4" /> {title}</span>
        <span className="text-[10px] text-primary-foreground/75 hidden sm:block">{info}</span>
      </div>
      <div className="p-5 space-y-3 bg-card">{children}</div>
    </div>
  );
}

export default function ClientBillingSettings() {
  const { value, isLoading, save, isSaving } = useSystemSetting<CBSettings>("client_billing_settings", defaults);
  const [form, setForm] = useState<CBSettings>(defaults);
  useEffect(() => { setForm({ ...defaults, ...value }); }, [value]);

  const set = <K extends keyof CBSettings>(k: K, v: CBSettings[K]) => setForm(p => ({ ...p, [k]: v }));

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  const toggleDay = (d: number) => {
    const arr = form.unpaid_sms_before_days.includes(d)
      ? form.unpaid_sms_before_days.filter(x => x !== d)
      : [...form.unpaid_sms_before_days, d].sort((a, b) => a - b);
    set("unpaid_sms_before_days", arr);
  };

  return (
    <div className="space-y-4">
      <Section title="1. Payment Status Wise Client Enable/Disabled" info="পেমেন্ট স্ট্যাটাস অনুযায়ী auto enable/disable">
        <div className="flex items-center gap-3">
          <Switch checked={form.payment_status_enable} onCheckedChange={(v) => set("payment_status_enable", v)} />
          <Label className="text-sm font-normal">সক্রিয় থাকলে পেমেন্ট অবস্থান পরিবর্তনে ক্লায়েন্ট auto enable/disable হবে</Label>
        </div>
      </Section>

      <Section title="2. Allow InActive Process at Last Day of Month" info="মাসের শেষ দিনে inactive প্রসেস চালাবে কি না">
        <div className="flex items-center gap-3">
          <Switch checked={form.allow_inactive_last_day} onCheckedChange={(v) => set("allow_inactive_last_day", v)} />
          <Label className="text-sm font-normal">মাসের শেষ দিনে inactive process চালু থাকবে</Label>
        </div>
      </Section>

      <Section title="3. Client Code Mode" info="Automatic বা Customizable">
        <Select value={form.client_code_mode} onValueChange={(v) => set("client_code_mode", v as any)}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="automatic">Automatic</SelectItem>
            <SelectItem value="customizable">Customizable</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      <Section title="4. Due SMS Basis" info="Billing date বা Remaining days">
        <Select value={form.due_sms_basis} onValueChange={(v) => set("due_sms_basis", v as any)}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="billing_date">Billing Date</SelectItem>
            <SelectItem value="remaining_days">Remaining Days</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      <Section title="5. Send SMS To Unpaid Client — Before Days" info="বিল ডেডলাইনের আগে কোন কোন দিন SMS পাঠাবে">
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 5, 7].map(d => (
            <label key={d} className="flex items-center gap-2 px-3 py-1.5 border rounded-md cursor-pointer hover:bg-muted/40">
              <input
                type="checkbox"
                checked={form.unpaid_sms_before_days.includes(d)}
                onChange={() => toggleDay(d)}
                className="h-3.5 w-3.5"
              />
              <span className="text-xs">{d} দিন আগে</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="6. Expire Date Extension Permission" info="কে এবং কতদিন extend করতে পারবে">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl">
          <div>
            <Label className="text-xs mb-1 block">Whom</Label>
            <Select value={form.expire_extension_who} onValueChange={(v) => set("expire_extension_who", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="pop_admin">POP Admin</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Max Days</Label>
            <Input type="number" min={0} value={form.expire_extension_days}
              onChange={(e) => set("expire_extension_days", parseInt(e.target.value) || 0)} />
          </div>
        </div>
      </Section>

      <Section title="7. POP Client Automatic Scheduler Approval" info="POP-এর শিডিউলার auto-approve হবে কি না">
        <div className="flex items-center gap-3">
          <Switch checked={form.pop_scheduler_auto_approval} onCheckedChange={(v) => set("pop_scheduler_auto_approval", v)} />
          <Label className="text-sm font-normal">Enable automatic approval</Label>
        </div>
      </Section>

      <Section title="8. Client Billing Status Scheduler Time" info="প্রতিটি স্ট্যাটাস কোন সময়ে process হবে">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {([
            ["status_time_active", "Active"],
            ["status_time_inactive", "Inactive"],
            ["status_time_pending", "Pending"],
            ["status_time_expired", "Expired"],
            ["status_time_disabled", "Disabled"],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <Label className="text-xs mb-1 block">{label}</Label>
              <Input type="time" value={form[key]} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="9. POP Client Recharge Approval on PG Transactions" info="PGW থেকে আসা রিচার্জ admin approval লাগবে কি না">
        <div className="flex items-center gap-3">
          <Switch checked={form.pop_recharge_pg_approval} onCheckedChange={(v) => set("pop_recharge_pg_approval", v)} />
          <Label className="text-sm font-normal">Approval দরকার</Label>
        </div>
      </Section>

      <Section title="10. POP Client Expiry Update Policy on Payment Date" info="পেমেন্টের পর expire date কোথা থেকে কাউন্ট হবে">
        <Select value={form.expiry_update_on_payment} onValueChange={(v) => set("expiry_update_on_payment", v as any)}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="payment_date">Payment Date থেকে</SelectItem>
            <SelectItem value="billing_date">Billing Date থেকে</SelectItem>
            <SelectItem value="next_cycle">পরবর্তী সাইকেলের শুরু থেকে</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      <Section title="11. MikroTik PPP Secret Comment Sync" info="ক্লায়েন্ট remarks রাউটারের comment field-এ sync করুন">
        <div className="flex items-center gap-3">
          <Switch checked={form.mikrotik_sync_comments} onCheckedChange={(v) => set("mikrotik_sync_comments", v)} />
          <Label className="text-sm font-normal">
            চালু থাকলে comment save করার সময় MikroTik secret-এর comment field-ও আপডেট হবে। Empty save করলে router-এ-ও clear হবে।
          </Label>
        </div>
      </Section>

      <div className="flex justify-end sticky bottom-2">
        <Button onClick={() => save(form)} disabled={isSaving} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
          <Save className="h-4 w-4" /> {isSaving ? "সংরক্ষণ হচ্ছে..." : "সব সেটিংস সংরক্ষণ"}
        </Button>
      </div>
    </div>
  );
}
