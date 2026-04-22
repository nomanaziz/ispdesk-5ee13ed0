import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Star, Building2 } from "lucide-react";

export default function PopSmsGateway() {
  const { customer } = usePortalAuth();
  const popId = customer?.type === "reseller_sub"
    ? (customer as any)?.parent_reseller_id
    : (customer as any)?.sub;

  const { data: gateways = [], isLoading } = useQuery({
    queryKey: ["pop_sms_gateways"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_gateways")
        .select("id, name, sender_id, sms_type, is_default, status")
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: pop } = useQuery({
    queryKey: ["pop_company_info", popId],
    enabled: !!popId,
    queryFn: async () => {
      const { data } = await supabase
        .from("branch_managers")
        .select("name, company_name, contact, email")
        .eq("id", popId)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">এসএমএস গেটওয়ে</h1>
        <p className="text-muted-foreground">কনফিগার করা SMS গেটওয়ে তালিকা</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          গেটওয়ে কনফিগারেশন মূল অ্যাডমিন থেকে আসে — এখান থেকে এডিট করা যাবে না। এই গেটওয়েগুলো ব্যবহার করেই আপনি SMS পাঠাতে পারবেন।
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> কোম্পানি / Sender পরিচিতি
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">POP নাম</p>
              <p className="font-medium">{pop?.name || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">কোম্পানি</p>
              <p className="font-medium">{pop?.company_name || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">যোগাযোগ</p>
              <p className="font-medium">{pop?.contact || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">ইমেইল</p>
              <p className="font-medium">{pop?.email || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>উপলব্ধ গেটওয়ে</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>Sender ID</TableHead>
                  <TableHead>ধরন</TableHead>
                  <TableHead>ডিফল্ট</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : gateways.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">কোনো গেটওয়ে কনফিগার করা নেই</TableCell></TableRow>
                ) : gateways.map((g: any, i: number) => (
                  <TableRow key={g.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>{g.sender_id || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={g.sms_type === "bangla" ? "default" : "secondary"}>
                        {g.sms_type === "bangla" ? "বাংলা" : "English"}
                      </Badge>
                    </TableCell>
                    <TableCell>{g.is_default && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}</TableCell>
                    <TableCell>
                      <Badge variant={g.status === "active" ? "default" : "secondary"}>
                        {g.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
