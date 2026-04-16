import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Pin, Calendar, Paperclip } from "lucide-react";

const typeColor: Record<string, string> = {
  info: "bg-sky-100 text-sky-700",
  warning: "bg-amber-100 text-amber-700",
  success: "bg-emerald-100 text-emerald-700",
  event: "bg-violet-100 text-violet-700",
};

const PortalNotices = () => {
  const { data: notices, isLoading } = useQuery({
    queryKey: ["portal-notices-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_notices")
        .select("*")
        .eq("active", true)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Notices & Announcements</h1>
          <p className="text-sm text-muted-foreground">News and updates from your ISP</p>
        </div>
      </div>

      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-10 text-center text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : notices && notices.length > 0 ? (
        <div className="space-y-3">
          {notices.map((n) => (
            <Card key={n.id} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-0">
                <div className="flex">
                  <div className={`w-1.5 ${n.pinned ? "bg-amber-400" : "bg-violet-400"}`} />
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${typeColor[n.type] || typeColor.info} border-0 capitalize`}>
                          {n.type}
                        </Badge>
                        {n.pinned && (
                          <Badge className="bg-amber-100 text-amber-700 border-0 gap-1">
                            <Pin className="h-3 w-3" /> Pinned
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(n.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <h3 className="font-semibold text-base mt-2">{n.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">{n.body}</p>
                    {n.attachment_url && (
                      <a
                        href={n.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:underline mt-3"
                      >
                        <Paperclip className="h-3 w-3" /> Attachment
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No notices right now</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Check back later for updates</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PortalNotices;
