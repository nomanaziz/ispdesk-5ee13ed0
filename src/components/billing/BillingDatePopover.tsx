import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";

interface Props {
  client: any;
  invalidateKey?: string;
}

export default function BillingDatePopover({ client, invalidateKey = "billing-list" }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [billingDate, setBillingDate] = useState(String(client.billing_date || 1));
  const [expireDate, setExpireDate] = useState(client.expire_date || "");
  const [saving, setSaving] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setBillingDate(String(client.billing_date || 1));
      // Auto-calculate next expire date based on billing_date
      const bd = client.billing_date || 1;
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth(); // 0-indexed
      // If today is past the billing date, set to next month
      if (now.getDate() >= bd) {
        month += 1;
        if (month > 11) { month = 0; year++; }
      }
      // Clamp to last day of month
      const lastDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(bd, lastDay);
      const suggested = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      setExpireDate(client.expire_date || suggested);
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("clients").update({
        billing_date: parseInt(billingDate),
        expire_date: expireDate,
      }).eq("id", client.id);
      if (error) throw error;
      toast.success("বিলিং তারিখ আপডেট হয়েছে");
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "আপডেট ব্যর্থ");
    } finally {
      setSaving(false);
    }
  };

  const handleExtend = () => {
    const bd = parseInt(billingDate) || 1;
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1; // next month
    if (now.getDate() >= bd) month += 1;
    if (month > 12) { month -= 12; year++; }
    const lastDay = new Date(year, month, 0).getDate();
    const day = Math.min(bd, lastDay);
    setExpireDate(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button className="text-left hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-primary">{client.billing_date || "-"}</span>
            <CalendarClock className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="text-[10px] text-muted-foreground">{client.expire_date || "-"}</div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3" align="start">
        <div className="text-xs font-medium text-foreground">বিলিং তারিখ সেট করুন</div>

        <div>
          <Label className="text-[10px]">বিলিং তারিখ (1-27)</Label>
          <Select value={billingDate} onValueChange={setBillingDate}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-48">
              {Array.from({ length: 27 }, (_, i) => i + 1).map(n => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[10px]">মেয়াদ (Expire Date)</Label>
          <Input
            type="date"
            value={expireDate}
            onChange={e => setExpireDate(e.target.value)}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            variant="link"
            size="sm"
            className="text-[10px] h-5 px-0 text-primary"
            onClick={handleExtend}
          >
            পরবর্তী মাসে এক্সটেন্ড →
          </Button>
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "..." : "সংরক্ষণ"}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(false)}>
            বাতিল
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
