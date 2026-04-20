import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Divisions from "./Divisions";
import Districts from "./Districts";
import Upazilas from "./Upazilas";
import { useSearchParams } from "react-router-dom";

export default function Locations() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "divisions";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">এলাকা ব্যবস্থাপনা</h1>
        <p className="text-sm text-muted-foreground">বিভাগ, জেলা ও উপজেলা একসাথে পরিচালনা করুন</p>
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
      >
        <TabsList>
          <TabsTrigger value="divisions">বিভাগ</TabsTrigger>
          <TabsTrigger value="districts">জেলা</TabsTrigger>
          <TabsTrigger value="upazilas">উপজেলা</TabsTrigger>
        </TabsList>
        <TabsContent value="divisions" className="mt-4"><Divisions /></TabsContent>
        <TabsContent value="districts" className="mt-4"><Districts /></TabsContent>
        <TabsContent value="upazilas" className="mt-4"><Upazilas /></TabsContent>
      </Tabs>
    </div>
  );
}
