import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOTE_COLORS, type NoteColor, type NoteOwnerType, type UserNote, notesApi } from "@/lib/notesApi";

const COLOR_CLASS: Record<NoteColor, string> = {
  yellow: "bg-yellow-300 border-yellow-400",
  blue: "bg-sky-300 border-sky-400",
  green: "bg-emerald-300 border-emerald-400",
  pink: "bg-pink-300 border-pink-400",
  purple: "bg-purple-300 border-purple-400",
  orange: "bg-orange-300 border-orange-400",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ownerType: NoteOwnerType;
  note?: UserNote | null;
  onSaved?: () => void;
}

export function NoteDialog({ open, onOpenChange, ownerType, note, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState<NoteColor>("yellow");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(note?.title || "");
      setContent(note?.content || "");
      setColor((note?.color as NoteColor) || "yellow");
      setPinned(note?.pinned || false);
    }
  }, [open, note]);

  const save = async () => {
    if (!content.trim()) {
      toast.error("Note content can't be empty");
      return;
    }
    setSaving(true);
    try {
      if (note?.id) {
        await notesApi.update(ownerType, note.id, { title: title || null, content, color, pinned });
        toast.success("Note updated");
      } else {
        await notesApi.create(ownerType, { title: title || null, content, color, pinned });
        toast.success("Note saved");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{note?.id ? "Edit note" : "Take a note"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="note-title" className="text-xs">Title (optional)</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              placeholder="Quick title…"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="note-content" className="text-xs">Note</Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write something to remember…"
              rows={6}
              className="mt-1 resize-none"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs">Color</Label>
            <div className="flex gap-2 mt-2">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    COLOR_CLASS[c],
                    color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" : "",
                  )}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="note-pin"
              checked={pinned}
              onCheckedChange={(v) => setPinned(!!v)}
            />
            <Label htmlFor="note-pin" className="text-sm font-normal cursor-pointer flex items-center gap-1">
              <Pin className="h-3.5 w-3.5" /> Pin to top
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
