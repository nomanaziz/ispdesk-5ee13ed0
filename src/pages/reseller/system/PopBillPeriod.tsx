import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePopSystemSetting } from "@/hooks/usePopSystemSetting";
import { useState, useEffect } from "react";
import { Calendar, Plus, Save } from "lucide-react";

type YearsMap = Record<string, boolean>;
const currentYear = new Date().getFullYear();
const DEFAULT: YearsMap = { [currentYear]: true, [currentYear + 1]: true, [currentYear + 2]: false };

export default function PopBillPeriod() {
  const { value, save, isSaving } = usePopSystemSetting<YearsMap>("bill_period_years", DEFAULT);
  const [years, setYears] = useState<YearsMap>(value);
  const [newYear, setNewYear] = useState("");
  useEffect(() => setYears(value), [value]);

  const toggle = (y: string) => setYears((p) => ({ ...p, [y]: !p[y] }));
  const addYear = () => {
    const y = newYear.trim();
    if (!y || !/^\d{4}$/.test(y)) return;
    setYears((p) => ({ ...p, [y]: true }));
    setNewYear("");
  };

  const sortedYears = Object.keys(years).sort();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">বিল পিরিয়ড</h1>
          <p className="text-sm text-muted-foreground">List view-তে কোন বছরগুলো দেখাবে</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Year Visibility</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="YYYY" value={newYear} onChange={(e) => setNewYear(e.target.value)} className="w-32" />
            <Button variant="outline" onClick={addYear}><Plus className="h-4 w-4 mr-1" />যোগ</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Year</TableHead><TableHead>Show On List</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {sortedYears.map((y) => (
                <TableRow key={y}>
                  <TableCell className="font-medium">{y}</TableCell>
                  <TableCell><Switch checked={!!years[y]} onCheckedChange={() => toggle(y)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end">
            <Button onClick={() => save(years)} disabled={isSaving}><Save className="h-4 w-4 mr-2" />সংরক্ষণ</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
