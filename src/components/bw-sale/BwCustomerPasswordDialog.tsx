import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Copy } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customer: { id: string; customer_name: string; username: string | null } | null;
  onSaved?: () => void;
}

function gen(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function BwCustomerPasswordDialog({ open, onOpenChange, customer, onSaved }: Props) {
  const [pwd, setPwd] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!open || !customer) return;
    setPwd("");
    setUsername(customer.username || "");
    (async () => {
      const { data } = await supabase
        .from("bw_sale_customers")
        .select("username")
        .eq("id", customer.id)
        .maybeSingle();
      if (data?.username) setUsername(data.username);
    })();
  }, [open, customer]);

  const save = useMutation({
    mutationFn: async () => {
      if (!customer) return;
      const trimmed = username.trim();
      if (!trimmed) throw new Error("Username আবশ্যক");
      if (!pwd || pwd.length < 6) throw new Error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর");
      const patch: { password: string; username?: string } = { password: pwd };
      if (trimmed !== (customer.username || "")) patch.username = trimmed;
      const { error } = await supabase.from("bw_sale_customers").update(patch).eq("id", customer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password আপডেট হয়েছে");
      onSaved?.();
      onOpenChange(false);
      setPwd("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copy = async () => {
    if (!pwd) return;
    await navigator.clipboard.writeText(pwd);
    toast.success("Copied");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>পাসওয়ার্ড পরিবর্তন — {customer?.customer_name}</DialogTitle>
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
              <Button type="button" variant="outline" size="icon" onClick={() => setPwd(gen())} title="Regenerate">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={copy} title="Copy" disabled={!pwd}>
                <Copy className="h-4 w-4" />
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
