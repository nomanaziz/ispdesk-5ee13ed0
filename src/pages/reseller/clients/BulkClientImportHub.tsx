import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileSpreadsheet, Server } from "lucide-react";
import PopBulkClientImport from "./PopBulkClientImport";
import ResellerMikrotikBulkCreate from "../ResellerMikrotikBulkCreate";

type TabKey = "excel" | "mikrotik";

export default function BulkClientImportHub() {
  const location = useLocation();
  const navigate = useNavigate();

  // Detect which portal we're inside so the back link & breadcrumbs go to the
  // correct Clients list.
  const inBwPanel = location.pathname.startsWith("/bw/panel/");
  const basePath = inBwPanel ? "/bw/panel" : "/pop-admin";
  const clientsPath = `${basePath}/clients`;
  const dashboardPath = inBwPanel ? "/bw/dashboard" : `${basePath}/dashboard`;
  const selfPath = inBwPanel ? `${basePath}/clients/bulk` : `${basePath}/clients/bulk-import`;

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
        { pathname: selfPath, search: params.toString() },
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="space-y-5">
      {/* Back + breadcrumb header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <nav className="text-xs text-muted-foreground flex items-center gap-1">
            <Link to={dashboardPath} className="hover:text-foreground transition-colors">Dashboard</Link>
            <span>›</span>
            <Link to={clientsPath} className="hover:text-foreground transition-colors">Clients</Link>
            <span>›</span>
            <span className="text-foreground font-medium">Bulk Import</span>
          </nav>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" /> বাল্ক ক্লায়েন্ট ইম্পোর্ট
          </h1>
          <p className="text-sm text-muted-foreground">
            Excel sheet অথবা MikroTik transferred users থেকে একসাথে multiple client তৈরি করুন।
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(clientsPath)} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </Button>
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
