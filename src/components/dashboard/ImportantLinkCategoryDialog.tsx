import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export interface CategoryRow {
  id?: string;
  name: string;
  icon?: string | null;
  sort_order?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CategoryRow | null;
  onSaved: () => void;
}

export function ImportantLinkCategoryDialog({ open, onOpenChange, initial, onSaved }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Folder");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setIcon(initial?.icon || "Folder");
      setSortOrder(initial?.sort_order ?? 0);
    }
  }, [open, initial]);

  const save = async () => {
    if (!name.trim()) {
      toast.error("ক্যাটাগরি নাম দিন");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), icon: icon.trim() || "Folder", sort_order: sortOrder };
      if (initial?.id) {
        const { error } = await supabase.from("important_link_categories").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("important_link_categories").insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
      toast.success("সংরক্ষিত হয়েছে");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "সংরক্ষণ ব্যর্থ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "ক্যাটাগরি সম্পাদনা" : "নতুন ক্যাটাগরি"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>নাম *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="যেমন: Monitoring Tools" />
          </div>
          <div>
            <Label>আইকন (lucide নাম)</Label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Folder" />
            <p className="text-xs text-muted-foreground mt-1">যেমন: Folder, Activity, Server, Wallet</p>
          </div>
          <div>
            <Label>সাজানোর ক্রম</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}সংরক্ষণ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
