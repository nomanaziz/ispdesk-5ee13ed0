import { ReactNode } from "react";
import { useModulePermission, PermLevel } from "@/hooks/useModulePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

interface Props {
  module: string;
  need?: Exclude<PermLevel, "none">;   // default 'read'
  fallback?: ReactNode;
  showDenied?: boolean;
  children: ReactNode;
}

/**
 * Module-level permission gate. Use on pages and action buttons.
 *
 *   <Guarded module="clients">                 …read access required (default)
 *   <Guarded module="clients" need="write">    …create/edit access required
 *   <Guarded module="clients" need="full">     …delete access required
 *
 * Super Admin always passes.
 */
export function Guarded({ module, need = "read", fallback, showDenied, children }: Props) {
  const { loading, level, canRead, canWrite, canDelete } = useModulePermission(module);
  if (loading) return null;

  const ok =
    (need === "read"  && canRead)  ||
    (need === "write" && canWrite) ||
    (need === "full"  && canDelete);

  if (ok) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  if (!showDenied) return null;

  return (
    <Card>
      <CardContent className="p-8 flex flex-col items-center text-center gap-3">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <p className="font-semibold">আপনার এই পেজ দেখার অনুমতি নেই</p>
        <p className="text-sm text-muted-foreground">
          মডিউল <code className="text-xs">{module}</code> এ <b>{need}</b> পারমিশন দরকার।
          বর্তমান লেভেল: <b>{level}</b>। অ্যাডমিনের সাথে যোগাযোগ করুন।
        </p>
      </CardContent>
    </Card>
  );
}
