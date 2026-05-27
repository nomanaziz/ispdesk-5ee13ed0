import { useEmployeeContext } from "@/hooks/useEmployeeContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogIn, LogOut } from "lucide-react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function nowTime() {
  return new Date().toTimeString().slice(0, 8);
}

export default function MyAttendance() {
  const { employee } = useEmployeeContext();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["my-attendance-list", employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance" as any)
        .select("*")
        .eq("employee_id", employee!.id)
        .order("date", { ascending: false })
        .limit(60);
      return (data as any[]) ?? [];
    },
  });

  const today = (data ?? []).find((r: any) => r.date === todayISO());

  const checkIn = useMutation({
    mutationFn: async () => {
      if (!employee?.id) throw new Error("Employee not loaded");
      const payload: any = {
        employee_id: employee.id,
        date: todayISO(),
        check_in: nowTime(),
        status: "present",
        source: "self",
        punch_in_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("attendance" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-in হয়েছে — admin verify করবে");
      qc.invalidateQueries({ queryKey: ["my-attendance-list", employee?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const checkOut = useMutation({
    mutationFn: async () => {
      if (!today) throw new Error("আজকের check-in পাওয়া যায়নি");
      const { error } = await supabase
        .from("attendance" as any)
        .update({ check_out: nowTime(), punch_out_at: new Date().toISOString() })
        .eq("id", today.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-out হয়েছে");
      qc.invalidateQueries({ queryKey: ["my-attendance-list", employee?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!employee) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>আজকের হাজিরা — {todayISO()}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-center">
          <div className="text-sm space-y-1">
            <p>প্রবেশ: <span className="font-mono">{today?.check_in || "—"}</span></p>
            <p>প্রস্থান: <span className="font-mono">{today?.check_out || "—"}</span></p>
            {today?.source === "self" && !today?.check_out && (
              <Badge variant="outline">Admin verify-এর অপেক্ষায়</Badge>
            )}
          </div>
          <div className="flex gap-2 ml-auto">
            <Button
              onClick={() => checkIn.mutate()}
              disabled={!!today || checkIn.isPending}
              className="gap-2"
            >
              <LogIn className="h-4 w-4" /> Check In
            </Button>
            <Button
              onClick={() => checkOut.mutate()}
              disabled={!today || !!today?.check_out || checkOut.isPending}
              variant="secondary"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" /> Check Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>আমার হাজিরা (শেষ ৬০ দিন)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>তারিখ</TableHead>
                <TableHead>প্রবেশ</TableHead>
                <TableHead>প্রস্থান</TableHead>
                <TableHead>উৎস</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell className="text-xs">{r.check_in || "—"}</TableCell>
                  <TableCell className="text-xs">{r.check_out || "—"}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline">{r.source || "manual"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "present"
                          ? "default"
                          : r.status === "absent"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    কোনো record নেই
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
