import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import PermissionTreeSelector from "@/components/branches/PermissionTreeSelector";
import { buildDefaultPermissions } from "@/lib/popPermissions";
import { ShieldCheck } from "lucide-react";

interface Props {
  hasAccess: boolean;
  onHasAccessChange: (v: boolean) => void;
  username: string;
  onUsernameChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  confirm: string;
  onConfirmChange: (v: string) => void;
  permissions: Record<string, boolean>;
  onPermissionsChange: (next: Record<string, boolean>) => void;
  isEditing?: boolean;
}

export default function EmployeeUserAccessSection({
  hasAccess, onHasAccessChange,
  username, onUsernameChange,
  password, onPasswordChange,
  confirm, onConfirmChange,
  permissions, onPermissionsChange,
  isEditing = false,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" /> User Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 cursor-pointer p-3 rounded-md border bg-muted/30 hover:bg-muted/50">
          <Checkbox
            checked={hasAccess}
            onCheckedChange={(v) => {
              const next = !!v;
              onHasAccessChange(next);
              if (next && Object.keys(permissions).length === 0) {
                onPermissionsChange(buildDefaultPermissions());
              }
            }}
          />
          <span className="font-medium">HAS USER ACCESS?</span>
          <span className="text-xs text-muted-foreground ml-2">Tick করলে এই কর্মচারী portal-এ login করতে পারবে</span>
        </label>

        {hasAccess && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Username *</Label>
                <Input value={username} onChange={(e) => onUsernameChange(e.target.value)} placeholder="e.g. nahid_emp" />
              </div>
              <div className="space-y-1.5">
                <Label>Password {isEditing && <span className="text-xs text-muted-foreground">(blank = unchanged)</span>}</Label>
                <Input type="password" value={password} onChange={(e) => onPasswordChange(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm Password</Label>
                <Input type="password" value={confirm} onChange={(e) => onConfirmChange(e.target.value)} />
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">POP Menus — কোন menu গুলো access থাকবে</h3>
              <PermissionTreeSelector value={permissions} onChange={onPermissionsChange} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
