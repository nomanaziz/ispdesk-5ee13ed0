import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePopSystemSetting } from "@/hooks/usePopSystemSetting";
import { useState, useEffect } from "react";
import { Percent, Save } from "lucide-react";

type FeeMap = Record<string, { percent: number; flat: number }>;

const GATEWAYS = ["bkash", "nagad", "rocket", "sslcommerz", "stripe", "manual"];
const DEFAULT: FeeMap = Object.fromEntries(GATEWAYS.map((k) => [k, { percent: 0, flat: 0 }]));

export default function PopProcessingFee() {
  const { value, save, isSaving } = usePopSystemSetting<FeeMap>("processing_fees", DEFAULT);
  const [form, setForm] = useState<FeeMap>(value);
  useEffect(() => setForm({ ...DEFAULT, ...value }), [value]);

  const upd = (k: string, patch: Partial<{ percent: number; flat: number }>) =>
    setForm((p) => ({ ...p, [k]: { ...p[k], ...patch } }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Percent className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">প্রসেসিং ফি</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Per-Gateway Processing Fee</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Gateway</TableHead><TableHead>Fee %</TableHead><TableHead>Flat (BDT)</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {GATEWAYS.map((k) => {
                const r = form[k] || { percent: 0, flat: 0 };
                return (
                  <TableRow key={k}>
                    <TableCell className="font-medium capitalize">{k}</TableCell>
                    <TableCell><Input type="number" step="0.01" className="w-28" value={r.percent} onChange={(e) => upd(k, { percent: +e.target.value })} /></TableCell>
                    <TableCell><Input type="number" step="0.01" className="w-28" value={r.flat} onChange={(e) => upd(k, { flat: +e.target.value })} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex justify-end mt-4">
            <Button onClick={() => save(form)} disabled={isSaving}><Save className="h-4 w-4 mr-2" />সংরক্ষণ</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
