import { useState } from "react";
import { useEmployeeContext } from "@/hooks/useEmployeeContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const CATEGORIES = ["Tools", "Router", "Networking Component", "Mobile", "Computer", "Other"];

export default function MyRequisitions() {
  const qc = useQueryClient();
  const { employee } = useEmployeeContext();
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Tools");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");

  const { data } = useQuery({
    queryKey: ["my-requisitions", employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("requisitions" as any)
        .select("*")
        .eq("employee_id", employee!.id)
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!employee?.id) throw new Error("Employee not loaded");
      if (!itemName.trim()) throw new Error("আইটেমের নাম দিন");
      const { error } = await supabase.from("requisitions" as any).insert({
        employee_id: employee.id,
        request_type: "employee",
        item_name: itemName.trim(),
        category,
        quantity: Number(qty || 1),
        estimated_cost: price ? Number(price) : null,
        description: desc || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("রিকুইজিশন জমা হয়েছে");
      setItemName(""); setCategory("Tools"); setQty("1"); setPrice(""); setDesc("");
      qc.invalidateQueries({ queryKey: ["my-requisitions", employee?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("requisitions" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("বাতিল হয়েছে");
      qc.invalidateQueries({ queryKey: ["my-requisitions", employee?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!employee) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>নতুন রিকুইজিশন</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>আইটেমের নাম</Label>
            <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="যেমন: TP-Link Router AC1200" />
          </div>
          <div>
            <Label>ক্যাটাগরি</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>পরিমাণ</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>আনুমানিক মূল্য (৳)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>বিস্তারিত / প্রয়োজনের কারণ</Label>
            <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>আবেদন জমা দিন</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">আমার রিকুইজিশন</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>তারিখ</TableHead><TableHead>আইটেম</TableHead><TableHead>ক্যাট.</TableHead>
              <TableHead>পরিমাণ</TableHead><TableHead>আনুমানিক</TableHead>
              <TableHead>স্ট্যাটাস</TableHead><TableHead className="w-12"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(data ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("bn-BD")}</TableCell>
                  <TableCell className="font-medium">{r.item_name}</TableCell>
                  <TableCell className="text-xs">{r.category || "—"}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell>৳{Number(r.estimated_cost || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "outline"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === "pending" && (
                      <Button size="icon" variant="ghost" onClick={() => cancel.mutate(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4">কোনো রিকুইজিশন নেই</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
