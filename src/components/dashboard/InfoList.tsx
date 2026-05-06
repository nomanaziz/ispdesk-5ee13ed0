interface Row {
  label: string;
  value: string | number;
}

export function InfoList({ title, rows }: { title?: string; rows: Row[] }) {
  return (
    <div className="space-y-2">
      {title && <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>}
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-semibold text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default InfoList;
