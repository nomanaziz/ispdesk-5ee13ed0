interface Row {
  label: string;
  value: string | number;
}

export function InfoList({ title, rows }: { title?: string; rows: Row[] }) {
  return (
    <div className="space-y-2">
      {title && <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">{title}</h3>}
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
            <span className="font-medium text-foreground/80">{r.label}</span>
            <span className="font-bold text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default InfoList;
