import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OltMobileLayout } from "@/components/olt-mobile/OltMobileLayout";
import { RefreshCw, Search, ChevronDown, Router } from "lucide-react";
import { cn } from "@/lib/utils";
import { OnuDetailSheet } from "@/pages/olt-mobile/OnuDetailSheet";

interface Onu {
  id: string;
  mac: string | null;
  interface: string | null;
  description: string | null;
  serial_number: string | null;
  status: string | null;
  rx_power: number | null;
  tx_power: number | null;
  distance: number | null;
  distance_m: number | null;
  offline_reason: string | null;
  model_id: string | null;
  vendor_id: string | null;
  last_offline_at: string | null;
}

type Tab = "all" | "online" | "offline";

export default function OltOnuList() {
  const { id } = useParams();
  const [onus, setOnus] = useState<Onu[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [pon, setPon] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [openOnu, setOpenOnu] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("onu_list")
      .select("id,mac,interface,description,serial_number,status,rx_power,tx_power,distance,distance_m,offline_reason,model_id,vendor_id,last_offline_at")
      .eq("olt_id", id)
      .order("interface", { ascending: true });
    setOnus((data as Onu[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [id]);

  const pons = useMemo(() => {
    const set = new Set<string>();
    onus.forEach((o) => {
      const m = o.interface?.match(/(\d+\/\d+)/) || o.interface?.match(/(PON\d+)/i);
      if (m) set.add(m[1].toUpperCase().replace(/.*\//, "PON"));
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [onus]);

  const filtered = useMemo(() => {
    return onus.filter((o) => {
      if (tab === "online" && o.status !== "online") return false;
      if (tab === "offline" && o.status === "online") return false;
      if (pon !== "ALL" && !o.interface?.toUpperCase().includes(pon.replace("PON", "/"))) return false;
      if (q && !`${o.description} ${o.mac} ${o.interface}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [onus, tab, pon, q]);

  const counts = useMemo(() => ({
    all: onus.length,
    online: onus.filter((o) => o.status === "online").length,
    offline: onus.filter((o) => o.status !== "online").length,
  }), [onus]);

  return (
    <OltMobileLayout title="ONU List" backTo={`/m/olt/${id}`}>
      {/* Filter row */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-600">PON</span>
          <div className="relative flex-1">
            <select
              value={pon}
              onChange={(e) => setPon(e.target.value)}
              className="w-full appearance-none border border-slate-300 rounded-lg px-3 py-2 pr-8 text-sm bg-white dark:bg-slate-800"
            >
              {pons.map((p) => <option key={p}>{p}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
          <button onClick={load} className="h-10 w-10 rounded-full border border-sky-300 text-sky-500 flex items-center justify-center">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setSearchOpen((s) => !s)} className="h-10 w-10 rounded-full text-sky-500 flex items-center justify-center">
            <Search className="h-5 w-5" />
          </button>
        </div>

        {searchOpen && (
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search MAC, interface, name..."
            className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 text-sm"
          />
        )}

        {/* Tabs */}
        <div className="grid grid-cols-3 mt-3 border-b">
          {(["all", "online", "offline"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "py-2.5 text-sm font-medium border-b-2 capitalize",
                tab === t ? "text-sky-600 border-sky-600" : "text-slate-500 border-transparent",
              )}
            >
              {t} ({counts[t]})
            </button>
          ))}
        </div>
      </div>

      {/* ONU cards */}
      <div className="mt-3 space-y-2.5">
        {loading && <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground">No ONU in this filter</div>
        )}
        {filtered.map((o) => {
          const isOffline = o.status !== "online";
          const dist = o.distance_m ?? o.distance;
          const name = o.description || o.mac || o.serial_number || "(unnamed)";
          return (
            <button
              key={o.id}
              onClick={() => setOpenOnu(o.id)}
              className={cn(
                "w-full text-left bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border",
                isOffline ? "border-red-300" : "border-slate-100 dark:border-slate-800",
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-12 w-12 rounded-lg flex items-center justify-center shrink-0",
                  isOffline ? "bg-slate-100 text-slate-400" : "bg-slate-50 text-slate-600",
                )}>
                  <Router className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{name}</div>
                  <div className="text-xs text-muted-foreground">{o.interface}</div>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold text-white",
                  isOffline ? "bg-red-500" : "bg-emerald-500",
                )}>
                  {isOffline ? "Offline" : "Online"}
                </span>
              </div>
              <div className={cn("h-px my-2", isOffline ? "bg-red-200" : "bg-slate-100")} />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate">{o.mac || "—"} | {o.model_id || "unknown"}</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">RX Power: {o.rx_power != null ? `${o.rx_power} dBm` : "N/A"}</span>
              </div>
              {isOffline && (
                <div className="flex justify-between text-xs mt-1 text-red-600">
                  <span>Reason: {o.offline_reason || "N/A"}</span>
                  {dist != null && <span>Distance: {dist} m</span>}
                </div>
              )}
              {!isOffline && dist != null && (
                <div className="text-xs mt-1 text-muted-foreground">Distance: {dist} m</div>
              )}
            </button>
          );
        })}
      </div>

      {openOnu && <OnuDetailSheet onuId={openOnu} onClose={() => setOpenOnu(null)} />}
    </OltMobileLayout>
  );
}
