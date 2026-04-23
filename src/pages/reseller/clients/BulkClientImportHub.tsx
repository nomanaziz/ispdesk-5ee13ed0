import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Server } from "lucide-react";
import PopBulkClientImport from "./PopBulkClientImport";
import ResellerMikrotikBulkCreate from "../ResellerMikrotikBulkCreate";

type TabKey = "excel" | "mikrotik";

export default function BulkClientImportHub() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialTab: TabKey =
    location.pathname.includes("/mikrotik-users/bulk-create")
      ? "mikrotik"
      : (new URLSearchParams(location.search).get("tab") as TabKey) || "excel";

  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tab") !== tab) {
      params.set("tab", tab);
      navigate(
        { pathname: "/pop-admin/clients/bulk-import", search: params.toString() },
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6" /> বাল্ক ক্লায়েন্ট ইম্পোর্ট
        </h1>
        <p className="text-sm text-muted-foreground">
          Excel sheet অথবা MikroTik transferred users থেকে একসাথে multiple client তৈরি করুন।
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="excel" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Excel / CSV
          </TabsTrigger>
          <TabsTrigger value="mikrotik" className="gap-2">
            <Server className="h-4 w-4" /> MikroTik ইউজার
          </TabsTrigger>
        </TabsList>

        <TabsContent value="excel" className="mt-4">
          <PopBulkClientImport embedded />
        </TabsContent>
        <TabsContent value="mikrotik" className="mt-4">
          <ResellerMikrotikBulkCreate embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
