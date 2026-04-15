import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
  invalidateKey?: string;
}

export default function PackageSchedulerDialog({ open, onOpenChange, client, invalidateKey = "clients-list" }: Props) {
  const queryClient = useQueryClient();
  const [serverId, setServerId] = useState(client?.mikrotik_id || "");
  const [protocolType, setProtocolType] = useState("PPPoE");
  const [profileSpeed, setProfileSpeed] = useState("");
  const [packageId, setPackageId] = useState("");
  const [packageRate, setPackageRate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [execDate, setExecDate] = useState<Date>();
  const [mikrotikProfiles, setMikrotikProfiles] = useState<string[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const { data: servers = [] } = useQuery({
    queryKey: ["mikrotik-devices"],
    queryFn: async () => {
      const { data } = await supabase.from("mikrotik_devices").select("id, name").eq("status", "online" as any);
      return data || [];
    },
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["isp-packages"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("id, name, price, bandwidth_down");
      return data || [];
    },
  });

  const fetchProfiles = async (deviceId: string) => {
    setLoadingProfiles(true);
    try {
      const { data } = await supabase.functions.invoke("fetch-mikrotik-profiles", { body: { device_id: deviceId } });
      setMikrotikProfiles(data?.profiles || []);
    } catch { setMikrotikProfiles([]); }
    setLoadingProfiles(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_schedulers").insert({
        client_id: client.id,
        scheduler_type: "package_scheduler",
        server_id: serverId || null,
        protocol_type: protocolType,
        profile_speed: profileSpeed,
        package_id: packageId || null,
        package_rate: packageRate ? Number(packageRate) : null,
        remarks,
        schedule_date: execDate ? format(execDate, "yyyy-MM-dd") : null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      toast.success("প্যাকেজ শিডিউলার সংরক্ষিত হয়েছে");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>প্যাকেজ পরিবর্তন শিডিউলার — {client?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>SERVER *</Label>
            <Select value={serverId} onValueChange={(v) => { setServerId(v); fetchProfiles(v); }}>
              <SelectTrigger><SelectValue placeholder="সার্ভার নির্বাচন" /></SelectTrigger>
              <SelectContent>
                {servers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>PROTOCOL TYPE *</Label>
            <Select value={protocolType} onValueChange={setProtocolType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PPPoE">PPPoE</SelectItem>
                <SelectItem value="Static">Static</SelectItem>
                <SelectItem value="DHCP">DHCP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>PROFILE SPEED *</Label>
            <Select value={profileSpeed} onValueChange={setProfileSpeed} disabled={loadingProfiles}>
              <SelectTrigger><SelectValue placeholder={loadingProfiles ? "লোড হচ্ছে..." : "প্রোফাইল নির্বাচন"} /></SelectTrigger>
              <SelectContent>
                {mikrotikProfiles.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>PACKAGE *</Label>
            <Select value={packageId} onValueChange={(v) => {
              setPackageId(v);
              const pkg = packages.find((p: any) => p.id === v);
              if (pkg) setPackageRate(String(pkg.price || ""));
            }}>
              <SelectTrigger><SelectValue placeholder="প্যাকেজ নির্বাচন" /></SelectTrigger>
              <SelectContent>
                {packages.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} — {p.bandwidth_down}Mbps</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>PACKAGE RATE *</Label>
            <Input type="number" value={packageRate} onChange={e => setPackageRate(e.target.value)} placeholder="টাকা" />
          </div>
          <div>
            <Label>REMARKS/NOTE</Label>
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
          <Button className="w-full" onClick={() => mutation.mutate()} disabled={!execDate || mutation.isPending}>
            <Save className="h-4 w-4 mr-2" /> সংরক্ষণ করুন
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
