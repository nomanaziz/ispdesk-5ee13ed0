import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clapperboard, Tv, Server, ExternalLink, Globe } from "lucide-react";

const typeIcons: Record<string, any> = {
  ftp: Server,
  live_tv: Tv,
  movie: Clapperboard,
  other: Globe,
};

const typeColor: Record<string, string> = {
  ftp: "from-sky-500 to-blue-600",
  live_tv: "from-rose-500 to-pink-600",
  movie: "from-violet-500 to-fuchsia-600",
  other: "from-emerald-500 to-teal-600",
};

const PortalMediaServers = () => {
  const { data: servers, isLoading } = useQuery({
    queryKey: ["portal-media-servers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("media_servers")
        .select("*")
        .eq("active", true)
        .order("sort_order")
        .order("name");
      return data || [];
    },
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white shadow">
          <Clapperboard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Movie & FTP Servers</h1>
          <p className="text-sm text-muted-foreground">Free entertainment & FTP access for our customers</p>
        </div>
      </div>

      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-10 text-center text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : servers && servers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {servers.map((srv) => {
            const Icon = typeIcons[srv.type] || Globe;
            const tint = typeColor[srv.type] || typeColor.other;
            return (
              <Card key={srv.id} className="border-0 shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${tint} flex items-center justify-center text-white shadow shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{srv.name}</h3>
                      </div>
                      <Badge className="mt-1 bg-muted text-muted-foreground border-0 text-[10px] uppercase">
                        {srv.type.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  {srv.description && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{srv.description}</p>
                  )}
                  {(srv.username || srv.password) && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      {srv.username && (
                        <div className="bg-muted/50 rounded-lg px-2 py-1.5">
                          <div className="text-[10px] text-muted-foreground">User</div>
                          <div className="font-mono font-medium truncate">{srv.username}</div>
                        </div>
                      )}
                      {srv.password && (
                        <div className="bg-muted/50 rounded-lg px-2 py-1.5">
                          <div className="text-[10px] text-muted-foreground">Pass</div>
                          <div className="font-mono font-medium truncate">{srv.password}</div>
                        </div>
                      )}
                    </div>
                  )}
                  <Button asChild size="sm" className="w-full mt-3 bg-gradient-to-r from-violet-500 to-indigo-600 hover:opacity-90 shadow">
                    <a href={srv.url} target="_blank" rel="noopener noreferrer">
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clapperboard className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No servers available yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Admin will publish servers here soon</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PortalMediaServers;
