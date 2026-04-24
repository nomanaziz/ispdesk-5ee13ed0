import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background, Controls, MiniMap, Node, Edge, Position, ConnectionMode,
  useNodesState, useEdgesState, addEdge, Connection, MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, RefreshCw, Network as NetworkIcon, Map as MapIcon, GitBranch } from "lucide-react";
import { AddNodeDialog } from "@/components/network/AddNodeDialog";
import { AssignItemsDialog } from "@/components/network/AssignItemsDialog";
import { GeoLocationDialog } from "@/components/network/GeoLocationDialog";
import { NodePalette } from "@/components/network/NodePalette";
import { EdgeDialog, type EdgeData } from "@/components/network/EdgeDialog";
import { NetworkMap } from "@/components/network/NetworkMap";
import { NODE_STYLES, styleOf, type NodeKind } from "@/components/network/nodeStyles";
import { toast } from "sonner";

type DBNode = {
  id: string; name: string; node_type: string; parent_id: string | null;
  latitude: number | null; longitude: number | null; address: string | null;
  status: string; remarks: string | null; color: string | null; icon: string | null;
};
type DBEdge = {
  id: string; source_node_id: string; target_node_id: string;
  cable_type: string | null; core_color: string | null; core_no: number | null;
  length_m: number | null; color_code: string | null;
  start_point: string | null; end_point: string | null; remarks: string | null;
};

