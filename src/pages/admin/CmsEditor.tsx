import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PenTool, Save } from "lucide-react";
import { useState, useEffect } from "react";

const CmsEditor = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: content = [] } = useQuery({
    queryKey: ["admin-cms"],
    queryFn: async () => {
      const { data } = await supabase.from("landing_content").select("*").order("section").order("sort_order");
      return data || [];
    },
  });

  const updateContent = useMutation({
    mutationFn: async ({ id, content_value }: { id: string; content_value: any }) => {
      const { error } = await supabase.from("landing_content").update({ content_value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms"] });
      toast({ title: "Content updated" });
    },
  });

  const grouped = content.reduce((acc: any, item: any) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center">
          <PenTool className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">CMS Editor</h1>
          <p className="text-sm text-muted-foreground">Edit landing page content</p>
        </div>
      </div>

      {Object.entries(grouped).map(([section, items]: [string, any]) => (
        <Card key={section}>
          <CardHeader>
            <CardTitle className="text-lg capitalize">{section.replace("_", " ")} Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item: any) => (
              <CmsField key={item.id} item={item} onSave={(val: any) => updateContent.mutate({ id: item.id, content_value: val })} />
            ))}
          </CardContent>
        </Card>
      ))}

      {content.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No CMS content yet. Content will appear here once landing page sections are configured in the database.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

function CmsField({ item, onSave }: { item: any; onSave: (val: any) => void }) {
  const [value, setValue] = useState(JSON.stringify(item.content_value, null, 2));

  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{item.content_key}</Label>
        <Button size="sm" variant="outline" onClick={() => {
          try { onSave(JSON.parse(value)); } catch { onSave(value); }
        }}>
          <Save className="h-3 w-3 mr-1" />Save
        </Button>
      </div>
      <textarea className="w-full min-h-[60px] border rounded-md p-2 text-sm font-mono bg-background" value={value} onChange={e => setValue(e.target.value)} />
    </div>
  );
}

export default CmsEditor;
