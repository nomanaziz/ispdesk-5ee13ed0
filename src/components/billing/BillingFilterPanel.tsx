import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

export interface BillingFilters {
  search: string;
  server: string;
  protocolType: string;
  profile: string;
  zone: string;
  subZone: string;
  box: string;
  packageFilter: string;
  billingStatus: string;
  paymentStatus: string;
  mikrotikStatus: string;
  connectionType: string;
  clientType: string;
  fromExpireDate: string;
  toExpireDate: string;
  fromEffectiveDate: string;
  toEffectiveDate: string;
  fromNonEffectiveDate: string;
  toNonEffectiveDate: string;
  customStatus: string;
  fromDate: string;
  toDate: string;
  month: string;
}

export const defaultFilters: BillingFilters = {
  search: "",
  server: "all",
  protocolType: "all",
  profile: "all",
  zone: "all",
  subZone: "all",
  box: "all",
  packageFilter: "all",
  billingStatus: "all",
  paymentStatus: "all",
  mikrotikStatus: "all",
  connectionType: "all",
  clientType: "all",
  fromExpireDate: "",
  toExpireDate: "",
  fromEffectiveDate: "",
  toEffectiveDate: "",
  fromNonEffectiveDate: "",
  toNonEffectiveDate: "",
  customStatus: "all",
  fromDate: "",
  toDate: "",
  month: "",
};

interface Props {
  filters: BillingFilters;
  onChange: (filters: BillingFilters) => void;
  onReset: () => void;
}

export default function BillingFilterPanel({ filters, onChange, onReset }: Props) {
  const [expanded, setExpanded] = useState(true);

  const set = (key: keyof BillingFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  const { data: servers = [] } = useQuery({
    queryKey: ["filter-servers"],
    queryFn: async () => {
      const { data } = await supabase.from("mikrotik_devices").select("id, name").eq("enabled", true);
      return data || [];
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["filter-zones"],
    queryFn: async () => {
      const { data } = await supabase.from("zones").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const { data: subZones = [] } = useQuery({
    queryKey: ["filter-subzones"],
    queryFn: async () => {
      const { data } = await supabase.from("sub_zones").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const { data: boxes = [] } = useQuery({
    queryKey: ["filter-boxes"],
    queryFn: async () => {
      const { data } = await supabase.from("boxes").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["filter-packages"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const { data: billingStatuses = [] } = useQuery({
    queryKey: ["filter-billing-statuses"],
    queryFn: async () => {
      const { data } = await supabase.from("billing_statuses").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const { data: clientTypes = [] } = useQuery({
    queryKey: ["filter-client-types"],
    queryFn: async () => {
      const { data } = await supabase.from("client_types").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const { data: connectionTypes = [] } = useQuery({
    queryKey: ["filter-connection-types"],
    queryFn: async () => {
      const { data } = await supabase.from("connection_types_config").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const { data: protocolTypes = [] } = useQuery({
    queryKey: ["filter-protocol-types"],
    queryFn: async () => {
      const { data } = await supabase.from("protocol_types").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  return (
    <div className="space-y-3">
      {/* Search + Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="সার্চ (ID/নাম/মোবাইল)"
            className="pl-9"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
          />
        </div>
        <Input
          type="month"
          value={filters.month}
          onChange={(e) => set("month", e.target.value)}
          className="w-44"
        />
        <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
          {expanded ? "Hide Filters" : "Show Filters"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>

      {expanded && (
        <div className="space-y-2 p-2 border border-border rounded-lg bg-muted/30">
          {/* Row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1.5">
            <FilterSelect label="Server" value={filters.server} onChange={(v) => set("server", v)}
              options={servers.map((s: any) => ({ value: s.id, label: s.name }))} />
            <FilterSelect label="Protocol Type" value={filters.protocolType} onChange={(v) => set("protocolType", v)}
              options={protocolTypes.map((p: any) => ({ value: p.name, label: p.name }))} />
            <FilterSelect label="Profile" value={filters.profile} onChange={(v) => set("profile", v)}
              options={[]} placeholder="সকল প্রোফাইল" />
            <FilterSelect label="Zone" value={filters.zone} onChange={(v) => set("zone", v)}
              options={zones.map((z: any) => ({ value: z.name, label: z.name }))} />
            <FilterSelect label="Sub Zone" value={filters.subZone} onChange={(v) => set("subZone", v)}
              options={subZones.map((s: any) => ({ value: s.id, label: s.name }))} />
            <FilterSelect label="Box" value={filters.box} onChange={(v) => set("box", v)}
              options={boxes.map((b: any) => ({ value: b.id, label: b.name }))} />
            <FilterSelect label="Package" value={filters.packageFilter} onChange={(v) => set("packageFilter", v)}
              options={packages.map((p: any) => ({ value: p.name, label: p.name }))} />
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1.5">
            <FilterSelect label="Billing Status" value={filters.billingStatus} onChange={(v) => set("billingStatus", v)}
              options={billingStatuses.map((s: any) => ({ value: s.name, label: s.name }))} />
            <FilterSelect label="Payment Status" value={filters.paymentStatus} onChange={(v) => set("paymentStatus", v)}
              options={[
                { value: "paid", label: "Paid" },
                { value: "unpaid", label: "Unpaid" },
                { value: "partial", label: "Partial" },
                { value: "overdue", label: "Overdue" },
              ]} />
            <FilterSelect label="MikroTik Status" value={filters.mikrotikStatus} onChange={(v) => set("mikrotikStatus", v)}
              options={[
                { value: "enabled", label: "Enabled" },
                { value: "disabled", label: "Disabled" },
              ]} />
            <FilterSelect label="Connection Type" value={filters.connectionType} onChange={(v) => set("connectionType", v)}
              options={connectionTypes.map((c: any) => ({ value: c.name, label: c.name }))} />
            <FilterSelect label="Client Type" value={filters.clientType} onChange={(v) => set("clientType", v)}
              options={clientTypes.map((c: any) => ({ value: c.name, label: c.name }))} />
            <FilterSelect label="Custom Status" value={filters.customStatus} onChange={(v) => set("customStatus", v)}
              options={[
                { value: "active", label: "Active" },
                { value: "free", label: "Free" },
                { value: "personal", label: "Personal" },
                { value: "left", label: "Left" },
              ]} />
          </div>

          {/* Row 3: Date ranges */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
            <DateInput label="From Expire Date" value={filters.fromExpireDate} onChange={(v) => set("fromExpireDate", v)} />
            <DateInput label="To Expire Date" value={filters.toExpireDate} onChange={(v) => set("toExpireDate", v)} />
            <DateInput label="From Date" value={filters.fromDate} onChange={(v) => set("fromDate", v)} />
            <DateInput label="To Date" value={filters.toDate} onChange={(v) => set("toDate", v)} />
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground mb-0.5 block">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-[11px]">
          <SelectValue placeholder={placeholder || `সকল ${label}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">সকল</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DateInput({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground mb-0.5 block">{label}</label>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 text-[11px]" />
    </div>
  );
}
