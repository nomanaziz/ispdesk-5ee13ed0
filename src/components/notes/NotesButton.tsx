import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StickyNote } from "lucide-react";
import { NoteDialog } from "./NoteDialog";
import type { NoteOwnerType } from "@/lib/notesApi";

interface Props {
  ownerType: NoteOwnerType;
  variant?: "icon" | "compact";
}

export function NotesButton({ ownerType, variant = "icon" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "compact" ? (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-9 text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(true)}
          title="Take a note"
        >
          <StickyNote className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Note</span>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(true)}
          title="Take a note"
        >
          <StickyNote className="h-4 w-4" />
        </Button>
      )}
      <NoteDialog open={open} onOpenChange={setOpen} ownerType={ownerType} />
    </>
  );
}
