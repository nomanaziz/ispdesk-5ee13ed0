import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NODE_KIND_LIST, NODE_STYLES, type NodeKind } from "./nodeStyles";
import { cn } from "@/lib/utils";

interface Props {
  onPick: (kind: NodeKind) => void;
  selected?: NodeKind | null;
}

export function NodePalette({ onPick, selected }: Props) {
  return (
    <Card className="h-full">
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Entities</CardTitle>
      </CardHeader>
      <CardContent className="p-2 space-y-1 overflow-y-auto" style={{ maxHeight: 560 }}>
        {NODE_KIND_LIST.map((k) => {
          const s = NODE_STYLES[k];
          const Icon = s.icon;
          return (
            <button
              key={k}
              onClick={() => onPick(k)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left border transition",
                "hover:border-primary",
                selected === k ? "border-primary ring-1 ring-primary" : "border-transparent",
              )}
              style={{ background: s.bg }}
            >
              <span
                className="h-6 w-6 rounded flex items-center justify-center text-white shrink-0"
                style={{ background: s.color }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="font-medium truncate" style={{ color: "#111827" }}>{s.label}</span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
