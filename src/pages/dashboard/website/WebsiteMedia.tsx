import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Image, FileText, Film } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Media { id: string; filename: string; url: string; file_type: string | null; file_size: number | null; alt_text: string | null; created_at: string; }
const empty: Partial<Media> = { filename: "", url: "", file_type: "image", file_size: null, alt_text: "" };

export default function WebsiteMedia() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Media>>(empty);

  const { data, isLoading } = useQuery({
    queryKey: ["website_media"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("website_media").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Media[];
    },
  });

  const save = useMutation({
    mutationFn: async (item: Partial<Media>) => {
      const { error } = await (supabase as any).from("website_media").insert({ filename: item.filename, url: item.url, file_type: item.file_type, file_size: item.file_size, alt_text: item.alt_text });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_media"] }); setOpen(false); toast({ title: "যোগ হয়েছে" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("website_media").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_media"] }); toast({ title: "ডিলিট হয়েছে" }); },
  });

  const getIcon = (type: string | null) => {
    if (type?.startsWith("image")) return <Image className="h-4 w-4" />;
    if (type?.startsWith("video")) return <Film className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">মিডিয়া লাইব্রেরি</h1><p className="text-muted-foreground">ওয়েবসাইটের মিডিয়া ফাইল ম্যানেজ করুন</p></div>
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />নতুন মিডিয়া</Button>
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Table>
          <TableHeader><TableRow><TableHead>প্রিভিউ</TableHead><TableHead>ফাইলনাম</TableHead><TableHead>ধরন</TableHead><TableHead>সাইজ</TableHead><TableHead>Alt Text</TableHead><TableHead className="text-right">অ্যাকশন</TableHead></TableRow></TableHeader>
          <TableBody>
            {data?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.file_type?.startsWith("image") ? <img src={item.url} alt={item.alt_text || item.filename} className="h-10 w-10 rounded object-cover" /> : getIcon(item.file_type)}
                </TableCell>
                <TableCell className="font-medium">{item.filename}</TableCell>
                <TableCell>{item.file_type || "—"}</TableCell>
                <TableCell>{formatSize(item.file_size)}</TableCell>
                <TableCell className="truncate max-w-[150px]">{item.alt_text || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">কোনো মিডিয়া নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>নতুন মিডিয়া যোগ করুন</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="ফাইলনাম" value={form.filename || ""} onChange={(e) => setForm({ ...form, filename: e.target.value })} />
            <Input placeholder="URL" value={form.url || ""} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <Input placeholder="ফাইল ধরন (যেমন: image/png)" value={form.file_type || ""} onChange={(e) => setForm({ ...form, file_type: e.target.value })} />
            <Input type="number" placeholder="ফাইল সাইজ (bytes)" value={form.file_size ?? ""} onChange={(e) => setForm({ ...form, file_size: parseInt(e.target.value) || null })} />
            <Input placeholder="Alt Text" value={form.alt_text || ""} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={() => save.mutate(form)} disabled={save.isPending}>সংরক্ষণ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
