import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pop: { id: string; name: string; username: string | null } | null;
}

function gen(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function PasswordRegenerateDialog({ open, onOpenChange, pop }: Props) {
  const qc = useQueryClient();
  const [pwd, setPwd] = useState("");
  const [username, setUsername] = useState("");

  // Always reload the latest username from DB when the dialog opens — list cache may be stale.
  useEffect(() => {
    if (!open || !pop) return;
    setPwd("");
    setUsername(pop.username || "");
    (async () => {
      const { data } = await supabase
        .from("branch_managers")
        .select("username")
        .eq("id", pop.id)
        .maybeSingle();
      if (data?.username !== undefined && data?.username !== null) {
        setUsername(data.username);
      }
    })();
  }, [open, pop]);

  const save = useMutation({
    mutationFn: async () => {
      if (!pop) return;
      const trimmedUser = username.trim();
      if (!trimmedUser) throw new Error("Username আবশ্যক");
      if (!pwd || pwd.length < 6) throw new Error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর");
      const patch: { password: string; username?: string } = { password: pwd };
      if (trimmedUser !== (pop.username || "")) patch.username = trimmedUser;
      const { error } = await supabase.from("branch_managers").update(patch).eq("id", pop.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("আপডেট হয়েছে");
      qc.invalidateQueries({ queryKey: ["branch-managers"] });
      onOpenChange(false);
      setPwd("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>পাসওয়ার্ড পরিবর্তন — {pop?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
            />
            <p className="text-xs text-muted-foreground mt-1">
              চাইলে এখান থেকেই Username পরিবর্তন করতে পারেন।
            </p>
          </div>
          <div>
            <Label>নতুন পাসওয়ার্ড</Label>
            <div className="flex gap-2">
              <Input value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="নতুন পাসওয়ার্ড" />
              <Button type="button" variant="outline" onClick={() => setPwd(gen())}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>সংরক্ষণ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
