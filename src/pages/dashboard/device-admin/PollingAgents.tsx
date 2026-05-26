import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Copy, RefreshCw, Server, CheckCircle2, XCircle, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Agent = {
  id: string;
  name: string;
  api_key: string;
  status: string;
  last_heartbeat: string | null;
  version: string | null;
  notes: string | null;
  poll_interval_seconds: number;
  branch_id: string | null;
};

function generateApiKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "agt_" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function PollingAgents() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState<Agent | null>(null);
  const [form, setForm] = useState({ name: "", notes: "", poll_interval_seconds: 30 });

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["polling_agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("polling_agents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Agent[];
    },
    refetchInterval: 10000,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("polling_agents").insert({
        name: form.name,
        api_key: generateApiKey(),
        notes: form.notes || null,
        poll_interval_seconds: form.poll_interval_seconds,
      }).select().single();
      if (error) throw error;
      return data as Agent;
    },
    onSuccess: (agent) => {
      toast.success("Agent তৈরি হয়েছে");
      setAddOpen(false);
      setForm({ name: "", notes: "", poll_interval_seconds: 30 });
      setSetupOpen(agent);
      qc.invalidateQueries({ queryKey: ["polling_agents"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("polling_agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agent মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["polling_agents"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rotateMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("polling_agents").update({ api_key: generateApiKey() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("API key পরিবর্তন হয়েছে — agent-এর config.json update করুন");
      qc.invalidateQueries({ queryKey: ["polling_agents"] });
    },
  });

  const isOnline = (a: Agent) => {
    if (!a.last_heartbeat) return false;
    return Date.now() - new Date(a.last_heartbeat).getTime() < (a.poll_interval_seconds + 30) * 1000;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Server className="h-6 w-6" /> Polling Agents</h1>
          <p className="text-sm text-muted-foreground">SNMP দিয়ে OLT poll করার জন্য on-premise agent manage করুন</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> নতুন Agent</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>কেন Polling Agent লাগে?</CardTitle>
          <CardDescription>
            Supabase cloud থেকে সরাসরি SNMP (UDP 161) call সম্ভব না। তাই আপনার অফিসের একটা PC-তে এই agent চালান —
            এটা LAN থেকে OLT poll করে data Supabase-এ পাঠাবে। OLT internet-এ expose করতে হবে না।
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader><CardTitle>Agents</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p>Loading...</p> : agents.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">কোনো agent নেই। উপরে "নতুন Agent" দিয়ে শুরু করুন।</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Heartbeat</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((a) => {
                  const online = isOnline(a);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>
                        {online ? (
                          <Badge className="bg-green-500/15 text-green-700 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Online</Badge>
                        ) : (
                          <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Offline</Badge>
                        )}
                      </TableCell>
                      <TableCell>{a.last_heartbeat ? formatDistanceToNow(new Date(a.last_heartbeat), { addSuffix: true }) : "—"}</TableCell>
                      <TableCell>{a.version ?? "—"}</TableCell>
                      <TableCell>{a.poll_interval_seconds}s</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => setSetupOpen(a)}>Setup</Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          if (confirm("নতুন API key generate করবেন? পুরাতন key invalid হয়ে যাবে।")) rotateMut.mutate(a.id);
                        }}><RefreshCw className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          if (confirm(`"${a.name}" delete করবেন?`)) deleteMut.mutate(a.id);
                        }}><Trash2 className="h-3 w-3" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>নতুন Polling Agent</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Office PC Agent" />
            </div>
            <div>
              <Label>Poll Interval (seconds)</Label>
              <Input type="number" min={10} max={3600} value={form.poll_interval_seconds}
                onChange={(e) => setForm({ ...form, poll_interval_seconds: parseInt(e.target.value) || 30 })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="কোন PC-তে install হবে?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!form.name || createMut.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Setup dialog */}
      <Dialog open={!!setupOpen} onOpenChange={(o) => !o && setSetupOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Setup: {setupOpen?.name}</DialogTitle>
            <DialogDescription>আপনার office PC-তে এই step-গুলো follow করুন</DialogDescription>
          </DialogHeader>
          {setupOpen && (
            <div className="space-y-4 text-sm">
              <div>
                <Label className="text-base">1. API Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input readOnly value={setupOpen.api_key} className="font-mono text-xs" />
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(setupOpen.api_key);
                    toast.success("Copied");
                  }}><Copy className="h-3 w-3" /></Button>
                </div>
              </div>
              <div>
                <Label className="text-base">2. Node.js install করুন</Label>
                <p className="text-muted-foreground">https://nodejs.org থেকে LTS (18+) download করুন।</p>
              </div>
              <div>
                <Label className="text-base">3. Agent files ডাউনলোড করুন</Label>
                <p className="text-muted-foreground mt-1">
                  নিচের ৪টা file আপনার PC-তে একটা নতুন folder-এ (যেমন <code>C:\ispdesk-agent\</code>) save করুন:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { f: "polling-agent.js", label: "polling-agent.js" },
                    { f: "package.json", label: "package.json" },
                    { f: "config.example.json", label: "config.example.json" },
                    { f: "README.md", label: "README.md" },
                  ].map((x) => (
                    <Button key={x.f} size="sm" variant="outline" asChild>
                      <a href={`/agent/${x.f}`} download={x.f}>
                        <Download className="h-3 w-3 mr-2" /> {x.label}
                      </a>
                    </Button>
                  ))}
                </div>
                <p className="text-muted-foreground mt-2">তারপর সেই folder-এ terminal/CMD খুলে:</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto mt-1">
{`npm install`}
                </pre>
              </div>

              <div>
                <Label className="text-base">4. config.json ডাউনলোড করুন</Label>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto mt-1">
{JSON.stringify({
  supabase_url: import.meta.env.VITE_SUPABASE_URL,
  api_key: setupOpen.api_key,
  poll_interval_seconds: setupOpen.poll_interval_seconds,
}, null, 2)}
                </pre>
                <Button size="sm" className="mt-2" onClick={() => {
                  const cfg = {
                    supabase_url: import.meta.env.VITE_SUPABASE_URL,
                    api_key: setupOpen.api_key,
                    poll_interval_seconds: setupOpen.poll_interval_seconds,
                  };
                  const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "config.json";
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("config.json ডাউনলোড হয়েছে");
                }}>
                  <Download className="h-3 w-3 mr-2" /> Download config.json
                </Button>
              </div>
              <div>
                <Label className="text-base">5. Windows .exe বানান (অথবা ডাউনলোড করুন)</Label>
                <p className="text-muted-foreground mt-1">আপনার dev PC-তে একবার build করুন — target PC-তে Node.js লাগবে না:</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto mt-1">
{`cd agent
npm install
npm run build:win
# তৈরি হবে: agent/dist/ispdesk-agent.exe`}
                </pre>
                <p className="text-muted-foreground mt-2">তারপর target PC-তে একটা folder বানিয়ে রাখুন:</p>
                <pre className="bg-muted p-3 rounded text-xs mt-1">
{`C:\\ispdesk-agent\\
  ├─ ispdesk-agent.exe
  └─ config.json  (উপরের button দিয়ে download)`}
                </pre>
              </div>
              <div>
                <Label className="text-base">6. চালু করুন</Label>
                <p className="text-muted-foreground">Double-click <code>ispdesk-agent.exe</code> — অথবা Node দিয়ে: <code>npm start</code></p>
                <p className="text-muted-foreground mt-1">Auto-start চাইলে NSSM দিয়ে Windows Service বানান (BUILD_EXE.md দেখুন)।</p>
              </div>
              <div>
                <Label className="text-base">7. OLT assign করুন</Label>
                <p className="text-muted-foreground">Dashboard → OLT Devices → প্রতিটা OLT edit করে "Assigned Agent" এ এই agent select করুন।</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSetupOpen(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
