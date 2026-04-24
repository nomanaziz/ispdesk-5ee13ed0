import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Building2, Briefcase } from "lucide-react";

type ScopeType = "department" | "designation";

interface Props {
  scopeType: ScopeType;
}

function ScopeList({ scopeType }: Props) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [days, setDays] = useState("0");

  const { data: scopes = [] } = useQuery({
    queryKey: [scopeType + "s-active"],
    queryFn: async () => {
      const table = scopeType === "department" ? "departments" : "designations";
      const { data, error } = await supabase.from(table).select("id, name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["leave-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_categories").select("id, name, days_allowed").eq("status", "active").order("name");
      if (error) throw error;
      return data as { id: string; name: string; days_allowed: number | null }[];
    },
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["leave-policies", scopeType, selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = await (supabase as any)
        .from("leave_policies")
        .select("*, leave_categories(name)")
        .eq("scope_type", scopeType)
        .eq("scope_id", selectedId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedId,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId || !categoryId) throw new Error("সব ফিল্ড পূরণ করুন");
      const { error } = await (supabase as any).from("leave_policies").upsert(
        {
          scope_type: scopeType,
          scope_id: selectedId,
          category_id: categoryId,
          days_allowed: parseInt(days) || 0,
        },
        { onConflict: "scope_type,scope_id,category_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-policies"] });
      toast.success("লিভ ক্যাটাগরি assigned");
      setCategoryId("");
      setDays("0");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("leave_policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-policies"] });
      toast.success("Policy মুছে ফেলা হয়েছে");
    },
  });

  const updateDays = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await (supabase as any).from("leave_policies").update({ days_allowed: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave-policies"] }),
  });

  const selectedScope = scopes.find((s) => s.id === selectedId);
  const Icon = scopeType === "department" ? Building2 : Briefcase;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: scope list */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {scopeType === "department" ? "ডিপার্টমেন্ট" : "পদবী"} সমূহ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 max-h-[60vh] overflow-y-auto">
          {scopes.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">কোনো {scopeType === "department" ? "ডিপার্টমেন্ট" : "পদবী"} নেই</p>
          ) : (
            <div className="space-y-1">
              {scopes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedId === s.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right: policy editor */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {selectedScope ? `${selectedScope.name} — Assigned Leave Categories` : "একটি " + (scopeType === "department" ? "ডিপার্টমেন্ট" : "পদবী") + " নির্বাচন করুন"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedId && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2 items-end p-3 rounded-md bg-muted/50">
                <div>
                  <Label className="text-xs">Leave Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="ক্যাটাগরি বাছুন" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Days</Label>
                  <Input type="number" min="0" value={days} onChange={(e) => setDays(e.target.value)} />
                </div>
                <Button onClick={() => assignMutation.mutate()} disabled={!categoryId || assignMutation.isPending}>
                  <Plus className="h-4 w-4 mr-1" /> Assign
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead className="w-32">Leave Count</TableHead>
                    <TableHead className="w-20 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">কোনো policy assigned নেই</TableCell></TableRow>
                  ) : policies.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.leave_categories?.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          defaultValue={p.days_allowed}
                          className="h-8 w-20"
                          onBlur={(e) => {
                            const v = parseInt(e.target.value) || 0;
                            if (v !== p.days_allowed) updateDays.mutate({ id: p.id, value: v });
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PolicyEditor() {
  return (
    <Tabs defaultValue="designation" className="w-full">
      <TabsList>
        <TabsTrigger value="designation"><Briefcase className="h-3.5 w-3.5 mr-1" /> পদবী অনুসারে</TabsTrigger>
        <TabsTrigger value="department"><Building2 className="h-3.5 w-3.5 mr-1" /> ডিপার্টমেন্ট অনুসারে</TabsTrigger>
      </TabsList>
      <TabsContent value="designation" className="mt-4">
        <ScopeList scopeType="designation" />
      </TabsContent>
      <TabsContent value="department" className="mt-4">
        <ScopeList scopeType="department" />
      </TabsContent>
    </Tabs>
  );
}
