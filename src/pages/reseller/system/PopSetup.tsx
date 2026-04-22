import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePopSystemSetting } from "@/hooks/usePopSystemSetting";
import { useState, useEffect } from "react";
import { Settings2, Save } from "lucide-react";

interface ClientBillingSettings {
  paymentStatusWiseEnableDisable: boolean;
  allowInactiveAtMonthEnd: boolean;
  clientCodeMode: "automatic" | "customizable";
  dueSmsMode: "billing_date" | "remaining_days";
  smsBeforeDays: number;
  expiryExtendWhom: "all" | "manager" | "admin";
  expiryExtendDays: number;
  popSchedulerAutoApproval: boolean;
  popPgwAutoApproval: boolean;
  popExpiryUpdatePolicy: "payment_date" | "due_date" | "fixed";
  statusTimes: { active: string; inactive: string; expired: string; suspended: string; new: string };
}

const DEFAULT_BILLING: ClientBillingSettings = {
  paymentStatusWiseEnableDisable: true,
  allowInactiveAtMonthEnd: false,
  clientCodeMode: "automatic",
  dueSmsMode: "billing_date",
  smsBeforeDays: 3,
  expiryExtendWhom: "manager",
  expiryExtendDays: 3,
  popSchedulerAutoApproval: false,
  popPgwAutoApproval: false,
  popExpiryUpdatePolicy: "payment_date",
  statusTimes: { active: "00:05", inactive: "23:55", expired: "00:10", suspended: "00:15", new: "00:20" },
};

interface CommonSettings {
  systemName: string;
  defaultLanguage: "bn" | "en";
  timezone: string;
  currency: string;
  dateFormat: string;
}
const DEFAULT_COMMON: CommonSettings = {
  systemName: "ISP Desk",
  defaultLanguage: "bn",
  timezone: "Asia/Dhaka",
  currency: "BDT",
  dateFormat: "DD/MM/YYYY",
};

