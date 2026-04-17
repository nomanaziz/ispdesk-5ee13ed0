import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function ShopShippingZones() {
  const [list, setList] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("shop_shipping_zones").select("*").order("name");
    setList((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, charge: number) => {
    const { error } = await supabase.from("shop_shipping_zones").update({ charge }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("আপডেট হয়েছে");
  };

  return (
    <Card>
      <CardHeader><CardTitle>শিপিং চার্জ</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>জোন</TableHead><TableHead>চার্জ (BDT)</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map((z) => (
              <TableRow key={z.id}>
                <TableCell className="font-medium">{z.name}</TableCell>
                <TableCell>
                  <Input type="number" defaultValue={z.charge} onBlur={(e) => update(z.id, +e.target.value)} className="w-32" />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">ফোকাস হারানোর সময় সংরক্ষণ হবে</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
