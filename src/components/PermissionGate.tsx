import { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

interface Props {
  permission: string;
  deviceId?: string | null;
  branchId?: string | null;
  fallback?: ReactNode;
  showDenied?: boolean;
  children: ReactNode;
}

export function PermissionGate({ permission, deviceId, branchId, fallback, showDenied, children }: Props) {
  const { allowed, loading } = usePermission(permission, deviceId, branchId);
  if (loading) return null;
  if (!allowed) {
    if (fallback !== undefined) return <>{fallback}</>;
    if (showDenied) {
      return (
        <Card>
          <CardContent className="p-8 flex flex-col items-center text-center gap-3">
            <ShieldAlert className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">আপনার এই পেজ দেখার অনুমতি নেই</p>
            <p className="text-sm text-muted-foreground">
              অ্যাডমিনের সাথে যোগাযোগ করে <code className="text-xs">{permission}</code> অনুমতি চান।
            </p>
          </CardContent>
        </Card>
      );
    }
    return null;
  }
  return <>{children}</>;
}
