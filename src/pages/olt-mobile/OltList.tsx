import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Calculator, Settings, Search, X } from "lucide-react";
import { VendorIcon } from "@/components/olt-mobile/VendorIcon";
import { OltMobileLayout } from "@/components/olt-mobile/OltMobileLayout";
import { cn } from "@/lib/utils";

interface Olt {
  id: string;
  name: string;
  vendor: string | null;
  connection_type: string | null;
  ip_address: string | null;
  status: string | null;
  last_seen: string | null;
  total_onus: number | null;
  online_onus: number | null;
}

const VENDOR_CHIPS = ["ALL", "VSOL", "BDCOM", "BDPON", "C-DATA", "Huawei", "ZTE", "MikroTik"];

export default function OltList() {
  const nav = useNavigate();
  const [olts, setOlts] = useState<Olt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      const { data } = await supabase
        .from("olt_devices")
        .select("id,name,vendor,connection_type,ip_address,status,last_seen,total_onus,online_onus")
        .order("created_at", { ascending: false });
      if (!cancel) {
        setOlts((data as Olt[]) || []);
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => { cancel = true; clearInterval(t); };
  }, []);

  const filtered = useMemo(() => {
    return olts.filter((o) => {
      if (filter !== "ALL") {
        const v = (o.vendor || "").toLowerCase();
        if (!v.includes(filter.toLowerCase()) && !(filter === "C-DATA" && v.includes("cdata"))) return false;
      }
      if (q && !`${o.name} ${o.vendor} ${o.ip_address}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [olts, filter, q]);

  const isLive = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < 3 * 60 * 1000;
  };

  return (
    <OltMobileLayout
      title={<span className="text-sky-600 font-bold">NexOLT</span>}
      right={
        <div className="flex items-center gap-1.5">
          <button onClick={() => nav("/dashboard/olt")} className="h-9 w-9 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-sm hover:bg-sky-600">
            <Plus className="h-5 w-5" />
          </button>
          <Link to="/m/olt/calculator" className="h-9 w-9 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-sm hover:bg-sky-600">
            <Calculator className="h-4 w-4" />
          </Link>
          <Link to="/dashboard/olt" className="h-9 w-9 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-sm hover:bg-sky-600">
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      }
    >
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {VENDOR_CHIPS.map((c) => {
          const active = filter === c;
          if (c === "Search") return null;
          return (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                active ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              {c === "ALL" && active && "✓ "}
              {c}
            </button>
          );
        })}
        <button
          onClick={() => setSearchOpen((s) => !s)}
          className={cn(
            "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5",
            searchOpen ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800",
          )}
        >
          <Search className="h-4 w-4" /> Search
        </button>
      </div>

      {searchOpen && (
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, vendor, IP..."
          className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-sm"
        />
      )}

      {/* OLT cards */}
      <div className="mt-3 space-y-3">
        {loading && <div className="text-center text-sm text-muted-foreground py-8">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No OLT found</p>
            <Link to="/dashboard/olt" className="mt-3 inline-block text-sky-600 text-sm font-medium">+ Add OLT</Link>
          </div>
        )}
        {filtered.map((o) => {
          const live = isLive(o.last_seen);
          return (
            <Link
              key={o.id}
              to={`/m/olt/${o.id}`}
              className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:border-sky-300 transition-colors"
            >
              <VendorIcon vendor={o.vendor} size={56} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sky-600 truncate">{o.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {o.vendor || "Unknown"} · {o.connection_type?.toUpperCase() || "—"}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={cn("h-2 w-2 rounded-full", live ? "bg-emerald-500" : "bg-red-500")} />
                  <span className="text-[11px] text-muted-foreground">
                    {live ? "Online" : "Offline"} · {o.online_onus ?? 0}/{o.total_onus ?? 0} ONUs
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); nav(`/dashboard/olt`); }}
                className="p-2 text-slate-400 hover:text-slate-700"
                aria-label="Options"
              >
                <X className="h-5 w-5" />
              </button>
            </Link>
          );
        })}
      </div>
    </OltMobileLayout>
  );
}
