import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  olt: { id: string; name: string } | null;
}

export default function ResellerAccessDialog({ open, onOpenChange, olt }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: resellers = [], isLoading: loadingR } = useQuery({
    queryKey: ["resellers-for-access"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_managers")
        .select("id, name, company_name, phone, pop_code, status")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: existing = [], isLoading: loadingE } = useQuery({
    queryKey: ["olt-reseller-access", olt?.id],
    enabled: open && !!olt?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("olt_reseller_access")
        .select("reseller_branch_manager_id")
        .eq("olt_id", olt!.id);
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (open) setSelected(new Set(existing.map((r: any) => r.reseller_branch_manager_id)));
  }, [open, existing]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resellers;
    return resellers.filter((r: any) =>
      [r.name, r.company_name, r.phone, r.pop_code].some((v) => (v || "").toString().toLowerCase().includes(q))
    );
  }, [resellers, search]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!olt) return;
      const current = new Set(existing.map((r: any) => r.reseller_branch_manager_id));
      const toAdd = [...selected].filter((id) => !current.has(id));
      const toRemove = [...current].filter((id) => !selected.has(id));

      const { data: auth } = await supabase.auth.getUser();
      const granted_by = auth.user?.id ?? null;

      if (toAdd.length) {
        const rows = toAdd.map((rid) => ({
          olt_id: olt.id,
          reseller_branch_manager_id: rid,
          granted_by,
        }));
        const { error } = await supabase.from("olt_reseller_access").insert(rows);
        if (error) throw error;
      }
      if (toRemove.length) {
        const { error } = await supabase
          .from("olt_reseller_access")
          .delete()
          .eq("olt_id", olt.id)
          .in("reseller_branch_manager_id", toRemove);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Reseller access আপডেট হয়েছে");
      qc.invalidateQueries({ queryKey: ["olt-reseller-access"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "সংরক্ষণ ব্যর্থ"),
  });

  const loading = loadingR || loadingE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Reseller Access
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{olt?.name}</span> — যেসব reseller এই OLT অ্যাক্সেস করতে পারবে নির্বাচন করুন
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Reseller খুঁজুন (নাম, কোম্পানি, ফোন)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>মোট {filtered.length} জন</span>
          <span>{selected.size} জন নির্বাচিত</span>
        </div>

        <ScrollArea className="h-[340px] rounded-md border">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> লোড হচ্ছে...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-sm">কোনো reseller পাওয়া যায়নি</div>
          ) : (
            <ul className="divide-y">
              {filtered.map((r: any) => {
                const checked = selected.has(r.id);
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggle(r.id)}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggle(r.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {r.name}
                        {r.pop_code && <span className="ml-2 text-xs text-muted-foreground font-mono">{r.pop_code}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.company_name || "—"} {r.phone ? `• ${r.phone}` : ""}
                      </div>
                    </div>
                    {r.status && (
                      <Badge variant={r.status === "active" ? "default" : "secondary"} className="text-[10px] capitalize">
                        {r.status}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} সংরক্ষণ করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
