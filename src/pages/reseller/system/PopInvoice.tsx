import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { usePopSystemSetting } from "@/hooks/usePopSystemSetting";
import { useState, useEffect } from "react";
import { FileText, Save, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InvoiceCfg {
  invoiceTitle: string;
  showInvoiceTitle: boolean;
  titlePosition: "left" | "right" | "center";
  logoUrl: string;
  footerNote: string;
  showVat: boolean;
}
const DEFAULT: InvoiceCfg = {
  invoiceTitle: "Invoice",
  showInvoiceTitle: true,
  titlePosition: "left",
  logoUrl: "",
  footerNote: "Thank you for your business.",
  showVat: true,
};

export default function PopInvoice() {
  const { value, save, isSaving, branchId } = usePopSystemSetting<InvoiceCfg>("invoice_setup", DEFAULT);
  const [form, setForm] = useState<InvoiceCfg>(value);
  const [uploading, setUploading] = useState(false);
  useEffect(() => setForm({ ...DEFAULT, ...value }), [value]);

  const onUpload = async (file: File) => {
    if (!branchId) return toast.error("Branch missing");
    setUploading(true);
    try {
      const path = `${branchId}/invoice-logo-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("pop-logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("pop-logos").getPublicUrl(path);
      setForm((p) => ({ ...p, logoUrl: data.publicUrl }));
      toast.success("লোগো আপলোড হয়েছে");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">ইনভয়েস সেটআপ</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Invoice Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Invoice Title</Label>
              <Input value={form.invoiceTitle} onChange={(e) => setForm({ ...form, invoiceTitle: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Show Invoice Title</Label>
              <div><Switch checked={form.showInvoiceTitle} onCheckedChange={(v) => setForm({ ...form, showInvoiceTitle: v })} /></div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>"Invoice" word position</Label>
            <RadioGroup value={form.titlePosition} onValueChange={(v: any) => setForm({ ...form, titlePosition: v })} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="left" id="pl" /><Label htmlFor="pl">Left</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="center" id="pc" /><Label htmlFor="pc">Center</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="right" id="pr" /><Label htmlFor="pr">Right</Label></div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Invoice Logo</Label>
            <div className="flex items-center gap-3">
              {form.logoUrl && <img src={form.logoUrl} alt="logo" className="h-16 w-16 object-contain border rounded" />}
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
              {uploading && <span className="text-sm text-muted-foreground"><Upload className="h-3 w-3 inline mr-1" />uploading...</span>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Footer Note</Label>
            <Textarea value={form.footerNote} onChange={(e) => setForm({ ...form, footerNote: e.target.value })} />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.showVat} onCheckedChange={(v) => setForm({ ...form, showVat: v })} />
            <Label>Show VAT line on invoice</Label>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => save(form)} disabled={isSaving}><Save className="h-4 w-4 mr-2" />সংরক্ষণ</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
