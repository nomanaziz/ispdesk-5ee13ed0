import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Save, ExternalLink } from "lucide-react";

interface BrandingRow {
  id: string;
  name: string;
  portal_slug: string | null;
  portal_logo_url: string | null;
  portal_brand_color: string | null;
  portal_title: string | null;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);

function BrandingTable({ kind }: { kind: "tenant" | "reseller" }) {
  const table = kind === "tenant" ? "bw_sale_customers" : "branch_managers";
  const nameCol = kind === "tenant" ? "customer_name" : "name";
  const [rows, setRows] = useState<BrandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, Partial<BrandingRow>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(table as any)
      .select(`id, ${nameCol}, portal_slug, portal_logo_url, portal_brand_color, portal_title`)
      .order(nameCol);
    if (error) toast.error(error.message);
    setRows(((data as any[]) || []).map((r) => ({ ...r, name: r[nameCol] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [kind]);

  const handleChange = (id: string, field: keyof BrandingRow, val: string) => {
    setEdits((e) => ({ ...e, [id]: { ...e[id], [field]: val } }));
  };

  const save = async (id: string) => {
    const patch = edits[id];
    if (!patch) return;
    setSaving(id);
    try {
      const payload: any = { ...patch };
      if (payload.portal_slug) payload.portal_slug = slugify(payload.portal_slug);
      const { error } = await supabase.from(table as any).update(payload).eq("id", id);
      if (error) throw error;
      toast.success("Branding সংরক্ষিত");
      setEdits((e) => { const n = { ...e }; delete n[id]; return n; });
      await load();
    } catch (e: any) {
      toast.error(e.message || "সংরক্ষণ ব্যর্থ");
    } finally { setSaving(null); }
  };

  const uploadLogo = async (id: string, file: File) => {
    const ext = file.name.split(".").pop() || "png";
    const path = `${kind}/${id}/logo.${ext}`;
    const { error } = await supabase.storage.from("portal-branding").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("portal-branding").getPublicUrl(path);
    handleChange(id, "portal_logo_url", data.publicUrl);
    toast.success("Logo uploaded — Save চাপুন");
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  const prefix = kind === "tenant" ? "/t/" : "/r/";

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>নাম</TableHead>
          <TableHead>Slug (URL)</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Brand Color</TableHead>
          <TableHead>Logo</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const cur = { ...r, ...edits[r.id] };
          return (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Input
                    value={cur.portal_slug ?? ""}
                    onChange={(e) => handleChange(r.id, "portal_slug", e.target.value)}
                    placeholder="my-isp"
                    className="w-32"
                  />
                  {r.portal_slug && (
                    <a href={`${prefix}${r.portal_slug}`} target="_blank" rel="noreferrer" className="text-primary">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Input
                  value={cur.portal_title ?? ""}
                  onChange={(e) => handleChange(r.id, "portal_title", e.target.value)}
                  placeholder="My ISP Portal"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={cur.portal_brand_color ?? ""}
                  onChange={(e) => handleChange(r.id, "portal_brand_color", e.target.value)}
                  placeholder="#3b82f6"
                  className="w-28"
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {cur.portal_logo_url && <img src={cur.portal_logo_url} alt="logo" className="h-8 w-8 object-contain rounded" />}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && uploadLogo(r.id, e.target.files[0])}
                    className="w-40"
                  />
                </div>
              </TableCell>
              <TableCell>
                <Button size="sm" disabled={!edits[r.id] || saving === r.id} onClick={() => save(r.id)}>
                  {saving === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function PortalBranding() {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Portal Branding</h1>
        <p className="text-muted-foreground text-sm">
          BW tenants এবং POPs দের জন্য branded portal slug, logo, color সেট করুন।
          URL: <code>/t/&lt;slug&gt;</code> (tenant) বা <code>/r/&lt;slug&gt;</code> (POP)
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Branding Configuration</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="tenant">
            <TabsList>
              <TabsTrigger value="tenant">BW Tenants</TabsTrigger>
              <TabsTrigger value="reseller">POPs / Resellers</TabsTrigger>
            </TabsList>
            <TabsContent value="tenant" className="mt-4"><BrandingTable kind="tenant" /></TabsContent>
            <TabsContent value="reseller" className="mt-4"><BrandingTable kind="reseller" /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
