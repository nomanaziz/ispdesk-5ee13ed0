import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { ReactNode } from "react";

export interface BulkAction {
  key: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline";
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

interface Props {
  selectedCount: number;
  totalCount: number;
  actions: BulkAction[];
  onExportCsv?: () => void;
  onExportPdf?: () => void;
}

export default function BulkActionBar({ selectedCount, totalCount, actions, onExportCsv, onExportPdf }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2">
      <div className="text-xs px-2 py-1 rounded bg-background border">
        <span className="font-semibold">{selectedCount}</span>
        <span className="text-muted-foreground"> / {totalCount} selected</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {actions.map((a) => (
          <Button
            key={a.key}
            size="sm"
            variant={a.variant || "secondary"}
            onClick={a.onClick}
            disabled={a.disabled || a.loading || selectedCount === 0}
            className="h-8 rounded-full px-3 text-xs"
          >
            {a.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : a.icon}
            {a.label}
          </Button>
        ))}
      </div>
      <div className="ml-auto flex gap-1.5">
        {onExportPdf && (
          <Button size="sm" variant="outline" onClick={onExportPdf} className="h-8 rounded-full px-3 text-xs">
            <FileText className="h-3 w-3" /> PDF
          </Button>
        )}
        {onExportCsv && (
          <Button size="sm" variant="outline" onClick={onExportCsv} className="h-8 rounded-full px-3 text-xs">
            <FileSpreadsheet className="h-3 w-3" /> CSV
          </Button>
        )}
      </div>
    </div>
  );
}
