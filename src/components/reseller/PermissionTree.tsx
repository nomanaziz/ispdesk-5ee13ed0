import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ResellerPermissions } from "@/contexts/PortalAuthContext";

const MODULES: { key: keyof ResellerPermissions; label: string; desc: string }[] = [
  { key: "dashboard", label: "Dashboard", desc: "View dashboard summary" },
  { key: "invoices", label: "Billing Invoices", desc: "View & pay invoices" },
  { key: "purchases", label: "Purchase Orders", desc: "Create & view purchase orders" },
  { key: "tickets", label: "Support Tickets", desc: "Open & view tickets" },
  { key: "users", label: "User Management", desc: "Manage sub-users (cannot delete reseller)" },
  { key: "settings", label: "Company Settings", desc: "Edit company info" },
];

interface Props {
  value: ResellerPermissions;
  onChange: (v: ResellerPermissions) => void;
}

const PermissionTree = ({ value, onChange }: Props) => {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {MODULES.map((m) => (
        <label
          key={m.key}
          className="flex items-start gap-3 border rounded-md p-3 cursor-pointer hover:bg-muted/40"
        >
          <Checkbox
            checked={!!value[m.key]}
            onCheckedChange={(c) => onChange({ ...value, [m.key]: !!c })}
          />
          <div>
            <Label className="cursor-pointer">{m.label}</Label>
            <p className="text-xs text-muted-foreground">{m.desc}</p>
          </div>
        </label>
      ))}
    </div>
  );
};

export default PermissionTree;
