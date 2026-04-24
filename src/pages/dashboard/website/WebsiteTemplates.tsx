import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Check, ExternalLink, Palette } from "lucide-react";
import { HOME_TEMPLATES, PACKAGE_TEMPLATES } from "@/pages/public/templates/registry";
import { cn } from "@/lib/utils";

function TemplateGrid({ pageKey, registry }: { pageKey: "home" | "packages"; registry: typeof HOME_TEMPLATES }) {
  const qc = useQueryClient();
  const { data: rows } = useQuery({
    queryKey: ["website_templates", pageKey],
    queryFn: async () => {
      const { data } = await (supabase as any).from("website_templates").select("*").eq("page_key", pageKey).order("name");
      return data || [];
    },
  });

  const activate = useMutation({
    mutationFn: async (templateKey: string) => {
      // deactivate others first to satisfy partial-unique index
      await (supabase as any).from("website_templates").update({ is_active: false }).eq("page_key", pageKey);
      const { error } = await (supabase as any).from("website_templates").update({ is_active: true }).eq("page_key", pageKey).eq("template_key", templateKey);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["website_templates", pageKey] });
      qc.invalidateQueries({ queryKey: ["active-template", pageKey] });
      toast({ title: "টেমপ্লেট সক্রিয় হয়েছে" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const previewUrl = pageKey === "home" ? "/" : "/packages";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Object.values(registry).map((tmpl) => {
        const row = rows?.find((r: any) => r.template_key === tmpl.key);
        const isActive = !!row?.is_active;
        return (
          <Card key={tmpl.key} className={cn("transition-all", isActive ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md")}>
            <CardContent className="p-5">
              <div className="aspect-[16/10] rounded-md bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4 relative overflow-hidden">
                <Palette className="h-10 w-10 text-slate-400" />
                <div className="absolute bottom-2 right-2 text-[10px] text-slate-500 font-mono">{tmpl.key}</div>
              </div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-base">{tmpl.name}</h3>
                {isActive && <Badge className="shrink-0"><Check className="h-3 w-3 mr-1" /> সক্রিয়</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mb-4 min-h-[32px]">{tmpl.description}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  variant={isActive ? "secondary" : "default"}
                  disabled={isActive || activate.isPending}
                  onClick={() => activate.mutate(tmpl.key)}
                >
                  {isActive ? "বর্তমান" : "সক্রিয় করুন"}
                </Button>
                <a href={previewUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5" /></Button>
                </a>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function WebsiteTemplates() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">থিম / টেমপ্লেট</h1>
        <p className="text-muted-foreground">পাবলিক ওয়েবসাইটের জন্য Home ও Packages পেজের ডিজাইন বেছে নিন।</p>
      </div>
      <Tabs defaultValue="home">
        <TabsList>
          <TabsTrigger value="home">হোম পেজ</TabsTrigger>
          <TabsTrigger value="packages">প্যাকেজ পেজ</TabsTrigger>
        </TabsList>
        <TabsContent value="home" className="mt-6">
          <TemplateGrid pageKey="home" registry={HOME_TEMPLATES} />
        </TabsContent>
        <TabsContent value="packages" className="mt-6">
          <TemplateGrid pageKey="packages" registry={PACKAGE_TEMPLATES} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
