import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pin, PinOff, Pencil, Trash2, Plus, Loader2, StickyNote, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NoteDialog } from "./NoteDialog";
import { NOTE_COLORS, type NoteColor, type NoteOwnerType, type UserNote, notesApi } from "@/lib/notesApi";

const COLOR_CARD: Record<NoteColor, string> = {
  yellow: "bg-yellow-100 border-yellow-300 text-yellow-950",
  blue: "bg-sky-100 border-sky-300 text-sky-950",
  green: "bg-emerald-100 border-emerald-300 text-emerald-950",
  pink: "bg-pink-100 border-pink-300 text-pink-950",
  purple: "bg-purple-100 border-purple-300 text-purple-950",
  orange: "bg-orange-100 border-orange-300 text-orange-950",
};

const COLOR_DOT: Record<NoteColor, string> = {
  yellow: "bg-yellow-400",
  blue: "bg-sky-400",
  green: "bg-emerald-400",
  pink: "bg-pink-400",
  purple: "bg-purple-400",
  orange: "bg-orange-400",
};

interface Props {
  ownerType: NoteOwnerType;
  title?: string;
}

export function NotesList({ ownerType, title = "My Notes" }: Props) {
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState<NoteColor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserNote | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await notesApi.list(ownerType);
      setNotes(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerType]);

  const filtered = useMemo(() => {
    let list = notes;
    if (colorFilter) list = list.filter((n) => n.color === colorFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) =>
          (n.title || "").toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q),
      );
    }
    return list;
  }, [notes, search, colorFilter]);

  const togglePin = async (n: UserNote) => {
    try {
      await notesApi.togglePin(ownerType, n);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (n: UserNote) => {
    if (!confirm("Delete this note?")) return;
    try {
      await notesApi.remove(ownerType, n.id);
      toast.success("Deleted");
      setNotes((p) => p.filter((x) => x.id !== n.id));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <StickyNote className="h-6 w-6 text-primary" /> {title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {notes.length} note{notes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Take a note
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setColorFilter(null)}
            className={cn(
              "h-7 px-2.5 rounded-full text-xs border transition-colors",
              !colorFilter ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColorFilter(colorFilter === c ? null : c)}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-transform",
                COLOR_DOT[c],
                colorFilter === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110 border-background" : "border-background",
              )}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-lg">
          <StickyNote className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-muted-foreground">No notes yet</p>
          <Button className="mt-4" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Take your first note
          </Button>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 [&>*]:mb-4">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={cn(
                "break-inside-avoid rounded-lg border-2 p-4 shadow-sm hover:shadow-md transition-shadow group relative",
                COLOR_CARD[n.color as NoteColor] || COLOR_CARD.yellow,
              )}
            >
              {n.pinned && (
                <Pin className="absolute top-2 right-2 h-3.5 w-3.5 fill-current opacity-70" />
              )}
              {n.title && (
                <h3 className="font-bold text-sm mb-1.5 pr-5 line-clamp-2">{n.title}</h3>
              )}
              <p className="text-sm whitespace-pre-wrap break-words line-clamp-[10]">{n.content}</p>
              <div className="mt-3 pt-2 border-t border-current/15 flex items-center justify-between">
                <span className="text-[10px] opacity-70">
                  {new Date(n.updated_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-current hover:bg-current/10" onClick={() => togglePin(n)} title={n.pinned ? "Unpin" : "Pin"}>
                    {n.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-current hover:bg-current/10" onClick={() => { setEditing(n); setDialogOpen(true); }} title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-current hover:bg-current/10" onClick={() => remove(n)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ownerType={ownerType}
        note={editing}
        onSaved={load}
      />
    </div>
  );
}
