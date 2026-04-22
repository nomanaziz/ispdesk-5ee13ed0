import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  branchId?: string | null;
}

export default function PopLeftClientsTab({ branchId }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ ids: string[]; mode: "single" | "bulk" | "all" } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["pop-left-clients", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, client_id, name, username, contact, status, left_date, left_reason, monthly_bill, isp_packages(name)")
        .eq("branch_id", branchId!)
        .in("status", ["left", "inactive"])
        .order("left_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((r: any) =>
      [r.name, r.username, r.contact, r.client_id].some((v: any) => (v || "").toString().toLowerCase().includes(q))
    );
  }, [data, search]);

  const allSelected = filtered.length > 0 && filtered.every((r: any) => selected.has(r.id));

  const deleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      // Unlink mikrotik_clients first so they can be re-converted later
      await supabase
        .from("mikrotik_clients" as any)
        .update({ linked_client_id: null, exported: false })
        .in("linked_client_id", ids);

      const { error } = await supabase.from("clients").delete().in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} জন left client delete হয়েছে`);
      setSelected(new Set());
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["pop-left-clients", branchId] });
      qc.invalidateQueries({ queryKey: ["pop-exported-mt"] });
      qc.invalidateQueries({ queryKey: ["pop-unexported-mt"] });
    },
    onError: (e: any) => {
      toast.error(e.message);
      setConfirm(null);
    },
  });

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (error) return <div className="text-sm text-destructive p-3 border border-destructive/30 rounded-md">লোড করতে সমস্যা হয়েছে: {(error as any).message}</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="খুঁজুন" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <span className="text-xs text-muted-foreground">মোট: {filtered.length}</span>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={selected.size === 0}
            onClick={() => setConfirm({ ids: Array.from(selected), mode: "bulk" })}
          >
            <Trash2 className="h-3.5 w-3.5" /> Bulk Delete ({selected.size})
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={(filtered ?? []).length === 0}
            onClick={() => setConfirm({ ids: filtered.map((r: any) => r.id), mode: "all" })}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete All Left Clients
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Left clients delete করলে prepaid POP হলে unused দিনের টাকা automatic refund হবে।
      </p>
      <div className="rounded border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => {
                    if (v) setSelected(new Set(filtered.map((r: any) => r.id)));
                    else setSelected(new Set());
                  }}
                />
              </TableHead>
              <TableHead>Client ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Left Date</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={(v) => {
                      setSelected((s) => {
                        const n = new Set(s);
                        if (v) n.add(r.id); else n.delete(r.id);
                        return n;
                      });
                    }}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{r.client_id || "-"}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell className="font-mono text-xs">{r.username || "-"}</TableCell>
                <TableCell>{r.contact || "-"}</TableCell>
                <TableCell>{r.isp_packages?.name || "-"}</TableCell>
                <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                <TableCell className="text-xs">{r.left_date ? new Date(r.left_date).toLocaleDateString("bn-BD") : "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.left_reason || "-"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setConfirm({ ids: [r.id], mode: "single" })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">কোনো left client নেই</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.ids.length} জন left client permanently delete হবে। এটা আর ফিরে আসবে না। Prepaid POP-এর ক্ষেত্রে unused দিনের টাকা refund হবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirm && deleteMut.mutate(confirm.ids)}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
