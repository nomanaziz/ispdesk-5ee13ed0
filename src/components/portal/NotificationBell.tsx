import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Newspaper, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { callPortal } from "@/lib/portalApi";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const LAST_SEEN_KEY = "portal_notif_last_seen";
const dotPalette = [
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-indigo-500",
];

const NotificationBell = () => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"news" | "notices">("news");
  const [lastSeen, setLastSeen] = useState<string>(
    () => localStorage.getItem(LAST_SEEN_KEY) || "1970-01-01T00:00:00Z"
  );

  const { data } = useQuery({
    queryKey: ["portal-notif-bell"],
    queryFn: () => callPortal<any>("get_notices"),
    refetchInterval: 60_000,
  });

  const news: any[] = data?.news || [];
  const notices: any[] = data?.notices || [];
  const all = useMemo(() => [...news, ...notices], [news, notices]);

  const unreadCount = useMemo(
    () => all.filter((i) => i.created_at && i.created_at > lastSeen).length,
    [all, lastSeen]
  );

  useEffect(() => {
    if (open) {
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SEEN_KEY, now);
      setLastSeen(now);
    }
  }, [open]);

  const isNew = (createdAt: string) => {
    if (!createdAt) return false;
    return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
  };

  const items = tab === "news" ? news : notices;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          title={t("নোটিফিকেশন", "Notifications")}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="p-0 w-[360px] max-w-[92vw] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white p-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h3 className="font-semibold text-sm">{t("নোটিফিকেশন", "Notifications")}</h3>
          </div>
          <p className="text-[11px] text-white/80 mt-1">
            {unreadCount > 0
              ? t(
                  `আপনার ${unreadCount}টি নতুন নোটিশ ও সংবাদ আছে`,
                  `You have ${unreadCount} unread news, events and notices`
                )
              : t("কোনো নতুন আপডেট নেই", "No new updates")}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b bg-muted/30">
          <button
            onClick={() => setTab("news")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              tab === "news"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Newspaper className="h-3.5 w-3.5" />
            {t("সংবাদ ও ইভেন্ট", "News & Events")}
            {news.length > 0 && (
              <span className="text-[10px] px-1.5 rounded-full bg-violet-100 text-violet-700">
                {news.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("notices")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              tab === "notices"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bell className="h-3.5 w-3.5" />
            {t("নোটিশ", "Notices")}
            {notices.length > 0 && (
              <span className="text-[10px] px-1.5 rounded-full bg-amber-100 text-amber-700">
                {notices.length}
              </span>
            )}
          </button>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              {t("কোনো নতুন কিছু নেই", "Nothing new right now")}
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((item, idx) => {
                const dot = dotPalette[idx % dotPalette.length];
                const date = item.event_date || item.created_at;
                return (
                  <li key={item.id}>
                    <Link
                      to="/portal/notices"
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", dot)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          {isNew(item.created_at) && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 shrink-0">
                              NEW
                            </span>
                          )}
                        </div>
                        {date && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <Link
          to="/portal/notices"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-violet-600 hover:bg-muted/40 border-t transition-colors"
        >
          {t("সব দেখুন", "View all")}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
