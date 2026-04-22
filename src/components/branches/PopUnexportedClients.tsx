import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  popId: string;
  branchId?: string | null;
}

export default function PopUnexportedClients({ popId, branchId }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});
  const [revertId, setRevertId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["pop-unexported-mt", popId, branchId],
    enabled: !!popId,
    queryFn: async () => {
      let q = supabase
        .from("mikrotik_clients" as any)
        .select("id, name, password, profile, service, server_name, remote_address, status, user_status, branch_id, transferred_to_pop_id, transferred_at");
      if (branchId) {
        q = q.or(`branch_id.eq.${branchId},transferred_to_pop_id.eq.${popId}`);
      } else {
        q = q.eq("transferred_to_pop_id", popId);
      }
      const { data: rows, error: e } = await q.is("linked_client_id", null);
      if (e) throw e;
      return rows ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((r: any) =>
      [r.name, r.profile, r.server_name].some((v: any) => (v || "").toString().toLowerCase().includes(q))
    );
  }, [data, search]);

  const revertMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mikrotik_clients" as any)
        .update({
          transferred_to_pop_id: null,
          transferred_to_mikrotik_id: null,
          transferred_at: null,
          branch_id: null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Revert সম্পন্ন — user MikroTik Import pool-এ ফেরত গেছে");
      qc.invalidateQueries({ queryKey: ["pop-unexported-mt", popId] });
      setRevertId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (error) return <div className="text-sm text-destructive p-3 border border-destructive/30 rounded-md">লোড করতে সমস্যা হয়েছে: {(error as any).message}</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input placeholder="খুঁজুন (নাম / profile / server)" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <span className="text-xs text-muted-foreground">মোট: {filtered.length}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        এই MikroTik user-গুলো POP-এর scope-এ আছে কিন্তু এখনো client-এ convert হয়নি। Revert করলে user আবার admin "Import from MikroTik"-এ ফেরত যাবে।
      </p>
      <div className="rounded border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Server</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs">{showPwd[r.id] ? (r.password || "-") : "••••••"}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowPwd((s) => ({ ...s, [r.id]: !s[r.id] }))}>
                      {showPwd[r.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{r.profile || "-"}</TableCell>
                <TableCell>{r.service || "-"}</TableCell>
                <TableCell>{r.server_name || "-"}</TableCell>
                <TableCell>
                  <Badge variant={r.user_status === "disabled" ? "destructive" : "default"}>
                    {r.user_status || r.status || "active"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setRevertId(r.id)}>
                    <RotateCcw className="h-3.5 w-3.5" /> Revert
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">কোনো unexported user নেই</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!revertId} onOpenChange={(o) => !o && setRevertId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription>
              এই user MikroTik Import pool-এ ফেরত যাবে। POP আর তাকে দেখতে পাবে না, এবং admin চাইলে অন্য POP-এ পাঠাতে পারবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={() => revertId && revertMut.mutate(revertId)} disabled={revertMut.isPending}>
              Revert করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
