import { X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface QuickSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SettingRowProps {
  settingKey: string;
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}

function SettingRow({ settingKey, label, hint, options, defaultValue }: SettingRowProps) {
  const { value, save, isSaving } = useSystemSetting<{ value: string }>(settingKey, { value: defaultValue });
  const [local, setLocal] = useState<string>(value?.value ?? defaultValue);

  useEffect(() => {
    if (value?.value) setLocal(value.value);
  }, [value?.value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent><p className="text-xs max-w-xs">{hint}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <RadioGroup value={local} onValueChange={setLocal} className="flex flex-wrap gap-3">
          {options.map((opt) => (
            <div key={opt.value} className="flex items-center gap-1.5">
              <RadioGroupItem value={opt.value} id={`${settingKey}-${opt.value}`} />
              <Label htmlFor={`${settingKey}-${opt.value}`} className="text-xs cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
        <Button
          size="sm"
          className="h-7 px-3 text-xs shrink-0"
          disabled={isSaving || local === (value?.value ?? defaultValue)}
          onClick={() => save({ value: local })}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

const yesNo = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];

export function QuickSettings({ open, onOpenChange }: QuickSettingsProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[340px] sm:w-[400px] p-0 overflow-y-auto">
        <SheetHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold tracking-wide">QUICK SETTING</SheetTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">দ্রুত সিস্টেম সেটিংস</p>
        </SheetHeader>
        <Separator />
        <div className="px-5 py-4 space-y-5">
          <SettingRow
            settingKey="qs_bill_generate_period"
            label="Bill generate period"
            hint="মাসের শুরু থেকে নাকি তারিখ থেকে তারিখ অনুযায়ী বিল তৈরি হবে"
            options={[{ value: "start_of_month", label: "Start of month" }, { value: "date_to_date", label: "Date to date" }]}
            defaultValue="start_of_month"
          />
          <Separator />
          <SettingRow
            settingKey="qs_inactive_last_day"
            label="Allow inactive process at last day of month"
            options={yesNo}
            defaultValue="no"
          />
          <Separator />
          <SettingRow
            settingKey="qs_bw_pop_invoice_daily"
            label="Allow bandwidth POP invoice daily basis"
            options={yesNo}
            defaultValue="no"
          />
          <Separator />
          <SettingRow
            settingKey="qs_payment_status_client_toggle"
            label="Payment status wise client enable/disable"
            options={yesNo}
            defaultValue="yes"
          />
          <Separator />
          <SettingRow
            settingKey="qs_show_company_in_invoice"
            label="Show company name in invoice"
            options={yesNo}
            defaultValue="yes"
          />
          <Separator />
          <SettingRow
            settingKey="qs_client_code_mode"
            label="Client code automatic or customizable"
            options={[{ value: "customizable", label: "Customizable" }, { value: "automatic", label: "Automatic" }]}
            defaultValue="automatic"
          />
          <Separator />
          <SettingRow
            settingKey="qs_sms_unpaid_before_days"
            label="Send SMS to unpaid client before"
            options={[
              { value: "1", label: "1 day" },
              { value: "2", label: "2 days" },
              { value: "3", label: "3 days" },
              { value: "5", label: "5 days" },
            ]}
            defaultValue="3"
          />
          <Separator />
          <SettingRow
            settingKey="qs_outside_payment_link"
            label="Outside bill payment link enable/disable"
            options={yesNo}
            defaultValue="yes"
          />
          <Separator />
          <SettingRow
            settingKey="qs_outside_payment_verification"
            label="Outside bill payment verification code"
            options={yesNo}
            defaultValue="yes"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
