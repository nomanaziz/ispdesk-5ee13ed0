import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "lucide-react";
import { toast } from "sonner";

interface Props {
  employee: any | null;
  onClose: () => void;
}

// Sat-Fri mapping used across HR UI: 0=Sat,1=Sun,2=Mon,3=Tue,4=Wed,5=Thu,6=Fri
const DAYS = [
  { idx: 0, label: "শনিবার" },
  { idx: 1, label: "রবিবার" },
  { idx: 2, label: "সোমবার" },
  { idx: 3, label: "মঙ্গলবার" },
  { idx: 4, label: "বুধবার" },
  { idx: 5, label: "বৃহস্পতিবার" },
  { idx: 6, label: "শুক্রবার" },
];

export default function EmployeeHolidaysDialog({ employee, onClose }: Props) {
  const qc = useQueryClient();
  const [days, setDays] = useState<number[]>([]);

  useEffect(() => {
    if (employee) setDays(Array.isArray(employee.weekly_off_days) ? employee.weekly_off_days : []);
  }, [employee]);

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const { data: holidays } = useQuery({
    queryKey: ["holidays-range", iso(start), iso(end)],
    enabled: !!employee,
    queryFn: async () => {
      const { data } = await supabase
        .from("events_holidays")
        .select("*")
        .gte("event_date", iso(start))
        .lte("event_date", iso(end))
        .order("event_date");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("employees")
        .update({ weekly_off_days: days } as any)
        .eq("id", employee.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("সাপ্তাহিক ছুটি সংরক্ষণ হয়েছে");
      qc.invalidateQueries({ queryKey: ["employees"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = (idx: number) => {
    setDays((d) => (d.includes(idx) ? d.filter((x) => x !== idx) : [...d, idx]));
  };

  return (
    <Dialog open={!!employee} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> {employee?.name} — সাপ্তাহিক ছুটি
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              যে দিনগুলো tick করবেন সেগুলো এই কর্মীর জন্য automatic সাপ্তাহিক ছুটি হিসাবে গণ্য হবে।
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DAYS.map((d) => (
                <label
                  key={d.idx}
                  className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox checked={days.includes(d.idx)} onCheckedChange={() => toggle(d.idx)} />
                  <span className="text-sm">{d.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-sm">
              আসন্ন কোম্পানি ছুটি / অনুষ্ঠান ({iso(start)} → {iso(end)})
            </h3>
            {(holidays || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">কোনো ছুটি নেই</p>
            ) : (
              <div className="space-y-2">
                {(holidays || []).map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between border rounded p-3">
                    <div>
                      <p className="font-medium text-sm">{h.title}</p>
                      {h.description && (
                        <p className="text-xs text-muted-foreground">{h.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant={h.type === "holiday" ? "destructive" : "secondary"}>
                        {h.type || "event"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {h.event_date}
                        {h.end_date && h.end_date !== h.event_date ? ` → ${h.end_date}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>বাতিল</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>সংরক্ষণ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
