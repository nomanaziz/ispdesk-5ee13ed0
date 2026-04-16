import { useState, useEffect, useCallback } from "react";
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
import { Search, User, Wifi, WifiOff } from "lucide-react";

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

interface GlobalClientSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalClientSearch({ open, onOpenChange }: GlobalClientSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientResult[]>([]);
  const [loading, setLoading] = useState(false);

  const searchClients = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("clients")
        .select("id, client_id, name, contact, username, status, is_online, monthly_bill")
        .or(`name.ilike.%${q}%,client_id.ilike.%${q}%,contact.ilike.%${q}%,username.ilike.%${q}%`)
        .limit(15);
      setResults(data || []);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchClients(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchClients]);

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); }
  }, [open]);

  const handleSelect = (clientId: string) => {
    const url = `/dashboard/billing/client/${clientId}`;
    window.open(url, "_blank");
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="ক্লায়েন্ট সার্চ করুন (নাম, ID, মোবাইল, ইউজারনেম)..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "খুঁজছে..." : query.length < 2 ? "কমপক্ষে ২টি অক্ষর লিখুন" : "কোনো ক্লায়েন্ট পাওয়া যায়নি"}
        </CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading={`${results.length}টি ফলাফল`}>
            {results.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.name} ${c.client_id} ${c.contact} ${c.username}`}
                onSelect={() => handleSelect(c.id)}
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
      </CommandList>
    </CommandDialog>
  );
}
