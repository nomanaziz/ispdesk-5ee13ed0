import { useState } from "react";
import { Link as LinkIcon, Pencil, Trash2, KeyRound, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  id: string;
  title: string;
  url: string;
  iconUrl?: string | null;
  username?: string | null;
  notes?: string | null;
  hasPassword?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ImportantLinkCard({
  id, title, url, iconUrl, username, notes, hasPassword,
  canEdit, onEdit, onDelete,
}: Props) {
  const open = () => window.open(url, "_blank", "noopener,noreferrer");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasCreds = !!username || hasPassword || !!notes;

  const fetchPassword = async () => {
    if (revealed !== null) return revealed;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_important_link_password", { _link_id: id });
      if (error) throw error;
      const pw = (data as string) || "";
      setRevealed(pw);
      return pw;
    } catch (e: any) {
      toast.error(e.message || "পাসওয়ার্ড আনা যায়নি");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} কপি হয়েছে`);
    } catch {
      toast.error("কপি ব্যর্থ");
    }
  };

  const copyPassword = async () => {
    const pw = await fetchPassword();
    if (pw) copy(pw, "পাসওয়ার্ড");
  };

  const togglePassword = async () => {
    if (showPw) { setShowPw(false); return; }
    const pw = await fetchPassword();
    if (pw !== null) setShowPw(true);
  };

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

      {/* Top-left: credentials button (always visible if creds exist) */}
      {hasCreds && (
        <div className="absolute top-1 left-1" onClick={(e) => e.stopPropagation()}>
          <Popover onOpenChange={(o) => { if (!o) { setShowPw(false); } }}>
            <PopoverTrigger asChild>
              <Button type="button" size="icon" variant="secondary" className="h-6 w-6">
                <KeyRound className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-72 p-3 space-y-2"
              align="start"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-semibold border-b pb-1.5 mb-1">{title} — ক্রেডেনশিয়াল</p>

              {username && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground mb-0.5">ইউজারনেম / আইডি</p>
                  <div className="flex items-center gap-1">
                    <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{username}</code>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copy(username, "আইডি")}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {hasPassword && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground mb-0.5">পাসওয়ার্ড</p>
                  <div className="flex items-center gap-1">
                    <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs font-mono">
                      {loading ? "লোড হচ্ছে..." : showPw && revealed !== null ? revealed : "••••••••••"}
                    </code>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={togglePassword} disabled={loading}>
                      {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={copyPassword} disabled={loading}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {notes && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground mb-0.5">নোট</p>
                  <p className="rounded bg-muted px-2 py-1 text-xs whitespace-pre-wrap break-words">{notes}</p>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      )}

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
