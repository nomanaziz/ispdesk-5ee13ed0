import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PopForm from "@/components/branches/PopForm";
import PopAllotment from "./PopAllotment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MapPin } from "lucide-react";

export default function EditManager() {
  const { id } = useParams();

  const { data: pop, isLoading, error } = useQuery({
    queryKey: ["pop-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_managers")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (error || !pop) return <div className="p-8 text-center text-destructive">POP পাওয়া যায়নি</div>;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" /> POP Profile
          </TabsTrigger>
          <TabsTrigger value="allotment" className="gap-2">
            <MapPin className="h-4 w-4" /> District Allotment
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <PopForm mode="edit" pop={pop} />
        </TabsContent>
        <TabsContent value="allotment" className="mt-4">
          <PopAllotment popId={pop.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
