import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map as MapIcon } from "lucide-react";
import { NetworkMap } from "@/components/network/NetworkMap";
import { Skeleton } from "@/components/ui/skeleton";

export default function Map() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: n }, { data: e }] = await Promise.all([
        supabase.from("network_nodes").select("id,name,node_type,latitude,longitude,address"),
        supabase.from("network_edges").select("id,source_node_id,target_node_id,color_code,cable_type,length_m"),
      ]);
      setNodes(n || []);
      setEdges(e || []);
      setLoading(false);
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapIcon className="h-5 w-5" /> Network Map View
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          সব node-এর geo location ও তাদের cable connection মানচিত্রে দেখানো হচ্ছে।
          যে node-এ lat/long নেই সেটি map-এ আসবে না — Diagram page থেকে right-click করে location দিন।
        </p>
        {loading ? <Skeleton className="h-[600px] w-full" /> : (
          <NetworkMap nodes={nodes} edges={edges} height={650} />
        )}
      </CardContent>
    </Card>
  );
}
