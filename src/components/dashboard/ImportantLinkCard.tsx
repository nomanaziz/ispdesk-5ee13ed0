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
        "group relative flex flex-col items-center justify-center gap-2 p-3 rounded-lg border bg-card",
        "hover:border-primary hover:shadow-md transition-all cursor-pointer aspect-square",
      )}
      onClick={open}
      title={url}
    >
      <div className="h-12 w-12 flex items-center justify-center rounded-md bg-muted overflow-hidden">
        {iconUrl ? (
          <img src={iconUrl} alt={title} className="h-full w-full object-contain" />
        ) : (
          <LinkIcon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <p className="text-xs font-medium text-center line-clamp-2 leading-tight">{title}</p>
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
