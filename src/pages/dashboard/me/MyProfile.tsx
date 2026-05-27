import { useState } from "react";
import { useEmployeeContext } from "@/hooks/useEmployeeContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const EDITABLE_FIELDS: { key: string; label: string }[] = [
  { key: "phone", label: "ফোন" },
  { key: "personal_phone", label: "ব্যক্তিগত ফোন" },
  { key: "email", label: "ইমেইল" },
  { key: "address", label: "ঠিকানা" },
  { key: "permanent_address", label: "স্থায়ী ঠিকানা" },
  { key: "guardian_phone", label: "অভিভাবকের ফোন" },
];

export default function MyProfile() {
  const qc = useQueryClient();
  const { employee, loading } = useEmployeeContext();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { data: pending } = useQuery({
    queryKey: ["my-profile-pending", employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profile_change_requests" as any)
        .select("*").eq("employee_id", employee!.id).order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const changes: Record<string, any> = {};
      for (const f of EDITABLE_FIELDS) {
        const v = (draft[f.key] ?? "").trim();
        if (v && v !== (employee?.[f.key] ?? "")) changes[f.key] = v;
      }
      if (Object.keys(changes).length === 0) throw new Error("কোনো পরিবর্তন নেই");
      const { error } = await supabase.from("profile_change_requests" as any).insert({
        employee_id: employee!.id, changes, status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("পরিবর্তনের আবেদন পাঠানো হয়েছে। HR অনুমোদন করলে কার্যকর হবে।");
      setDraft({});
      qc.invalidateQueries({ queryKey: ["my-profile-pending"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || !employee) return <p className="text-muted-foreground">লোড হচ্ছে...</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>আমার প্রোফাইল</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Info label="নাম" value={employee.name} />
          <Info label="কর্মী আইডি" value={employee.employee_id} />
          <Info label="পদবি" value={employee.position_id ? "—" : "—"} />
          <Info label="যোগদানের তারিখ" value={employee.joining_date} />
          {EDITABLE_FIELDS.map((f) => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}</Label>
              <Input
                value={draft[f.key] ?? employee[f.key] ?? ""}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </CardContent>
        <CardContent className="pt-0">
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
            পরিবর্তনের জন্য আবেদন পাঠান
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">আমার আবেদনের ইতিহাস</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>তারিখ</TableHead><TableHead>পরিবর্তন</TableHead><TableHead>স্ট্যাটাস</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(pending ?? []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{new Date(p.created_at).toLocaleDateString("bn-BD")}</TableCell>
                  <TableCell className="text-xs">{Object.keys(p.changes || {}).join(", ")}</TableCell>
                  <TableCell><Badge variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "outline"}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
              {(pending ?? []).length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">কোনো আবেদন নেই</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
