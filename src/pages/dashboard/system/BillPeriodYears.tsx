import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { useState } from "react";

type YearMap = Record<string, boolean>;

const defaults: YearMap = { "2025": false, "2026": true, "2027": false };

export default function BillPeriodYears() {
  const { value, isLoading, save, isSaving } = useSystemSetting<YearMap>("bill_period_years", defaults);
  const [newYear, setNewYear] = useState("");

  const years = Object.keys(value).sort();

  const toggle = (y: string, v: boolean) => save({ ...value, [y]: v });
  const remove = (y: string) => {
    const next = { ...value };
    delete next[y];
    save(next);
  };
  const add = () => {
    const y = newYear.trim();
    if (!/^\d{4}$/.test(y)) return;
    save({ ...value, [y]: true });
    setNewYear("");
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <CalendarDays className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">বিল পিরিয়ড</h1>
          <p className="text-xs text-muted-foreground">সিস্টেম &gt; বিল পিরিয়ড (Year Visibility)</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> Bill Period List
        </div>

        <div className="p-4 flex items-end gap-2 border-b">
          <div className="flex-1 max-w-xs">
            <label className="text-xs mb-1 block text-muted-foreground">নতুন বছর যোগ করুন</label>
            <Input
              type="number"
              placeholder="2028"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
            />
          </div>
          <Button onClick={add} disabled={isSaving || !/^\d{4}$/.test(newYear.trim())} className="gap-2 bg-[#2c5f6e] hover:bg-[#245069]">
            <Plus className="h-4 w-4" /> যোগ
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="text-left px-4 py-2.5 w-16">SL</th>
                <th className="text-left px-4 py-2.5">Year</th>
                <th className="text-left px-4 py-2.5">Show On List</th>
                <th className="text-right px-4 py-2.5 w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {years.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">কোনো বছর নেই</td></tr>
              )}
              {years.map((y, i) => (
                <tr key={y} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium">{y}</td>
                  <td className="px-4 py-2.5">
                    <Switch checked={!!value[y]} onCheckedChange={(v) => toggle(y, v)} disabled={isSaving} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(y)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
