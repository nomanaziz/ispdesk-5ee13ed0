import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Save, Percent, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type BorneBy = "company" | "client" | "split";
interface ResellerRow { branch_id: string; fee_pct: number; borne_by: BorneBy; split_pct: number }
interface FeeConfig {
  default: { fee_pct: number; borne_by: BorneBy; split_pct: number };
  resellers: ResellerRow[];
  portal_clients: { fee_pct: number; borne_by: BorneBy; split_pct: number };
}

const DEFAULTS: FeeConfig = {
  default: { fee_pct: 1.5, borne_by: "company", split_pct: 50 },
  resellers: [],
  portal_clients: { fee_pct: 1.5, borne_by: "company", split_pct: 50 },
};

export default function SysProcessingFee() {
  const { value, isLoading, save, isSaving } = useSystemSetting<FeeConfig>("processing_fee_config", DEFAULTS);
  const [form, setForm] = useState<FeeConfig>(DEFAULTS);

  const { data: branches } = useQuery({
    queryKey: ["branches-for-fee"],
    queryFn: async () => (await supabase.from("branches").select("id,name")).data || [],
  });

  useEffect(() => { setForm(value); }, [value]);

  const updateBlock = (key: "default" | "portal_clients", patch: Partial<FeeConfig["default"]>) =>
    setForm((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  const addReseller = () => setForm((p) => ({ ...p, resellers: [...p.resellers, { branch_id: "", fee_pct: 1.5, borne_by: "company", split_pct: 50 }] }));
  const removeReseller = (i: number) => setForm((p) => ({ ...p, resellers: p.resellers.filter((_, idx) => idx !== i) }));
  const updateReseller = (i: number, patch: Partial<ResellerRow>) =>
    setForm((p) => ({ ...p, resellers: p.resellers.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  const renderBlock = (label: string, block: FeeConfig["default"], onChange: (patch: any) => void) => (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium">{label}</div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-card">
        <div>
          <Label className="text-xs mb-1 block">Fee % (e.g. 1.5)</Label>
          <Input type="number" step="0.01" min={0} value={block.fee_pct} onChange={(e) => onChange({ fee_pct: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Borne By</Label>
          <Select value={block.borne_by} onValueChange={(v: BorneBy) => onChange({ borne_by: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="company">Company pays</SelectItem>
              <SelectItem value="client">Client pays</SelectItem>
              <SelectItem value="split">Split (Custom %)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {block.borne_by === "split" && (
          <div>
            <Label className="text-xs mb-1 block">Client Share %</Label>
            <Input type="number" min={0} max={100} value={block.split_pct} onChange={(e) => onChange({ split_pct: parseFloat(e.target.value) || 0 })} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Percent className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Payment Processing Fee</h1>
          <p className="text-xs text-muted-foreground">System &gt; Processing Fee</p>
        </div>
      </div>

      {renderBlock("Default (Admin / All Resellers fallback)", form.default, (p) => updateBlock("default", p))}
      {renderBlock("Portal Clients (Reseller's clients paying via portal)", form.portal_clients, (p) => updateBlock("portal_clients", p))}

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium flex items-center justify-between">
          <span>Per-Reseller Override</span>
          <Button size="sm" variant="secondary" onClick={addReseller} className="h-7 gap-1"><Plus className="h-3 w-3" /> Add</Button>
        </div>
        <div className="p-4 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reseller / Branch</TableHead>
                <TableHead>Fee %</TableHead>
                <TableHead>Borne By</TableHead>
                <TableHead>Client Share %</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.resellers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No reseller-specific overrides</TableCell></TableRow>
              ) : form.resellers.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Select value={r.branch_id} onValueChange={(v) => updateReseller(i, { branch_id: v })}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{(branches || []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input type="number" step="0.01" value={r.fee_pct} onChange={(e) => updateReseller(i, { fee_pct: parseFloat(e.target.value) || 0 })} className="h-8 w-20" /></TableCell>
                  <TableCell>
                    <Select value={r.borne_by} onValueChange={(v: BorneBy) => updateReseller(i, { borne_by: v })}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="split">Split</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input type="number" min={0} max={100} value={r.split_pct} disabled={r.borne_by !== "split"} onChange={(e) => updateReseller(i, { split_pct: parseFloat(e.target.value) || 0 })} className="h-8 w-20" /></TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => removeReseller(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save(form)} disabled={isSaving} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
