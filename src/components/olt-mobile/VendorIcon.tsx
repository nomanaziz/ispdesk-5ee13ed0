import { cn } from "@/lib/utils";

interface Props {
  vendor?: string | null;
  size?: number;
  className?: string;
}

// Minimal vendor brand letter tile (avoids needing real logo assets)
export function VendorIcon({ vendor, size = 56, className }: Props) {
  const v = (vendor || "").toLowerCase();
  let bg = "bg-slate-200 text-slate-700";
  let label = (vendor || "?").slice(0, 4).toUpperCase();

  if (v.includes("vsol")) { bg = "bg-white border border-rose-200 text-rose-600"; label = "V·SOL"; }
  else if (v.includes("bdcom")) { bg = "bg-white border border-blue-200 text-blue-600"; label = "BDCOM"; }
  else if (v.includes("bdpon") || v.includes("tbs")) { bg = "bg-white border border-cyan-200 text-cyan-600"; label = "BDPON"; }
  else if (v.includes("c-data") || v.includes("cdata")) { bg = "bg-white border border-orange-200 text-orange-600"; label = "DATA"; }
  else if (v.includes("huawei")) { bg = "bg-red-600 text-white"; label = "HW"; }
  else if (v.includes("zte")) { bg = "bg-blue-600 text-white"; label = "ZTE"; }
  else if (v.includes("mikrotik")) { bg = "bg-sky-100 border border-sky-300 text-sky-700"; label = "MT"; }
  else if (v.includes("hsgq")) { bg = "bg-emerald-100 border border-emerald-300 text-emerald-700"; label = "HSGQ"; }
  else if (v.includes("syrotech")) { bg = "bg-indigo-100 border border-indigo-300 text-indigo-700"; label = "SYRO"; }

  return (
    <div
      className={cn("rounded-lg flex items-center justify-center font-bold shrink-0", bg, className)}
      style={{ width: size, height: size, fontSize: size * 0.22 }}
    >
      {label}
    </div>
  );
}
