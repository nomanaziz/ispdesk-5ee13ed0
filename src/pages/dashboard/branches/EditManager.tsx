import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PopForm from "@/components/branches/PopForm";

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

  return <PopForm mode="edit" pop={pop} />;
}
