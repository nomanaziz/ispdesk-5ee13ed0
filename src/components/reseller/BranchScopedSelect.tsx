import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  /** Source table — `positions` is used for designations (matches employees.position_id FK) */
  table: "departments" | "positions";
  branchId: string | undefined;
  /** Selected row id (uuid) */
  value: string | null | undefined;
  /** Returns id (uuid) of selected row */
  onChange: (id: string) => void;
  placeholder?: string;
}

export default function BranchScopedSelect({ table, branchId, value, onChange, placeholder }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: [`pop-${table}-list`, branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("id, name")
        .eq("branch_id", branchId!)
        .order("name");
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!newName.trim()) throw new Error("Name আবশ্যক");
      if (!branchId) throw new Error("Branch নেই");
      const { data, error } = await supabase
        .from(table)
        .insert({ name: newName.trim(), branch_id: branchId, status: "active" } as any)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: [`pop-${table}-list`, branchId] });
      onChange(id);
      toast.success("যোগ হয়েছে");
      setOpen(false);
      setNewName("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <div className="flex gap-1.5">
        <SearchableSelect
          value={value || ""}
          onValueChange={onChange}
          options={items.map((it) => ({ value: it.id, label: it.name }))}
          placeholder={placeholder || "Select"}
          emptyText="No items — Add one below"
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={() => setOpen(true)} title="Add new">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add {table === "departments" ? "Department" : "Designation"}</DialogTitle></DialogHeader>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
