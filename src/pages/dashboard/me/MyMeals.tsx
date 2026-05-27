import { useEmployeeContext } from "@/hooks/useEmployeeContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useState } from "react";

const DAY_NAMES = ["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র"];

function bdDow(date: Date) {
  // Sat=0 ... Fri=6
  const js = date.getDay(); // Sun=0..Sat=6
  return (js + 1) % 7;
}

export default function MyMeals() {
  const qc = useQueryClient();
  const { employee } = useEmployeeContext();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const d = new Date(date);
  const dow = bdDow(d);

  const { data: menus } = useQuery({
    queryKey: ["meal-menus-dow", dow],
    queryFn: async () => {
      const { data } = await supabase
        .from("catering_weekly_menu" as any).select("*, catering_services(id,name,active)")
        .eq("day_of_week", dow).eq("active", true);
      return ((data as any[]) ?? []).filter((m) => m.catering_services?.active);
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["my-orders", employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("meal_orders" as any).select("*, catering_services(name)").eq("employee_id", employee!.id).order("order_date", { ascending: false }).limit(30);
      return (data as any[]) ?? [];
    },
  });

  const place = useMutation({
    mutationFn: async (menu: any) => {
      const { error } = await supabase.from("meal_orders" as any).insert({
        employee_id: employee!.id,
        service_id: menu.service_id,
        order_date: date,
        menu_snapshot: menu.items,
        price: menu.price,
        status: "ordered",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("অর্ডার দেওয়া হয়েছে"); qc.invalidateQueries({ queryKey: ["my-orders"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_orders" as any).update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("বাতিল করা হয়েছে"); qc.invalidateQueries({ queryKey: ["my-orders"] }); },
  });

  if (!employee) return null;

  const monthCost = (orders ?? [])
    .filter((o) => o.status !== "cancelled" && o.order_date.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, o) => s + Number(o.price || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center justify-between">
          <span>খাবার অর্ডার — {DAY_NAMES[dow]}বার</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </CardTitle></CardHeader>
        <CardContent>
          {(menus ?? []).length === 0 && <p className="text-muted-foreground text-sm">এই দিনের জন্য কোনো menu সেট করা নেই</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(menus ?? []).map((m: any) => {
              const already = (orders ?? []).find((o: any) => o.order_date === date && o.service_id === m.service_id && o.status !== "cancelled");
              return (
                <Card key={m.id} className="border-2">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold">{m.catering_services?.name}</p>
                      <Badge variant="outline">৳{Number(m.price).toLocaleString()}</Badge>
                    </div>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {(m.items as any[]).map((it, i) => <li key={i}>{typeof it === "string" ? it : it.name}</li>)}
                    </ul>
                    <Button
                      className="w-full" size="sm"
                      disabled={!!already || place.isPending}
                      onClick={() => place.mutate(m)}
                    >
                      {already ? "অর্ডার করা হয়েছে" : "অর্ডার করুন"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex justify-between">
          <span>আমার সাম্প্রতিক অর্ডার</span>
          <Badge variant="outline">এই মাসে: ৳{monthCost.toLocaleString()}</Badge>
        </CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>তারিখ</TableHead><TableHead>Service</TableHead><TableHead className="text-right">মূল্য</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(orders ?? []).map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell>{o.order_date}</TableCell>
                  <TableCell>{o.catering_services?.name}</TableCell>
                  <TableCell className="text-right">৳{Number(o.price).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={o.status === "cancelled" ? "destructive" : "outline"}>{o.status}</Badge></TableCell>
                  <TableCell>
                    {o.status === "ordered" && new Date(o.order_date) >= new Date(new Date().toDateString()) && (
                      <Button size="sm" variant="ghost" onClick={() => cancel.mutate(o.id)}>বাতিল</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(orders ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">কোনো অর্ডার নেই</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
