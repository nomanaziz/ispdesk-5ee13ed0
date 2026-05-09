import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ClientCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any | null;
  onSaved?: () => void;
}

export default function ClientCommentDialog({ open, onOpenChange, client, onSaved }: ClientCommentDialogProps) {
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const { value: cbSettings } = useSystemSetting<any>("client_billing_settings", { mikrotik_sync_comments: false });
  const syncEnabled = !!cbSettings?.mikrotik_sync_comments;

  useEffect(() => {
    if (open && client) {
      setRemarks(client.remarks || "");
    }
  }, [open, client]);

  if (!client) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const newRemarks = remarks.trim();
      const { error } = await supabase
        .from("clients")
        .update({ remarks: newRemarks || null })
        .eq("id", client.id);
      if (error) throw error;

      // Optional MikroTik sync
      if (syncEnabled && client.mikrotik_id && client.username) {
        try {
          const { error: fnErr } = await supabase.functions.invoke("manage-mikrotik-ppp", {
            body: {
              action: "set-comment",
              mikrotik_id: client.mikrotik_id,
              username: client.username,
              client_id: client.id,
              comment: newRemarks,
            },
          });
          if (fnErr) {
            toast.warning(`MikroTik comment sync ব্যর্থ: ${fnErr.message}`);
          } else {
            toast.success("Comment সংরক্ষণ ও MikroTik-এ sync হয়েছে");
          }
        } catch (e: any) {
          toast.warning(`MikroTik comment sync ব্যর্থ: ${e.message}`);
        }
      } else {
        toast.success("Comment সংরক্ষণ হয়েছে");
      }

      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Client Comments / Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Client Code</Label>
              <Input value={client.client_id || ""} disabled className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">User ID</Label>
              <Input value={client.username || client.user_id || ""} disabled className="h-8 text-xs" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Remarks / Note / Comments</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Client সম্পর্কিত কোনো তথ্য লিখুন..."
              className="min-h-[120px] text-sm"
            />
          </div>
          {syncEnabled && (
            <p className="text-[11px] text-muted-foreground">
              ⓘ MikroTik comment sync সক্রিয় — save করলে router-এর PPP secret-এর comment field-ও আপডেট হবে।
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
