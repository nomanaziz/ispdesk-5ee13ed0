import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePopScope } from "@/hooks/usePopScope";
import { callPortal } from "@/lib/portalApi";

interface Props {
  client: any;
  invalidateKey?: string;
}

function calcRemaining(expire?: string | null): number | null {
  if (!expire) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expire);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
}

export default function RemainingDaysCell({ client, invalidateKey = "billing-list" }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const remaining = calcRemaining(client.expire_date);
  const [days, setDays] = useState(String(remaining ?? 0));
  const [saving, setSaving] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setDays(String(Math.max(0, remaining ?? 0)));
    setOpen(isOpen);
  };

  const handleSave = async () => {
    const n = parseInt(days);
    if (isNaN(n) || n < 0 || n > 365) {
      toast.error("দিনের সংখ্যা ০-৩৬৫ এর মধ্যে হতে হবে");
      return;
    }
    setSaving(true);
    try {
      const target = new Date();
      target.setHours(0, 0, 0, 0);
      target.setDate(target.getDate() + n);
      const iso = target.toISOString().slice(0, 10);
      const { error } = await supabase.from("clients").update({ expire_date: iso }).eq("id", client.id);
      if (error) throw error;
      toast.success("R.Days আপডেট হয়েছে");
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "আপডেট ব্যর্থ");
    } finally {
      setSaving(false);
    }
  };

  let label: string;
  let pillClass: string;
  if (remaining === null) {
    label = "—";
    pillClass = "bg-muted text-muted-foreground";
  } else if (remaining < 0) {
    label = "Expired";
    pillClass = "bg-destructive/15 text-destructive border-destructive/30";
  } else if (remaining <= 7) {
    label = String(remaining);
    pillClass = "bg-destructive/15 text-destructive border-destructive/30";
  } else {
    label = String(remaining);
    pillClass = "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center justify-center min-w-[42px] h-6 px-2 rounded-full border text-xs font-semibold cursor-pointer hover:opacity-80 transition ${pillClass}`}
          title="R.Days পরিবর্তন করুন"
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 space-y-3" align="start">
        <div className="text-xs font-medium text-foreground">Remaining Days সেট করুন</div>
        <div>
          <Label className="text-[10px]">নতুন R.Days (0-365)</Label>
          <Input
            type="number"
            min={0}
            max={365}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="h-8 text-xs"
            autoFocus
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Expire Date: আজ + {days || 0} দিন
          </p>
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
