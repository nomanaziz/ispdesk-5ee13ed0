import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
}

export default function LoginHistoryDialog({ open, onClose, clientId, clientName }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["portal-login-log", clientId],
    enabled: !!clientId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("portal_login_log")
        .select("*")
        .eq("client_id", clientId!)
        .order("login_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Login History — {clientName}
          </DialogTitle>
        </DialogHeader>
        <div className="border rounded-md overflow-hidden max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead className="text-xs">#</TableHead>
                <TableHead className="text-xs">Login</TableHead>
                <TableHead className="text-xs">Logout</TableHead>
                <TableHead className="text-xs">IP Address</TableHead>
                <TableHead className="text-xs">Device / Browser</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">Loading…</TableCell></TableRow>
              )}
              {!isLoading && data?.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">No login records yet</TableCell></TableRow>
              )}
              {data?.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{i + 1}</TableCell>
                  <TableCell className="text-xs">{new Date(r.login_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{r.logout_at ? new Date(r.logout_at).toLocaleString() : "-"}</TableCell>
                  <TableCell className="text-xs font-mono">{r.ip_address || "-"}</TableCell>
                  <TableCell className="text-xs max-w-[280px] truncate" title={r.user_agent || ""}>{r.user_agent || "-"}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={r.status === "active" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
