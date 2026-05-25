import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OltMobileLayout } from "@/components/olt-mobile/OltMobileLayout";
import { VendorIcon } from "@/components/olt-mobile/VendorIcon";
import { RefreshCw, Power, Save, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OltDetail {
  id: string; name: string; vendor: string | null; ip_address: string | null;
  cpu_usage: number | null; memory_usage: number | null; uptime: string | null;
  total_onus: number | null; online_onus: number | null;
  serial_number: string | null; hardware_version: string | null; firmware_version: string | null;
  mac_address: string | null; device_model: string | null; brand_model: string | null;
  olt_version: string | null; status: string | null; last_seen: string | null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 bg-white/15 backdrop-blur rounded-xl p-3">
      <div className="text-xs text-white/80">{label}</div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value || "—"}</span>
    </div>
  );
}

export default function OltOverview() {
  const { id } = useParams();
  const [olt, setOlt] = useState<OltDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("olt_devices").select("*").eq("id", id).maybeSingle();
    setOlt(data as OltDetail);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <OltMobileLayout title="Loading…" backTo="/m/olt"><div className="py-12 text-center text-sm text-muted-foreground">Loading…</div></OltMobileLayout>;
  if (!olt) return <OltMobileLayout title="Not found" backTo="/m/olt"><div className="py-12 text-center text-muted-foreground">OLT not found</div></OltMobileLayout>;

  return (
    <OltMobileLayout title={olt.name} backTo="/m/olt">
      {/* Gradient hero */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 rounded-2xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <VendorIcon vendor={olt.vendor} size={64} className="bg-white" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white/70">Connected to</div>
            <div className="text-2xl font-bold text-white truncate">{olt.name}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/70">Total ONUs</div>
            <div className="text-xl font-bold text-white">{olt.online_onus ?? 0}/{olt.total_onus ?? 0}</div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Stat label="CPU" value={olt.cpu_usage != null ? `${olt.cpu_usage}%` : "—"} />
          <Stat label="Memory" value={olt.memory_usage != null ? `${olt.memory_usage}%` : "—"} />
          <Stat label="Uptime" value={olt.uptime || "—"} />
        </div>
      </div>

      {/* Device Information */}
      <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="text-sky-600 font-semibold mb-2">Device Information</h3>
        <InfoRow label="Serial Number" value={olt.serial_number} />
        <InfoRow label="Hardware Version" value={olt.hardware_version} />
        <InfoRow label="Firmware Version" value={olt.firmware_version} />
        <InfoRow label="MAC Address" value={olt.mac_address} />
        <InfoRow label="Device Model" value={olt.device_model || olt.brand_model} />
        <InfoRow label="OLT Version" value={olt.olt_version} />
      </div>

      {/* System info */}
      <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="text-sky-600 font-semibold mb-2">System Information</h3>
        <InfoRow label="System Name" value={olt.name} />
        <InfoRow label="IP Address" value={olt.ip_address} />
        <InfoRow label="Status" value={olt.status} />
        <InfoRow label="Last Seen" value={olt.last_seen ? new Date(olt.last_seen).toLocaleString() : null} />
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <ActionBtn color="bg-blue-500" icon={RefreshCw} label="REFRESH INFORMATION" onClick={() => { load(); toast.success("Refreshing…"); }} />
        <ActionBtn color="bg-red-500" icon={Power} label="DISCONNECT FROM OLT" onClick={() => toast.info("Disconnect not yet wired")} />
        <ActionBtn color="bg-emerald-500" icon={Save} label="SAVE CONFIGURATION" onClick={() => toast.info("Save not yet wired")} />
        <ActionBtn color="bg-orange-500" icon={RotateCw} label="REBOOT OLT" onClick={() => toast.info("Reboot not yet wired")} />
      </div>
    </OltMobileLayout>
  );
}

function ActionBtn({ color, icon: Icon, label, onClick }: { color: string; icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("rounded-xl p-3 text-white font-semibold text-xs flex items-center gap-2 justify-center shadow-sm active:scale-95 transition-transform", color)}>
      <Icon className="h-4 w-4" />
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}
