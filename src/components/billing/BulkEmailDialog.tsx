import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedClients: any[];
}

export default function BulkEmailDialog({ open, onOpenChange, selectedClients }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!subject.trim() || !body.trim()) throw new Error("Subject ও Body আবশ্যক");
      const recipients = selectedClients.filter((c) => c.email).map((c) => c.email);
      if (recipients.length === 0) throw new Error("কোনো ক্লায়েন্টের ইমেইল নেই");

      const { data, error } = await supabase.functions.invoke("send-bulk-email", {
        body: { recipients, subject, html: body.replace(/\n/g, "<br/>") },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.sent || recipients.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} জনকে ইমেইল পাঠানো হয়েছে`);
      onOpenChange(false);
      setSubject("");
      setBody("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const validRecipients = selectedClients.filter((c) => c.email).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>বাল্ক ইমেইল পাঠান ({validRecipients}/{selectedClients.length} জনের ইমেইল আছে)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Subject *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Message *</Label>
            <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={() => sendMut.mutate()} disabled={sendMut.isPending || validRecipients === 0}>
            {sendMut.isPending ? "পাঠানো হচ্ছে..." : "পাঠান"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
