import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Download, HardDrive } from "lucide-react";

export default function Backup() {
  const queryClient = useQueryClient();
  const [selectedServer, setSelectedServer] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: servers = [] } = useQuery({
    queryKey: ["mikrotik_devices_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mikrotik_devices").select("id, name").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ["mikrotik_backups", selectedServer],
    queryFn: async () => {
      let q = supabase.from("mikrotik_backups").select("*, mikrotik_devices(name)").order("created_at", { ascending: false });
      if (selectedServer !== "all") q = q.eq("mikrotik_id", selectedServer);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const createBackup = useMutation({
    mutationFn: async () => {
      if (selectedServer === "all") {
        toast.error("একটি সার্ভার সিলেক্ট করুন");
        return;
      }
      const server = servers.find((s) => s.id === selectedServer);
      const fileName = `backup_${server?.name || "server"}_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "_")}.backup`;
      const { error } = await supabase.from("mikrotik_backups").insert({
        mikrotik_id: selectedServer,
        file_name: fileName,
        status: "completed",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mikrotik_backups"] });
      toast.success("ব্যাকআপ তৈরি হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = backups.filter((b: any) =>
    b.file_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><HardDrive className="h-6 w-6" /> সার্ভার ব্যাকআপ</h1>
        <Button onClick={() => createBackup.mutate()} disabled={createBackup.isPending || selectedServer === "all"}>
          <Plus className="h-4 w-4 mr-1" /> ব্যাকআপ তৈরি করুন
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4 flex-wrap">
            <Select value={selectedServer} onValueChange={setSelectedServer}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="সার্ভার সিলেক্ট করুন" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল সার্ভার</SelectItem>
                {servers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="সার্চ করুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>সময়</TableHead>
                  <TableHead>সার্ভার</TableHead>
                  <TableHead>ব্যাকআপ ফাইল</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>ডাউনলোড</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">কোনো ব্যাকআপ পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((b: any, i: number) => (
                  <TableRow key={b.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{new Date(b.created_at).toLocaleString("bn-BD")}</TableCell>
                    <TableCell>{b.mikrotik_devices?.name || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{b.file_name}</TableCell>
                    <TableCell><span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">{b.status}</span></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!b.file_url}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
