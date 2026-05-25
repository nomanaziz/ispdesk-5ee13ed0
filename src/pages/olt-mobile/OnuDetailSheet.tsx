import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Pencil, RotateCw, Settings2, List, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Onu {
  id: string; mac: string | null; interface: string | null; description: string | null;
  serial_number: string | null; status: string | null; rx_power: number | null; tx_power: number | null;
  distance: number | null; distance_m: number | null; offline_reason: string | null;
  vendor_id: string | null; model_id: string | null; onu_type: string | null;
  ethernet_count: number | null; wifi_count: number | null; response_time_ms: number | null;
  temperature: number | null; alive_seconds: number | null; last_register_at: string | null;
  last_seen: string | null;
}

interface Props { onuId: string; onClose: () => void }

function fmtAlive(sec: number | null) {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

export function OnuDetailSheet({ onuId, onClose }: Props) {
  const [onu, setOnu] = useState<Onu | null>(null);
  const [tab, setTab] = useState<"info" | "action">("info");

  useEffect(() => {
    supabase.from("onu_list").select("*").eq("id", onuId).maybeSingle().then(({ data }) => setOnu(data as Onu));
  }, [onuId]);

  const name = onu?.description || onu?.mac || "—";
  const isOnline = onu?.status === "online";

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto p-0">
        <SheetHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between">
          <SheetTitle className="text-base">ONU Details: <span className="text-foreground">{name}</span></SheetTitle>
          <button className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4" /></button>
        </SheetHeader>

        <div className="grid grid-cols-2 border-b">
          {(["info", "action"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn(
              "py-2.5 text-sm font-semibold uppercase border-b-2",
              tab === t ? "text-sky-600 border-sky-600" : "text-slate-400 border-transparent",
            )}>{t}</button>
          ))}
        </div>

        {!onu && <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>}

        {onu && tab === "info" && (
          <div className="px-4 py-3 text-sm space-y-2">
            <Row k="ONU ID:" v={onu.interface} />
            <Row k="MAC Address:" v={onu.mac} />
            <Row k="Status:" v={<span className={isOnline ? "text-emerald-500 font-semibold" : "text-red-500 font-semibold"}>{isOnline ? "Online" : "Offline"}</span>} />
            <Row k="Distance:" v={(onu.distance_m ?? onu.distance) != null ? `${onu.distance_m ?? onu.distance} m` : "—"} />
            <Row k="Alive Time:" v={fmtAlive(onu.alive_seconds)} />
            <Row k="Last Register:" v={onu.last_register_at ? new Date(onu.last_register_at).toLocaleString() : onu.last_seen ? new Date(onu.last_seen).toLocaleString() : "—"} />
            <Row k="Vendor ID:" v={onu.vendor_id} />
            <Row k="Model ID:" v={onu.model_id} />
            <Row k="ONU Type:" v={onu.onu_type} />
            <Row k="Ethernet Count:" v={onu.ethernet_count} />
            <Row k="Wifi Count:" v={onu.wifi_count} />
            <Row k="Response Time:" v={onu.response_time_ms} />
            <Row k="Temperature:" v={onu.temperature != null ? `${onu.temperature} °C` : "—"} />
            <Row k="Receive Power:" v={onu.rx_power != null ? `${onu.rx_power} dBm` : "—"} />
            {!isOnline && <Row k="Offline Reason:" v={<span className="text-red-500">{onu.offline_reason || "N/A"}</span>} />}
          </div>
        )}

        {onu && tab === "action" && (
          <div className="px-4 py-3 space-y-3">
            <p className="text-sm text-muted-foreground">Available Actions</p>
            <ActionBtn color="bg-orange-500" icon={RotateCw} label="REBOOT ONU" onClick={() => toast.info("Reboot queued")} />
            <ActionBtn color="bg-blue-400" icon={Settings2} label="BIND PROFILE" onClick={() => toast.info("Coming soon")} />
            <ActionBtn color="bg-emerald-500" icon={List} label="ONU MAC TABLE" onClick={() => toast.info("Coming soon")} />
            <ActionBtn color="bg-fuchsia-500" icon={ArrowRight} label="ONU PORT STATUS" onClick={() => toast.info("Coming soon")} />
          </div>
        )}

        <div className="p-3 border-t">
          <button onClick={onClose} className="w-full py-3 rounded-lg border border-slate-300 text-sky-600 font-semibold uppercase">Close</button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium break-all">{v ?? "—"}</span>
    </div>
  );
}

function ActionBtn({ color, icon: Icon, label, onClick }: { color: string; icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("w-full py-3 rounded-xl text-white font-semibold flex items-center gap-3 px-4 shadow active:scale-95 transition-transform", color)}>
      <Icon className="h-5 w-5" />
      <span className="flex-1 text-center">{label}</span>
    </button>
  );
}
