import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const FaqManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ content_key: "", content_value: { question: "", answer: "" } });

  const { data: faqs = [] } = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: async () => {
      const { data } = await supabase.from("landing_content").select("*").eq("section", "faq").order("sort_order");
      return data || [];
    },
  });

  const addFaq = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("landing_content").insert({
        section: "faq",
        content_key: form.content_key,
        content_value: form.content_value,
        sort_order: faqs.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      toast({ title: "FAQ added" });
      setOpen(false);
      setForm({ content_key: "", content_value: { question: "", answer: "" } });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteFaq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("landing_content").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      toast({ title: "FAQ deleted" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">FAQ Manager</h1>
            <p className="text-sm text-muted-foreground">Manage landing page FAQs</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add FAQ</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add FAQ</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Key</Label><Input value={form.content_key} onChange={e => setForm({...form, content_key: e.target.value})} placeholder="faq-1" /></div>
              <div><Label>Question</Label><Input value={form.content_value.question} onChange={e => setForm({...form, content_value: {...form.content_value, question: e.target.value}})} /></div>
              <div><Label>Answer</Label><textarea className="w-full min-h-[80px] border rounded-md p-2 text-sm" value={form.content_value.answer} onChange={e => setForm({...form, content_value: {...form.content_value, answer: e.target.value}})} /></div>
              <Button className="w-full" onClick={() => addFaq.mutate()} disabled={!form.content_key || !form.content_value.question}>Add FAQ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Answer</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faqs.map((f: any) => {
                const val = f.content_value as any;
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.content_key}</TableCell>
                    <TableCell>{val?.question || "—"}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">{val?.answer || "—"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteFaq.mutate(f.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {faqs.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No FAQs yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaqManager;
