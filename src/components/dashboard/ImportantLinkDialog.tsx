import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

export interface LinkRow {
  id?: string;
  category_id: string;
  title: string;
  url: string;
  icon_url?: string | null;
  description?: string | null;
  sort_order?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: { id: string; name: string }[];
  initial?: LinkRow | null;
  defaultCategoryId?: string;
  onSaved: () => void;
}

export function ImportantLinkDialog({ open, onOpenChange, categories, initial, defaultCategoryId, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title || "");
      setUrl(initial?.url || "");
      setCategoryId(initial?.category_id || defaultCategoryId || categories[0]?.id || "");
      setDescription(initial?.description || "");
      setIconUrl(initial?.icon_url || null);
    }
  }, [open, initial, defaultCategoryId, categories]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("important-link-icons").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("important-link-icons").getPublicUrl(path);
      setIconUrl(data.publicUrl);
      toast.success("আইকন আপলোড হয়েছে");
    } catch (e: any) {
      toast.error(e.message || "আপলোড ব্যর্থ");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !url.trim() || !categoryId) {
      toast.error("শিরোনাম, URL ও ক্যাটাগরি দিন");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        url: url.trim(),
        category_id: categoryId,
        description: description.trim() || null,
        icon_url: iconUrl,
      };
      if (initial?.id) {
        const { error } = await supabase.from("important_links").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("important_links").insert({ ...payload, created_by: user?.id });
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
          <DialogTitle>{initial?.id ? "লিংক সম্পাদনা" : "নতুন লিংক"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>শিরোনাম *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="যেমন: Billing Software" />
          </div>
          <div>
            <Label>URL *</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>ক্যাটাগরি *</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>আইকন/লোগো</Label>
            <div className="flex items-center gap-3 mt-1">
              <div className="h-14 w-14 shrink-0 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                {iconUrl ? <img src={iconUrl} alt="" className="h-full w-full object-contain" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "আপলোড"}
              </Button>
              {iconUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setIconUrl(null)}>সরান</Button>
              )}
            </div>
            <Input
              className="mt-2"
              placeholder="অথবা ইমেজ লিংক পেস্ট করুন (https://...)"
              value={iconUrl || ""}
              onChange={(e) => setIconUrl(e.target.value || null)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">আপলোড করতে পারেন অথবা সরাসরি ইমেজ URL দিতে পারেন</p>
          </div>
          <div>
            <Label>বিবরণ (ঐচ্ছিক)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}সংরক্ষণ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
