import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface Props {
  employee: any | null;
  onClose: () => void;
}

export default function EmployeeHolidaysDialog({ employee, onClose }: Props) {
  // Range: from start of current month to end of next month
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

  const { data: shift } = useQuery({
    queryKey: ["emp-shift", employee?.default_shift_id],
    enabled: !!employee?.default_shift_id,
    queryFn: async () => {
      const { data } = await supabase.from("shifts").select("*").eq("id", employee.default_shift_id).maybeSingle();
      return data;
    },
  });

  return (
    <Dialog open={!!employee} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> {employee?.name} — ছুটি ও ক্যালেন্ডার
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {shift && (
            <div className="bg-muted/40 rounded p-3 text-sm">
              <p className="font-semibold mb-1">শিফট: {shift.name}</p>
              <p className="text-muted-foreground">
                সময়: {shift.start_time} — {shift.end_time}
              </p>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">আসন্ন ছুটি / অনুষ্ঠান ({iso(start)} → {iso(end)})</h3>
            {(holidays || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">কোনো ছুটি নেই</p>
            ) : (
              <div className="space-y-2">
                {(holidays || []).map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between border rounded p-3">
                    <div>
                      <p className="font-medium">{h.title}</p>
                      {h.description && <p className="text-xs text-muted-foreground">{h.description}</p>}
                    </div>
                    <div className="text-right">
                      <Badge variant={h.type === "holiday" ? "destructive" : "secondary"}>{h.type || "event"}</Badge>
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
      </DialogContent>
    </Dialog>
  );
}
