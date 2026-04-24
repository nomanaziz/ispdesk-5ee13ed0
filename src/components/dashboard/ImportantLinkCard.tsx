import { Link as LinkIcon, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  url: string;
  iconUrl?: string | null;
  canEdit?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ImportantLinkCard({ title, url, iconUrl, canEdit, onEdit, onDelete }: Props) {
  const open = () => window.open(url, "_blank", "noopener,noreferrer");
  return (
    <div
      className={cn(
        "group relative flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border bg-card",
        "hover:border-primary hover:shadow-md transition-all cursor-pointer aspect-square",
      )}
      onClick={open}
      title={url}
    >
      <div className="flex-1 w-full min-h-0 flex items-center justify-center rounded-md bg-muted overflow-hidden p-1">
        {iconUrl ? (
          <img src={iconUrl} alt={title} className="max-h-full max-w-full object-contain" />
        ) : (
          <LinkIcon className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <p className="text-[11px] font-medium text-center line-clamp-1 leading-tight w-full">{title}</p>
      {canEdit && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
