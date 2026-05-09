import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CalendarClock, MessageSquare, X, CalendarIcon } from "lucide-react";
import { parseISO, format, differenceInDays } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ExpireCellProps {
  client: any;
  onSaveRecurring: (day: number) => void;
  onSaveTemp: (date: string | null, note: string | null) => void;
}

function getBadgeStyle(effectiveDate: string | null, isOverride: boolean) {
  if (!effectiveDate) return { color: "bg-muted text-muted-foreground", label: "N/A" };
  const expire = parseISO(effectiveDate);
  const daysLeft = differenceInDays(expire, new Date());
  const dayLabel = `${expire.getDate()} তারিখ`;
  if (isOverride) {
    return { color: "bg-blue-500/10 text-blue-600 border-blue-500/30", label: dayLabel };
  }
  if (daysLeft < 0) return { color: "bg-red-500/10 text-red-600 border-red-500/30", label: dayLabel };
  if (daysLeft <= 7) return { color: "bg-amber-500/10 text-amber-600 border-amber-500/30", label: dayLabel };
  return { color: "bg-green-500/10 text-green-600 border-green-500/30", label: dayLabel };
}

const buildExpireDateFromDay = (day: number): string => {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();
  if (now.getDate() > day) {
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  const lastDay = new Date(y, m + 1, 0).getDate();
  const safe = Math.min(day, lastDay);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(safe).padStart(2, "0")}`;
};

export default function ExpireCell({ client: c, onSaveRecurring, onSaveTemp }: ExpireCellProps) {
  const hasTemp = !!c.temp_expire_date;
  const effective = c.temp_expire_date || c.expire_date;
  const badge = getBadgeStyle(effective, hasTemp);
  const hasNote = !!c.temp_expire_note;

  const [tempDate, setTempDate] = useState<Date | undefined>(c.temp_expire_date ? parseISO(c.temp_expire_date) : undefined);
  const [tempNote, setTempNote] = useState<string>(c.temp_expire_note || "");
  const [calOpen, setCalOpen] = useState(false);

  const handleSaveTemp = () => {
    const dateStr = tempDate ? format(tempDate, "yyyy-MM-dd") : null;
    const noteStr = tempNote.trim() ? tempNote.trim() : null;
    onSaveTemp(dateStr, noteStr);
  };

  const handleClear = () => {
    setTempDate(undefined);
    setTempNote("");
    onSaveTemp(null, null);
  };

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <button>
            <Badge variant="outline" className={`text-[10px] cursor-pointer hover:opacity-80 ${badge.color}`}>
              <CalendarClock className="h-2.5 w-2.5 mr-0.5" />
              {badge.label}
            </Badge>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 space-y-3" align="start">
          <div>
            <div className="text-xs font-medium mb-1 text-muted-foreground">প্রতি মাসের তারিখ (recurring)</div>
            <Select
              value={c.expire_date ? String(parseISO(c.expire_date).getDate()) : ""}
              onValueChange={(v) => onSaveRecurring(Number(v))}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="দিন (1-31)" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <SelectItem key={d} value={String(d)} className="text-xs">প্রতি মাসের {d} তারিখ</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-2">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-medium text-muted-foreground">এই মাসের জন্য (one-time override)</div>
              {(hasTemp || hasNote) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-red-500 hover:text-red-600 flex items-center gap-0.5 text-[10px]"
                  title="Clear override"
                >
                  <X className="h-3 w-3" /> clear
                </button>
              )}
            </div>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-full justify-start text-xs font-normal">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {tempDate ? format(tempDate, "dd MMM yyyy") : "তারিখ নির্বাচন করুন"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={tempDate}
                  onSelect={(d) => { setTempDate(d); setCalOpen(false); }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <div className="text-xs font-medium mb-1 text-muted-foreground">Temporary note</div>
            <Textarea
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              placeholder="যেমন: client অসুস্থ, ২০ তারিখ দিবে…"
              className="text-xs min-h-[60px]"
            />
          </div>

          <Button size="sm" className="w-full h-8 text-xs" onClick={handleSaveTemp}>
            Save override
          </Button>
        </PopoverContent>
      </Popover>

      {hasNote && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center justify-center h-4 w-4 rounded bg-blue-500/10 text-blue-600 border border-blue-500/30">
                <MessageSquare className="h-2.5 w-2.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">
              {c.temp_expire_note}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export { buildExpireDateFromDay };
