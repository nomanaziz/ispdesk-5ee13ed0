import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { FileText, Save, Plus, Trash2, Receipt, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InvoiceConfig {
  show_company_name: boolean;
  show_company_email: boolean;
  show_company_mobile: boolean;
  show_company_website: boolean;
  show_company_logo: boolean;
  show_company_address: boolean;
  invoice_title: string;
  invoice_title_visible: boolean;
  invoice_position: string;
  invoice_logo_url: string;
  per_page: string;
  margin_top: number;
  margin_bottom: number;
  notes: string[];
  // Money Receipt
  receipt_title: string;
  receipt_format: string;
  receipt_position: string;
  receipt_margin_top: number;
  receipt_margin_bottom: number;
  receipt_notes: string[];
  receipt_show_company: boolean;
}

const defaults: InvoiceConfig = {
  show_company_name: true, show_company_email: true, show_company_mobile: true,
  show_company_website: false, show_company_logo: true, show_company_address: true,
  invoice_title: "INVOICE", invoice_title_visible: true, invoice_position: "left", invoice_logo_url: "",
  per_page: "1", margin_top: 0, margin_bottom: 0,
  notes: [""],
  receipt_title: "MONEY RECEIPT", receipt_format: "a4", receipt_position: "left",
  receipt_margin_top: 0, receipt_margin_bottom: 0, receipt_notes: [""], receipt_show_company: true,
};

export default function Invoice() {
  const { value, isLoading, save, isSaving } = useSystemSetting<InvoiceConfig>("invoice_config", defaults);
  const [form, setForm] = useState<InvoiceConfig>(defaults);

  useEffect(() => { setForm(value); }, [value]);

  const set = (k: keyof InvoiceConfig, v: any) => setForm(p => ({ ...p, [k]: v }));

  const updateNote = (idx: number, val: string, field: "notes" | "receipt_notes") => {
    setForm(p => ({ ...p, [field]: p[field].map((n, i) => i === idx ? val : n) }));
  };
  const addNote = (field: "notes" | "receipt_notes") => {
    setForm(p => ({ ...p, [field]: [...p[field], ""] }));
  };
  const removeNote = (idx: number, field: "notes" | "receipt_notes") => {
    setForm(p => ({ ...p, [field]: p[field].filter((_, i) => i !== idx) }));
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  const CompanyToggles = ({ prefix }: { prefix: "invoice" | "receipt" }) => {
    if (prefix === "receipt") {
      return (
        <div className="flex items-center gap-2 mb-4">
          <Switch checked={form.receipt_show_company} onCheckedChange={v => set("receipt_show_company", v)} />
          <Label className="font-normal text-sm">কোম্পানি তথ্য দেখান</Label>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {[
          { key: "show_company_name" as const, label: "কোম্পানি নাম" },
          { key: "show_company_email" as const, label: "ইমেইল" },
          { key: "show_company_mobile" as const, label: "মোবাইল" },
          { key: "show_company_website" as const, label: "ওয়েবসাইট" },
          { key: "show_company_logo" as const, label: "লোগো" },
          { key: "show_company_address" as const, label: "ঠিকানা" },
        ].map(t => (
          <div key={t.key} className="flex items-center gap-2">
            <Switch checked={form[t.key]} onCheckedChange={v => set(t.key, v)} />
            <Label className="font-normal text-xs">{t.label}</Label>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">ইনভয়েস সেটআপ</h1>
          <p className="text-xs text-muted-foreground">সিস্টেম &gt; ইনভয়েস সেটআপ</p>
        </div>
      </div>

      <Tabs defaultValue="invoice" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="invoice" className="gap-2"><FileText className="h-3.5 w-3.5" /> ইনভয়েস সেটিংস</TabsTrigger>
          <TabsTrigger value="receipt" className="gap-2"><Receipt className="h-3.5 w-3.5" /> মানি রিসিপ্ট</TabsTrigger>
        </TabsList>

        {/* Invoice Settings Tab */}
        <TabsContent value="invoice">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" /> ইনভয়েস কনফিগারেশন
            </div>
            <div className="p-5 space-y-5 bg-card">
              <CompanyToggles prefix="invoice" />

              <div className="flex flex-wrap items-end gap-4 p-3 border rounded-lg bg-muted/20">
                <div className="shrink-0">
                  <Label className="text-xs mb-1 block">ইনভয়েস লোগো</Label>
                  {form.invoice_logo_url ? (
                    <div className="relative w-28 h-20 border rounded bg-background overflow-hidden">
                      <img src={form.invoice_logo_url} alt="logo" className="w-full h-full object-contain" />
                      <button type="button" onClick={() => set("invoice_logo_url", "")}
                        className="absolute top-1 right-1 p-0.5 rounded bg-destructive text-destructive-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-28 h-20 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground text-xs">
                      No Logo
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-[180px]">
                  <input type="file" accept="image/*" id="inv-logo-upload" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const ext = file.name.split(".").pop();
                      const path = `invoice-logo/${Date.now()}.${ext}`;
                      const { error } = await supabase.storage.from("pop-logos").upload(path, file, { upsert: true });
                      if (error) { toast.error(error.message); return; }
                      const { data } = supabase.storage.from("pop-logos").getPublicUrl(path);
                      set("invoice_logo_url", data.publicUrl);
                      toast.success("লোগো আপলোড হয়েছে");
                    }} />
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <label htmlFor="inv-logo-upload" className="cursor-pointer">
                      <Upload className="h-3.5 w-3.5" /> লোগো আপলোড
                    </label>
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1">PNG/JPG, প্রস্তাবিত 300x100px</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.invoice_title_visible} onCheckedChange={(v) => set("invoice_title_visible", v)} />
                  <Label className="text-xs font-normal">"Invoice" শিরোনাম দেখান</Label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs mb-1 block">ইনভয়েস শিরোনাম</Label>
                  <Input value={form.invoice_title} onChange={e => set("invoice_title", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">পজিশন</Label>
                  <RadioGroup value={form.invoice_position} onValueChange={v => set("invoice_position", v)} className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="left" id="inv-left" /><Label htmlFor="inv-left" className="font-normal text-xs">বাম</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="right" id="inv-right" /><Label htmlFor="inv-right" className="font-normal text-xs">ডান</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="none" id="inv-none" /><Label htmlFor="inv-none" className="font-normal text-xs">কোনোটি না</Label></div>
                  </RadioGroup>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">প্রতি পৃষ্ঠায়</Label>
                  <Select value={form.per_page} onValueChange={v => set("per_page", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">১টি</SelectItem>
                      <SelectItem value="2">২টি</SelectItem>
                      <SelectItem value="3">৩টি</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">মার্জিন উপরে (mm)</Label>
                  <Input type="number" min={0} value={form.margin_top} onChange={e => set("margin_top", parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">মার্জিন নিচে (mm)</Label>
                  <Input type="number" min={0} value={form.margin_bottom} onChange={e => set("margin_bottom", parseInt(e.target.value) || 0)} />
                </div>
              </div>
              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">নোটসমূহ</Label>
                  <Button variant="outline" size="sm" onClick={() => addNote("notes")} className="gap-1 h-7 text-xs">
                    <Plus className="h-3 w-3" /> নোট যোগ করুন
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.notes.map((n, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={n} onChange={e => updateNote(i, e.target.value, "notes")} placeholder={`নোট ${i + 1}`} />
                      {form.notes.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeNote(i, "notes")} className="shrink-0 text-destructive h-9 w-9">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => save(form)} disabled={isSaving} className="gap-2 bg-[#2c5f6e] hover:bg-[#245069]">
                  <Save className="h-4 w-4" /> {isSaving ? "সংরক্ষণ হচ্ছে..." : "সাবমিট করুন"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Money Receipt Tab */}
        <TabsContent value="receipt">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4" /> মানি রিসিপ্ট কনফিগারেশন
            </div>
            <div className="p-5 space-y-5 bg-card">
              <CompanyToggles prefix="receipt" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs mb-1 block">রিসিপ্ট শিরোনাম</Label>
                  <Input value={form.receipt_title} onChange={e => set("receipt_title", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">ফরম্যাট</Label>
                  <RadioGroup value={form.receipt_format} onValueChange={v => set("receipt_format", v)} className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="a4" id="r-a4" /><Label htmlFor="r-a4" className="font-normal text-xs">A4</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="half" id="r-half" /><Label htmlFor="r-half" className="font-normal text-xs">Half</Label></div>
                  </RadioGroup>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">পজিশন</Label>
                  <RadioGroup value={form.receipt_position} onValueChange={v => set("receipt_position", v)} className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="left" id="rp-left" /><Label htmlFor="rp-left" className="font-normal text-xs">বাম</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="middle" id="rp-mid" /><Label htmlFor="rp-mid" className="font-normal text-xs">মধ্যে</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="right" id="rp-right" /><Label htmlFor="rp-right" className="font-normal text-xs">ডান</Label></div>
                  </RadioGroup>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">মার্জিন উপরে (mm)</Label>
                  <Input type="number" min={0} value={form.receipt_margin_top} onChange={e => set("receipt_margin_top", parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">মার্জিন নিচে (mm)</Label>
                  <Input type="number" min={0} value={form.receipt_margin_bottom} onChange={e => set("receipt_margin_bottom", parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">নোটসমূহ</Label>
                  <Button variant="outline" size="sm" onClick={() => addNote("receipt_notes")} className="gap-1 h-7 text-xs">
                    <Plus className="h-3 w-3" /> নোট যোগ করুন
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.receipt_notes.map((n, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={n} onChange={e => updateNote(i, e.target.value, "receipt_notes")} placeholder={`নোট ${i + 1}`} />
                      {form.receipt_notes.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeNote(i, "receipt_notes")} className="shrink-0 text-destructive h-9 w-9">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => save(form)} disabled={isSaving} className="gap-2 bg-[#2c5f6e] hover:bg-[#245069]">
                  <Save className="h-4 w-4" /> {isSaving ? "সংরক্ষণ হচ্ছে..." : "সাবমিট করুন"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
