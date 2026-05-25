import { Link, useParams } from "react-router-dom";
import { OltMobileLayout } from "@/components/olt-mobile/OltMobileLayout";
import { Upload, Target, Table2, AlertCircle, Heart, RadioTower, Server } from "lucide-react";

export default function OltMore() {
  const { id } = useParams();
  const tiles = [
    { to: `/dashboard/olt/ports?olt=${id}`, label: "Uplink Ports", icon: Upload, color: "text-sky-500" },
    { to: `/dashboard/olt/ports?olt=${id}`, label: "PON Ports", icon: Target, color: "text-purple-500" },
    { to: `/m/olt/${id}/mac-table`, label: "MAC Table", icon: Table2, color: "text-orange-500" },
    { to: `/dashboard/olt/fiber-down`, label: "ONU Down Detection", icon: AlertCircle, color: "text-red-500" },
    { to: `/m/olt/${id}/onus`, label: "ONU Health", icon: Heart, color: "text-sky-500" },
    { to: `/m/olt/${id}/onus`, label: "ONU Reader", icon: RadioTower, color: "text-blue-600" },
    { to: `/dashboard/olt`, label: "NEXSYNC", icon: Server, color: "text-emerald-600" },
  ];

  return (
    <OltMobileLayout title="Advanced Diagnostics" backTo={`/m/olt/${id}`}>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.label} to={t.to} className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-start gap-3 active:scale-95 transition-transform">
              <Icon className={`h-10 w-10 ${t.color}`} strokeWidth={1.8} />
              <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </OltMobileLayout>
  );
}
