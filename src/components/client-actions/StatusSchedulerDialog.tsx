import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "active", label: "Active", time: "12:30 AM" },
  { value: "inactive", label: "Inactive", time: "11:30 PM" },
  { value: "personal", label: "Personal", time: "12:30 AM" },
  { value: "free", label: "Free", time: "12:30 AM" },
  { value: "left", label: "Left", time: "11:30 PM" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
  invalidateKey?: string;
}

export default function StatusSchedulerDialog({ open, onOpenChange, client, invalidateKey = "clients-list" }: Props) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [execDate, setExecDate] = useState<Date>();
  const [execTime, setExecTime] = useState("12:30 AM");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_schedulers").insert({
        client_id: client.id,
        scheduler_type: "status_scheduler",
        schedule_info: status,
        execution_time: execTime,
        remarks,
        schedule_date: execDate ? format(execDate, "yyyy-MM-dd") : null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      toast.success("স্ট্যাটাস শিডিউলার সংরক্ষিত হয়েছে");
      onOpenChange(false);
      setStatus(""); setRemarks(""); setExecDate(undefined);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>স্ট্যাটাস শিডিউলার — {client?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>CLIENT STATUS *</Label>
            <Select value={status} onValueChange={(v) => {
              setStatus(v);
              const opt = STATUS_OPTIONS.find(o => o.value === v);
              if (opt) setExecTime(opt.time);
            }}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label} / {o.time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>REMARKS/NOTE *</Label>
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="কারণ লিখুন..." />
          </div>
          <div>
            <Label>EXECUTION DATE *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left", !execDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {execDate ? format(execDate, "dd/MM/yyyy") : "তারিখ নির্বাচন করুন"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={execDate} onSelect={setExecDate} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <Button className="w-full" onClick={() => mutation.mutate()} disabled={!status || !execDate || mutation.isPending}>
            <Save className="h-4 w-4 mr-2" /> সংরক্ষণ করুন
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
