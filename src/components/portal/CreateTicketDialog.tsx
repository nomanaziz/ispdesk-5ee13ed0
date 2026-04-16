import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const CreateTicketDialog = ({ open, onOpenChange }: Props) => {
  const { customer } = usePortalAuth();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [categoryId, setCategoryId] = useState<string | undefined>();

  const { data: categories } = useQuery({
    queryKey: ["support-categories-portal"],
    queryFn: async () => {
      const { data } = await supabase.from("support_categories").select("id, name").order("name");
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const ticket_no = `TK${Date.now().toString().slice(-8)}`;
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          ticket_no,
          subject,
          description,
          priority,
          category_id: categoryId || null,
          client_id: customer?.type === "client" ? customer.sub : null,
          status: "open",
          source: "portal",
        })
        .select()
        .single();
      if (error) throw error;

      // Initial message
      if (data) {
        await supabase.from("support_ticket_messages").insert({
          ticket_id: data.id,
          sender_type: "client",
          sender_id: customer?.sub,
          sender_name: customer?.name,
          message: description,
        });
      }
      return data;
    },
    onSuccess: () => {
      toast({ title: "Ticket created", description: "We'll get back to you shortly." });
      qc.invalidateQueries({ queryKey: ["portal-tickets"] });
      onOpenChange(false);
      setSubject(""); setDescription(""); setPriority("normal"); setCategoryId(undefined);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Subject *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Briefly describe the issue" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {categories?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Tell us in detail what's happening…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => create.mutate()}
            disabled={!subject || !description || create.isPending}
            className="bg-gradient-to-r from-violet-500 to-indigo-600"
          >
            {create.isPending ? "Submitting…" : "Submit Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