export default function PopSetup() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Settings2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">সিস্টেম সেটআপ</h1>
          <p className="text-sm text-muted-foreground">কমন এবং ক্লায়েন্ট-বিলিং সেটিংস</p>
        </div>
      </div>

      <Tabs defaultValue="common">
        <TabsList>
          <TabsTrigger value="common">Common System Settings</TabsTrigger>
          <TabsTrigger value="billing">Clients &amp; Billing Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="common" className="mt-4">
          <CommonTab />
        </TabsContent>
        <TabsContent value="billing" className="mt-4">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CommonTab() {
  const { value, save, isSaving } = usePopSystemSetting<CommonSettings>("common_settings", DEFAULT_COMMON);
  const [form, setForm] = useState<CommonSettings>(value);
  useEffect(() => setForm(value), [value]);

  return (
    <Card>
      <CardHeader><CardTitle>কমন সেটিংস</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>System Name</Label>
          <Input value={form.systemName} onChange={(e) => setForm({ ...form, systemName: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Default Language</Label>
          <Select value={form.defaultLanguage} onValueChange={(v: any) => setForm({ ...form, defaultLanguage: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bn">বাংলা</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Date Format</Label>
          <Input value={form.dateFormat} onChange={(e) => setForm({ ...form, dateFormat: e.target.value })} />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button onClick={() => save(form)} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />সংরক্ষণ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BillingTab() {
  const { value, save, isSaving } = usePopSystemSetting<ClientBillingSettings>(
    "client_billing_settings",
    DEFAULT_BILLING,
  );
  const [form, setForm] = useState<ClientBillingSettings>(value);
  useEffect(() => setForm({ ...DEFAULT_BILLING, ...value, statusTimes: { ...DEFAULT_BILLING.statusTimes, ...(value as any).statusTimes } }), [value]);

  const update = <K extends keyof ClientBillingSettings>(k: K, v: ClientBillingSettings[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const Row = ({ title, info, children }: { title: string; info?: string; children: React.ReactNode }) => (
    <Card>
      <CardContent className="p-4 grid md:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="space-y-2">
          <div className="font-semibold">{title}</div>
          <div>{children}</div>
        </div>
        {info && (
          <div className="text-xs bg-muted/50 border rounded p-3 text-muted-foreground">{info}</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3">
      <Row title="1. Payment Status Wise Client Enable/Disabled" info="Paid client auto-enable, unpaid auto-disable based on bill status.">
        <Switch checked={form.paymentStatusWiseEnableDisable} onCheckedChange={(v) => update("paymentStatusWiseEnableDisable", v)} />
      </Row>
      <Row title="2. Allow InActive Process at last day of month" info="Allow disabling process to run on the last day of the billing month.">
        <Switch checked={form.allowInactiveAtMonthEnd} onCheckedChange={(v) => update("allowInactiveAtMonthEnd", v)} />
      </Row>
      <Row title="3. Client Code Mode" info="Automatic = system generated; Customizable = manual entry allowed.">
        <Select value={form.clientCodeMode} onValueChange={(v: any) => update("clientCodeMode", v)}>
          <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="automatic">Automatic</SelectItem>
            <SelectItem value="customizable">Customizable</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row title="4. Due SMS Mode" info="Send Due SMS based on Billing Date or Remaining Days.">
        <Select value={form.dueSmsMode} onValueChange={(v: any) => update("dueSmsMode", v)}>
          <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="billing_date">Billing Date</SelectItem>
            <SelectItem value="remaining_days">Remaining Days</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row title="5. Send SMS To Unpaid Client — Before Days" info="How many days before expiry the SMS will be sent.">
        <Select value={String(form.smsBeforeDays)} onValueChange={(v) => update("smsBeforeDays", Number(v))}>
          <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} day(s)</SelectItem>)}
          </SelectContent>
        </Select>
      </Row>
      <Row title="6. Client Billing Expire Date Extension Permission" info="Who can extend a client's expiry, and by how many days.">
        <div className="flex gap-2">
          <Select value={form.expiryExtendWhom} onValueChange={(v: any) => update("expiryExtendWhom", v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="manager">Manager Only</SelectItem>
              <SelectItem value="admin">Admin Only</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" className="w-28" value={form.expiryExtendDays} onChange={(e) => update("expiryExtendDays", Number(e.target.value))} />
        </div>
      </Row>
      <Row title="7. POP Client Automatic Scheduler Approval" info="Enable to auto-approve scheduler-based status changes.">
        <Switch checked={form.popSchedulerAutoApproval} onCheckedChange={(v) => update("popSchedulerAutoApproval", v)} />
      </Row>
      <Row title="8. POP Client Recharge Approval on PG Transactions" info="Auto-approve recharges from payment gateway transactions.">
        <Switch checked={form.popPgwAutoApproval} onCheckedChange={(v) => update("popPgwAutoApproval", v)} />
      </Row>
      <Row title="9. POP Client Expiry Date Update Policy on Payment Date" info="When client pays, expiry resets from this anchor.">
        <Select value={form.popExpiryUpdatePolicy} onValueChange={(v: any) => update("popExpiryUpdatePolicy", v)}>
          <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="payment_date">Payment Date</SelectItem>
            <SelectItem value="due_date">Due Date</SelectItem>
            <SelectItem value="fixed">Fixed Cycle</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row title="10. Client Billing Status Scheduler Time" info="Daily run time for each status scheduler (HH:MM 24h).">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {(["active", "inactive", "expired", "suspended", "new"] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label className="text-xs capitalize">{k}</Label>
              <Input type="time" value={form.statusTimes[k]} onChange={(e) =>
                setForm((p) => ({ ...p, statusTimes: { ...p.statusTimes, [k]: e.target.value } }))} />
            </div>
          ))}
        </div>
      </Row>

      <div className="flex justify-end">
        <Button onClick={() => save(form)} disabled={isSaving} size="lg">
          <Save className="h-4 w-4 mr-2" />সব সেটিংস সংরক্ষণ
        </Button>
      </div>
    </div>
  );
}
