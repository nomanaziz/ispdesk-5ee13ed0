import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, FolderPlus, Star, Folder, icons as LucideIcons } from "lucide-react";
import { ImportantLinkCard } from "./ImportantLinkCard";
import { ImportantLinkDialog, type LinkRow } from "./ImportantLinkDialog";
import { ImportantLinkCategoryDialog, type CategoryRow } from "./ImportantLinkCategoryDialog";
import { toast } from "sonner";

export function ImportantLinksSection() {
  const { hasRole, isAdmin } = useAuth();
  const qc = useQueryClient();
  const canSee = hasRole("super_admin") || hasRole("admin") || hasRole("operator");

  const [linkDialog, setLinkDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkRow | null>(null);
  const [defaultCat, setDefaultCat] = useState<string | undefined>();

  const [catDialog, setCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryRow | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["important-link-categories"],
    enabled: canSee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("important_link_categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: links = [] } = useQuery({
    queryKey: ["important-links"],
    enabled: canSee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("important_links")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, typeof links>();
    for (const l of links) {
      const k = l.category_id || "uncategorized";
      if (!map.has(k)) map.set(k, [] as any);
      map.get(k)!.push(l);
    }
    return map;
  }, [links]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["important-links"] });
    qc.invalidateQueries({ queryKey: ["important-link-categories"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("এই লিংকটি মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from("important_links").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("মুছে ফেলা হয়েছে"); refresh(); }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm("এই ক্যাটাগরি ও এর সকল লিংক মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from("important_link_categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("মুছে ফেলা হয়েছে"); refresh(); }
  };

  const getIcon = (name?: string | null) => {
    const Comp = (name && (LucideIcons as any)[name]) || Folder;
    return Comp;
  };

  if (!canSee) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          গুরুত্বপূর্ণ লিংক
        </CardTitle>
        {isAdmin && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setEditingCat(null); setCatDialog(true); }}>
              <FolderPlus className="h-4 w-4 mr-1" /> ক্যাটাগরি
            </Button>
            <Button size="sm" onClick={() => { setEditingLink(null); setDefaultCat(categories[0]?.id); setLinkDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> লিংক
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            কোনো ক্যাটাগরি নেই{isAdmin && " — উপরের বাটন থেকে তৈরি করুন"}
          </p>
        ) : (
          <Accordion type="multiple" defaultValue={categories.map((c) => c.id)} className="w-full">
            {categories.map((cat) => {
              const Icon = getIcon(cat.icon);
              const items = grouped.get(cat.id) || [];
              return (
                <AccordionItem key={cat.id} value={cat.id}>
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2 flex-1">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{cat.name}</span>
                      <span className="text-xs text-muted-foreground">({items.length})</span>
                      {isAdmin && (
                        <span className="ml-auto mr-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => { setEditingCat(cat); setCatDialog(true); }}
                          >
                            সম্পাদনা
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => { setEditingLink(null); setDefaultCat(cat.id); setLinkDialog(true); }}
                          >
                            + লিংক
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-destructive"
                            onClick={() => handleDeleteCat(cat.id)}
                          >
                            মুছুন
                          </Button>
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3">কোনো লিংক নেই</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2.5 pt-1">
                        {items.map((l) => (
                          <ImportantLinkCard
                            key={l.id}
                            title={l.title}
                            url={l.url}
                            iconUrl={l.icon_url}
                            canEdit={isAdmin}
                            onEdit={() => { setEditingLink(l as any); setLinkDialog(true); }}
                            onDelete={() => handleDelete(l.id)}
                          />
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>

      <ImportantLinkDialog
        open={linkDialog}
        onOpenChange={setLinkDialog}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initial={editingLink}
        defaultCategoryId={defaultCat}
        onSaved={refresh}
      />
      <ImportantLinkCategoryDialog
        open={catDialog}
        onOpenChange={setCatDialog}
        initial={editingCat}
        onSaved={refresh}
      />
    </Card>
  );
}
