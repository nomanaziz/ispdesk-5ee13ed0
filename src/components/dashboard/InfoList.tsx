import { Link } from "react-router-dom";

interface Row {
  label: string;
  value: string | number;
  to?: string;
}

export function InfoList({ title, rows }: { title?: string; rows: Row[] }) {
  return (
    <div className="space-y-2">
      {title && <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">{title}</h3>}
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.map((r, i) => {
          const inner = (
            <div className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/40 transition-colors">
              <span className="font-medium text-foreground/80">{r.label}</span>
              <span className="font-bold text-foreground">{r.value}</span>
            </div>
          );
          return r.to ? <Link key={i} to={r.to}>{inner}</Link> : <div key={i}>{inner}</div>;
        })}
      </div>
    </div>
  );
}

export default InfoList;
