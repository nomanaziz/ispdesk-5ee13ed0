import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { callPortal } from "@/lib/portalApi";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mail, Smartphone, Search, Inbox, ChevronDown, ChevronUp } from "lucide-react";

const PortalMessages = () => {
  const { t } = useLanguage();
  const [channel, setChannel] = useState<"all" | "sms" | "email">("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-messages", channel],
    queryFn: () => callPortal<any>("get_messages", { channel: channel === "all" ? null : channel }),
  });

  const messages: any[] = data?.messages || [];
  const filtered = messages.filter((m) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (m.message || "").toLowerCase().includes(s) ||
      (m.recipient || "").toLowerCase().includes(s)
    );
  });

  const channelMeta = (ch: string) =>
    ch === "email"
      ? { Icon: Mail, label: "Email", tint: "bg-rose-100 text-rose-700" }
      : { Icon: Smartphone, label: "SMS", tint: "bg-emerald-100 text-emerald-700" };

  const statusTint = (s: string) =>
    s === "delivered" || s === "sent"
      ? "bg-emerald-500 text-white"
      : s === "failed"
      ? "bg-rose-500 text-white"
      : "bg-amber-500 text-white";

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-lg font-bold">{t("আমার মেসেজ", "My Messages")}</h1>
          <p className="text-xs text-muted-foreground">
            {t("আপনার কাছে পাঠানো সকল SMS ও Email", "All SMS and Emails sent to you")}
          </p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-1.5 rounded-lg bg-muted/40 p-1 w-fit">
              {(["all", "sms", "email"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    channel === c
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c === "all" ? t("সব", "All") : c.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("খুঁজুন...", "Search...")}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t("লোড হচ্ছে...", "Loading...")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <Inbox className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <div className="text-sm font-semibold text-foreground">
                {t("কোনো মেসেজ নেই", "No messages yet")}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t(
                  "আপনার কাছে যত SMS ও Email পাঠানো হবে এখানে দেখাবে",
                  "All SMS and emails sent to you will appear here"
                )}
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((m) => {
                const { Icon, label, tint } = channelMeta(m.channel);
                const isOpen = openId === m.id;
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => setOpenId(isOpen ? null : m.id)}
                      className="w-full text-left p-3 sm:p-4 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${tint}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`${tint} border-0 text-[10px]`}>{label}</Badge>
                            <Badge className={`${statusTint(m.status)} border-0 text-[10px]`}>
                              {m.status}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground ml-auto">
                              {new Date(m.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {t("প্রাপক", "To")}: {m.recipient || "—"}
                          </div>
                          <div
                            className={`text-sm text-foreground mt-1 ${isOpen ? "" : "line-clamp-2"}`}
                          >
                            {m.message}
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalMessages;
