import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { User, Wifi, WifiOff, Server } from "lucide-react";

interface ClientResult {
  id: string;
  client_id: string;
  name: string;
  contact: string | null;
  username: string | null;
  status: string;
  is_online: boolean;
  monthly_bill: number | null;
}

interface MikrotikResult {
  id: string;
  name: string;
  caller_id: string | null;
  service: string | null;
  profile: string | null;
  status: string | null;
  pop_name: string | null;
  pop_code: string | null;
  mt_name: string | null;
  pop_id: string | null;
}

interface GlobalClientSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalClientSearch({ open, onOpenChange }: GlobalClientSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientResult[]>([]);
  const [mtResults, setMtResults] = useState<MikrotikResult[]>([]);
  const [loading, setLoading] = useState(false);

  const searchAll = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setMtResults([]); return; }
    setLoading(true);
    try {
      const [clientsRes, mtRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, client_id, name, contact, username, status, is_online, monthly_bill")
          .or(`name.ilike.%${q}%,client_id.ilike.%${q}%,contact.ilike.%${q}%,username.ilike.%${q}%`)
          .limit(10),
        supabase
          .from("mikrotik_clients")
          .select("id, name, caller_id, service, profile, status, transferred_to_pop_id, transferred_pop:branch_managers!mikrotik_clients_transferred_to_pop_id_fkey(name, pop_code), transferred_mt:mikrotik_devices!mikrotik_clients_transferred_to_mikrotik_id_fkey(name)")
          .or(`name.ilike.%${q}%,caller_id.ilike.%${q}%`)
          .limit(10),
      ]);
      setResults(clientsRes.data || []);
      setMtResults(
        (mtRes.data || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          caller_id: r.caller_id,
          service: r.service,
          profile: r.profile,
          status: r.status,
          pop_id: r.transferred_to_pop_id,
          pop_name: r.transferred_pop?.name ?? null,
          pop_code: r.transferred_pop?.pop_code ?? null,
          mt_name: r.transferred_mt?.name ?? null,
        }))
      );
    } catch {
      setResults([]); setMtResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchAll(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchAll]);

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); setMtResults([]); }
  }, [open]);

  const handleClientSelect = (clientId: string) => {
    window.open(`/dashboard/billing/client/${clientId}`, "_blank");
    onOpenChange(false);
  };

  const handleMtSelect = (mt: MikrotikResult) => {
    // Navigate to mikrotik import page (transferred view)
    navigate("/dashboard/mikrotik/import");
    onOpenChange(false);
  };

  const totalCount = results.length + mtResults.length;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="ক্লায়েন্ট/PPPoE সার্চ করুন (নাম, ID, মোবাইল, ইউজারনেম, MAC)..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "খুঁজছে..." : query.length < 2 ? "কমপক্ষে ২টি অক্ষর লিখুন" : "কোনো ফলাফল পাওয়া যায়নি"}
        </CommandEmpty>

        {results.length > 0 && (
          <CommandGroup heading={`ক্লায়েন্ট (${results.length})`}>
            {results.map((c) => (
              <CommandItem
                key={`c-${c.id}`}
                value={`client-${c.name}-${c.client_id}-${c.contact}-${c.username}`}
                onSelect={() => handleClientSelect(c.id)}
                className="flex items-center gap-3 py-3 cursor-pointer"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{c.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono shrink-0">
                      {c.client_id}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {c.contact && <span>{c.contact}</span>}
                    {c.username && <span className="font-mono">{c.username}</span>}
                    {c.monthly_bill && <span>৳{Number(c.monthly_bill).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.is_online ? (
                    <Wifi className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Badge
                    variant={c.status === "active" ? "default" : c.status === "left" ? "destructive" : "secondary"}
                    className="text-[10px] capitalize"
                  >
                    {c.status}
                  </Badge>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {mtResults.length > 0 && (
          <CommandGroup heading={`MikroTik PPPoE (${mtResults.length})`}>
            {mtResults.map((m) => (
              <CommandItem
                key={`m-${m.id}`}
                value={`mt-${m.name}-${m.caller_id}`}
                onSelect={() => handleMtSelect(m)}
                className="flex items-center gap-3 py-3 cursor-pointer"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center shrink-0">
                  <Server className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate font-mono">{m.name}</span>
                    {m.service && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 uppercase">
                        {m.service}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {m.pop_name ? (
                      <span className="text-foreground">
                        POP: <span className="font-medium">{m.pop_name}</span>
                        {m.pop_code && <span className="ml-1 text-muted-foreground">({m.pop_code})</span>}
                      </span>
                    ) : (
                      <span className="text-amber-600">Pending Transfer</span>
                    )}
                    {m.mt_name && <span>· {m.mt_name}</span>}
                    {m.caller_id && <span className="font-mono">{m.caller_id}</span>}
                  </div>
                </div>
                <Badge variant={m.status === "disabled" ? "destructive" : "secondary"} className="text-[10px]">
                  {m.status || "active"}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
