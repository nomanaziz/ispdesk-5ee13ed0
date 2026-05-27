import { useState, useMemo } from "react";
import { useEmployeeContext } from "@/hooks/useEmployeeContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function daysBetween(a: string, b: string) {
  if (!a || !b) return 0;
  const d1 = new Date(a), d2 = new Date(b);
  return Math.max(0, Math.floor((+d2 - +d1) / 86400000) + 1);
}

export default function MyLeave() {
  const { employee } = useEmployeeContext();
  const qc = useQueryClient();
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const year = new Date().getFullYear();

  const { data: balances } = useQuery({
    queryKey: ["my-leave-bal", employee?.id, year],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_balances" as any)
        .select("*, leave_categories(name)")
        .eq("employee_id", employee!.id)
        .eq("year", year);
      return (data as any[]) ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["leave-categories-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_categories" as any).select("id, name").eq("status", "active").order("name");
      return (data as any[]) ?? [];
    },
  });

  const { data: applications } = useQuery({
    queryKey: ["my-leave-apps", employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_applications" as any)
        .select("*, leave_categories(name)")
        .eq("employee_id", employee!.id)
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const days = useMemo(() => daysBetween(startDate, endDate), [startDate, endDate]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!employee?.id) throw new Error("Employee not loaded");
      if (!categoryId) throw new Error("ছুটির ধরন নির্বাচন করুন");
      if (!startDate || !endDate) throw new Error("তারিখ নির্বাচন করুন");
      if (days <= 0) throw new Error("শেষ তারিখ শুরুর পরে হতে হবে");
      const { error } = await supabase.from("leave_applications" as any).insert({
        employee_id: employee.id,
        category_id: categoryId,
        start_date: startDate,
        end_date: endDate,
        days,
        reason: reason || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ছুটির আবেদন জমা হয়েছে");
      setCategoryId(""); setStartDate(""); setEndDate(""); setReason("");
      qc.invalidateQueries({ queryKey: ["my-leave-apps", employee?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!employee) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>আমার ছুটির ব্যালেন্স ({year})</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(balances ?? []).map((b: any) => (
            <Card key={b.id}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{b.leave_categories?.name || "—"}</p>
                <p className="text-xl font-bold">{Number(b.remaining_days || 0)} দিন</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  মোট {Number(b.total_days || 0)} • ব্যবহৃত {Number(b.used_days || 0)}
                </p>
              </CardContent>
            </Card>
          ))}
          {(balances ?? []).length === 0 && (
            <p className="text-muted-foreground text-sm col-span-full">ব্যালেন্স সেট করা নেই</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">নতুন ছুটির আবেদন</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>ছুটির ধরন</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="বাছাই করুন" /></SelectTrigger>
              <SelectContent>
                {(categories ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>মোট দিন</Label>
            <Input value={days || ""} readOnly className="bg-muted/40" />
          </div>
          <div>
            <Label>শুরু</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>শেষ</Label>
            <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>কারণ</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>আবেদন জমা দিন</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">আমার আবেদনসমূহ</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>ধরন</TableHead><TableHead>শুরু</TableHead><TableHead>শেষ</TableHead>
              <TableHead>দিন</TableHead><TableHead>স্ট্যাটাস</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(applications ?? []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{a.leave_categories?.name}</TableCell>
                  <TableCell className="text-xs">{a.start_date}</TableCell>
                  <TableCell className="text-xs">{a.end_date}</TableCell>
                  <TableCell>{a.days}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "outline"}>
                      {a.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(applications ?? []).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">কোনো আবেদন নেই</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
