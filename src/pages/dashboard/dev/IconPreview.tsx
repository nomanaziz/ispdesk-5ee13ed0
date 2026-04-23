import { useState } from "react";
import { HishabeeIcon, HISHABEE_ICON_NAMES } from "@/components/icons/HishabeeIcon";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/**
 * Dev-only browser for the Hishabee icon set.
 * Visit /dashboard/_icons to see every available icon and its `name`.
 * Click any tile to copy the name to clipboard.
 */
export default function IconPreview() {
  const [q, setQ] = useState("");
  const filtered = HISHABEE_ICON_NAMES.filter((n) =>
    n.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Hishabee Icon Set</h1>
        <p className="text-sm text-muted-foreground">
          {HISHABEE_ICON_NAMES.length} icons available. Click any tile to copy its name.
          Use as <code className="px-1 rounded bg-muted">&lt;HishabeeIcon name="..." /&gt;</code>.
        </p>
      </div>

      <Input
        placeholder="Search icons..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(name);
              toast.success(`Copied: ${name}`);
            }}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/40 transition-all"
          >
            <HishabeeIcon name={name} size={56} />
            <span className="text-xs font-mono text-foreground break-all text-center">{name}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">No icons match "{q}"</p>
        )}
      </div>
    </div>
  );
}