// Horizontal-tree fallback layout
function layout(nodes: DBNode[]) {
  const childrenMap = new Map<string | null, DBNode[]>();
  nodes.forEach((n) => {
    const k = n.parent_id;
    if (!childrenMap.has(k)) childrenMap.set(k, []);
    childrenMap.get(k)!.push(n);
  });
  const positions = new Map<string, { x: number; y: number }>();
  const X_GAP = 220, Y_GAP = 80;
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
  const [dbEdges, setDbEdges] = useState<DBEdge[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"schematic" | "map">("schematic");

  const [addOpen, setAddOpen] = useState(false);
  const [addParent, setAddParent] = useState<string | null>(null);
  const [addKind, setAddKind] = useState<NodeKind>("custom");
  const [assignOpen, setAssignOpen] = useState(false);
  const [geoOpen, setGeoOpen] = useState(false);
  const [edgeOpen, setEdgeOpen] = useState(false);
  const [activeNode, setActiveNode] = useState<DBNode | null>(null);
  const [activeEdge, setActiveEdge] = useState<EdgeData | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: n, error: ne }, { data: e, error: ee }] = await Promise.all([
      supabase.from("network_nodes")
        .select("id,name,node_type,parent_id,latitude,longitude,address,status,remarks,color,icon")
        .order("created_at"),
      supabase.from("network_edges")
        .select("id,source_node_id,target_node_id,cable_type,core_color,core_no,length_m,color_code,start_point,end_point,remarks"),
    ]);
    if (ne) toast.error(ne.message);
    if (ee) toast.error(ee.message);
    setDbNodes((n as DBNode[]) || []);
    setDbEdges((e as DBEdge[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Build flow nodes/edges
  useEffect(() => {
    const positions = layout(dbNodes);
    const flowNodes: Node[] = dbNodes.map((n) => {
      const s = styleOf(n.node_type);
      const Icon = s.icon;
      return {
        id: n.id,
        position: positions.get(n.id) || { x: 0, y: 0 },
        data: {
          dbNode: n,
          label: (
            <div className="text-left flex items-center gap-2">
              <span
                className="h-6 w-6 rounded flex items-center justify-center text-white shrink-0"
                style={{ background: n.color || s.color }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <div className="font-semibold truncate text-xs">{n.name}</div>
                <div className="text-[10px] uppercase opacity-60">{s.label}</div>
              </div>
            </div>
          ),
        },
        type: "default",
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          background: "hsl(var(--card))",
          color: "hsl(var(--card-foreground))",
          border: `2px solid ${n.color || s.color}`,
          borderRadius: 8,
          padding: 6,
          minWidth: 170,
          fontSize: 12,
        },
      };
    });

    // Edges: parent->child structural + explicit network_edges
    const structural: Edge[] = dbNodes
      .filter((n) => n.parent_id)
      // hide structural edge if explicit edge already exists between same pair
      .filter((n) => !dbEdges.some((e) => e.source_node_id === n.parent_id && e.target_node_id === n.id))
      .map((n) => ({
        id: `s-${n.parent_id}-${n.id}`,
        source: n.parent_id!,
        target: n.id,
        type: "smoothstep",
        style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1.5, strokeDasharray: "4 4" },
      }));

    const explicit: Edge[] = dbEdges.map((e) => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      type: "smoothstep",
      data: { dbEdge: e },
      label: e.length_m ? `${e.length_m}m` : undefined,
      labelStyle: { fontSize: 10, fill: "hsl(var(--foreground))" },
      labelBgStyle: { fill: "hsl(var(--background))" },
      style: { stroke: e.color_code || "#64748B", strokeWidth: 3 },
      markerEnd: { type: MarkerType.ArrowClosed, color: e.color_code || "#64748B" },
    }));

    setNodes(flowNodes);
    setEdges([...structural, ...explicit]);
  }, [dbNodes, dbEdges, setNodes, setEdges]);

  const handleDelete = async (id: string) => {
    if (!confirm("এই node এবং সব child delete হবে। নিশ্চিত?")) return;
    const { error } = await supabase.from("network_nodes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchAll(); }
  };

  const handleRename = async (n: DBNode) => {
    const newName = prompt("নতুন নাম:", n.name);
    if (!newName || newName === n.name) return;
    const { error } = await supabase.from("network_nodes").update({ name: newName }).eq("id", n.id);
    if (error) toast.error(error.message);
    else { toast.success("Renamed"); fetchAll(); }
  };

  // React Flow's manual connect handler — opens the cable dialog
  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target || c.source === c.target) return;
    setActiveEdge({
      source_node_id: c.source,
      target_node_id: c.target,
      cable_type: "fiber",
    });
    setEdgeOpen(true);
  }, []);

  // Click on an explicit edge to edit
  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    const dbEdge = (edge.data as any)?.dbEdge as DBEdge | undefined;
    if (!dbEdge) return;
    setActiveEdge({ ...dbEdge });
    setEdgeOpen(true);
  }, []);

  const renderNodeMenu = (n: DBNode) => (
    <ContextMenuContent className="w-56">
      <ContextMenuItem onClick={() => { setAddParent(n.id); setAddKind("custom"); setAddOpen(true); }}>
        <Plus className="h-4 w-4 mr-2" /> Add Child Node
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleRename(n)}>Rename</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => { setActiveNode(n); setAssignOpen(true); }}>
        Assign Items (Inventory)
      </ContextMenuItem>
      <ContextMenuItem onClick={() => { setActiveNode(n); setGeoOpen(true); }}>
        <MapIcon className="h-4 w-4 mr-2" /> Geo Location (lat/long)
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

  const nodeMap = useMemo(() => new Map(dbNodes.map((n) => [n.id, n])), [dbNodes]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <NetworkIcon className="h-5 w-5" /> Network Diagram
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList>
                <TabsTrigger value="schematic"><GitBranch className="h-3.5 w-3.5 mr-1" />Schematic</TabsTrigger>
                <TabsTrigger value="map"><MapIcon className="h-3.5 w-3.5 mr-1" />Map</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => { setAddParent(null); setAddKind("server_room"); setAddOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Root Node
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground mb-2">
            যেকোনো node-এ <strong>right-click</strong> করুন → child যোগ, items, lat/long, rename, delete। দু'টি node handle থেকে drag করে connect করলে cable dialog খুলবে।
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-2">
              <NodePalette
                onPick={(k) => { setAddParent(null); setAddKind(k); setAddOpen(true); }}
              />
            </div>
            <div className="col-span-12 md:col-span-10">
              {view === "schematic" ? (
                <div style={{ height: 600 }} className="border rounded-md bg-muted/20 relative">
                  {dbNodes.length === 0 && !loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                      <NetworkIcon className="h-12 w-12 opacity-40" />
                      <div>কোনো node নেই। বাঁদিকের palette থেকে একটা entity বেছে নিন।</div>
                    </div>
                  ) : (
                    <ReactFlow
                      nodes={wrappedNodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                      onEdgeClick={onEdgeClick}
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
              ) : (
                <NetworkMap nodes={dbNodes} edges={dbEdges} height={600} />
              )}

              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(NODE_STYLES).map(([k, s]) => (
                  <div key={k} className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded border" style={{ borderColor: s.color }}>
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddNodeDialog
        open={addOpen} onOpenChange={setAddOpen}
        parentId={addParent} defaultKind={addKind} onCreated={fetchAll}
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
            onSaved={fetchAll}
          />
        </>
      )}
      <EdgeDialog
        open={edgeOpen}
        onOpenChange={setEdgeOpen}
        edge={activeEdge}
        sourceLabel={activeEdge ? nodeMap.get(activeEdge.source_node_id)?.name : ""}
        targetLabel={activeEdge ? nodeMap.get(activeEdge.target_node_id)?.name : ""}
        onSaved={fetchAll}
      />
    </div>
  );
}
