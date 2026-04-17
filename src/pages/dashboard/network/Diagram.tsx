import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background, Controls, MiniMap, Node, Edge, Position,
  useNodesState, useEdgesState, ConnectionMode,
} from "reactflow";
import "reactflow/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Plus, RefreshCw, Network as NetworkIcon } from "lucide-react";
import { AddNodeDialog } from "@/components/network/AddNodeDialog";
import { AssignItemsDialog } from "@/components/network/AssignItemsDialog";
import { GeoLocationDialog } from "@/components/network/GeoLocationDialog";
import { toast } from "sonner";

type DBNode = {
  id: string; name: string; node_type: string; parent_id: string | null;
  latitude: number | null; longitude: number | null; address: string | null;
  status: string; remarks: string | null;
};

const NODE_COLOR: Record<string, string> = {
  pop: "hsl(var(--primary))", olt: "hsl(217 91% 60%)", splitter_main: "hsl(38 92% 50%)",
  splitter_sub: "hsl(48 96% 53%)", switch: "hsl(280 70% 60%)", router: "hsl(340 75% 55%)",
  onu: "hsl(160 60% 45%)", client: "hsl(200 80% 55%)", custom: "hsl(var(--muted-foreground))",
};

// Simple horizontal-tree layout
function layout(nodes: DBNode[]) {
  const childrenMap = new Map<string | null, DBNode[]>();
  nodes.forEach((n) => {
    const k = n.parent_id;
    if (!childrenMap.has(k)) childrenMap.set(k, []);
    childrenMap.get(k)!.push(n);
  });
  const positions = new Map<string, { x: number; y: number }>();
  const X_GAP = 240, Y_GAP = 90;
  let yCounter = 0;
  function place(id: string | null, depth: number): number {
    const kids = childrenMap.get(id) || [];
    if (kids.length === 0) {
      const y = yCounter * Y_GAP;
      yCounter++;
      return y;
    }
    const ys = kids.map((c) => {
      const cy = place(c.id, depth + 1);
      positions.set(c.id, { x: depth * X_GAP, y: cy });
      return cy;
    });
    return (ys[0] + ys[ys.length - 1]) / 2;
  }
  const roots = childrenMap.get(null) || [];
  roots.forEach((r) => {
    const y = place(r.id, 1);
    positions.set(r.id, { x: 0, y });
  });
  return positions;
}

export default function Diagram() {
  const [dbNodes, setDbNodes] = useState<DBNode[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [addParent, setAddParent] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [geoOpen, setGeoOpen] = useState(false);
  const [activeNode, setActiveNode] = useState<DBNode | null>(null);

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("network_nodes")
      .select("id,name,node_type,parent_id,latitude,longitude,address,status,remarks")
      .order("created_at");
    if (error) { toast.error(error.message); setLoading(false); return; }
    setDbNodes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  useEffect(() => {
    const positions = layout(dbNodes);
    const flowNodes: Node[] = dbNodes.map((n) => ({
      id: n.id,
      position: positions.get(n.id) || { x: 0, y: 0 },
      data: { label: n, dbNode: n },
      type: "default",
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        background: "hsl(var(--card))",
        color: "hsl(var(--card-foreground))",
        border: `2px solid ${NODE_COLOR[n.node_type] || NODE_COLOR.custom}`,
        borderRadius: 8,
        padding: 8,
        minWidth: 160,
        fontSize: 12,
      },
    }));
    flowNodes.forEach((fn) => {
      const n = (fn.data as any).dbNode as DBNode;
      fn.data = {
        label: (
          <div className="text-left">
            <div className="font-semibold truncate">{n.name}</div>
            <div className="text-[10px] uppercase opacity-70">{n.node_type.replace("_", " ")}</div>
          </div>
        ),
        dbNode: n,
      };
    });
    const flowEdges: Edge[] = dbNodes
      .filter((n) => n.parent_id)
      .map((n) => ({
        id: `e-${n.parent_id}-${n.id}`,
        source: n.parent_id!,
        target: n.id,
        type: "smoothstep",
        style: { stroke: "hsl(var(--primary))", strokeWidth: 1.5 },
      }));
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [dbNodes, setNodes, setEdges]);

  const handleDelete = async (id: string) => {
    if (!confirm("এই node এবং সব child delete হবে। নিশ্চিত?")) return;
    const { error } = await supabase.from("network_nodes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchNodes(); }
  };

  const handleRename = async (n: DBNode) => {
    const newName = prompt("নতুন নাম:", n.name);
    if (!newName || newName === n.name) return;
    const { error } = await supabase.from("network_nodes").update({ name: newName }).eq("id", n.id);
    if (error) toast.error(error.message);
    else { toast.success("Renamed"); fetchNodes(); }
  };

  const renderNodeMenu = (n: DBNode) => (
    <ContextMenuContent className="w-56">
      <ContextMenuItem onClick={() => { setAddParent(n.id); setAddOpen(true); }}>
        <Plus className="h-4 w-4 mr-2" /> Add Child Node
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleRename(n)}>Rename</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => { setActiveNode(n); setAssignOpen(true); }}>
        Assign Items (Inventory)
      </ContextMenuItem>
      <ContextMenuItem onClick={() => { setActiveNode(n); setGeoOpen(true); }}>
        Geo Location
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem className="text-destructive" onClick={() => handleDelete(n.id)}>
        Delete Node
      </ContextMenuItem>
    </ContextMenuContent>
  );

  const wrappedNodes = useMemo(() => nodes.map((fn) => {
    const dbNode = (fn.data as any).dbNode as DBNode;
    return {
      ...fn,
      data: {
        ...fn.data,
        label: (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div>{(fn.data as any).label}</div>
            </ContextMenuTrigger>
            {renderNodeMenu(dbNode)}
          </ContextMenu>
        ),
      },
    };
  }), [nodes]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <NetworkIcon className="h-5 w-5" /> Network Diagram
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchNodes} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => { setAddParent(null); setAddOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Root Node
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground mb-2">
            যেকোনো node-এ <strong>right-click</strong> করুন options-এর জন্য (child যোগ, items, location, rename, delete)।
          </div>
          <div style={{ height: 600 }} className="border rounded-md bg-muted/20">
            {dbNodes.length === 0 && !loading ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <NetworkIcon className="h-12 w-12 opacity-40" />
                <div>কোনো node নেই। প্রথমে একটা Root Node তৈরি করুন।</div>
                <Button onClick={() => { setAddParent(null); setAddOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Root Node তৈরি করুন
                </Button>
              </div>
            ) : (
              <ReactFlow
                nodes={wrappedNodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                connectionMode={ConnectionMode.Loose}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background />
                <Controls />
                <MiniMap pannable zoomable />
              </ReactFlow>
            )}
          </div>
        </CardContent>
      </Card>

      <AddNodeDialog
        open={addOpen} onOpenChange={setAddOpen}
        parentId={addParent} onCreated={fetchNodes}
      />
      {activeNode && (
        <>
          <AssignItemsDialog
            open={assignOpen} onOpenChange={setAssignOpen}
            nodeId={activeNode.id} nodeName={activeNode.name}
          />
          <GeoLocationDialog
            open={geoOpen} onOpenChange={setGeoOpen}
            nodeId={activeNode.id}
            initial={{ latitude: activeNode.latitude, longitude: activeNode.longitude, address: activeNode.address }}
            onSaved={fetchNodes}
          />
        </>
      )}
    </div>
  );
}
