import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const UserUpdateRequests = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [reviewing, setReviewing] = useState<any>(null);
  const [note, setNote] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["client-update-requests", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_update_requests")
        .select("*, clients(name, client_id, contact, email, photo_url, nid_front_url, nid_back_url, nid_number)")
        .eq("status", tab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve, request }: any) => {
      if (approve) {
        // apply changes to client row
        const { error: upErr } = await supabase
          .from("clients")
          .update(request.changes)
          .eq("id", request.client_id);
        if (upErr) throw upErr;
      }
      const { error } = await supabase
        .from("client_update_requests")
        .update({
          status: approve ? "approved" : "rejected",
          note: note || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: ["client-update-requests"] });
      setReviewing(null);
      setNote("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Client Update Requests</h1>
          <p className="text-sm text-muted-foreground">User-submitted profile and document changes</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending"><Clock className="h-3.5 w-3.5 mr-1" /> Pending</TabsTrigger>
          <TabsTrigger value="approved"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approved</TabsTrigger>
          <TabsTrigger value="rejected"><XCircle className="h-3.5 w-3.5 mr-1" /> Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : !requests || requests.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground">No {tab} requests</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {requests.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-semibold">{r.clients?.name} <span className="text-xs text-muted-foreground">#{r.clients?.client_id}</span></div>
                        <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                        <Badge className="mt-1 capitalize">{r.request_type}</Badge>
                      </div>
                      {r.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setReviewing({ ...r, action: "approve" }); setNote(""); }}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { setReviewing({ ...r, action: "reject" }); setNote(""); }}>
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid md:grid-cols-2 gap-3">
                      <div className="border rounded-lg p-3">
                        <div className="text-xs font-semibold text-muted-foreground mb-2">CURRENT</div>
                        <KV label="Name" value={r.clients?.name} />
                        <KV label="Contact" value={r.clients?.contact} />
                        <KV label="Email" value={r.clients?.email} />
                        <KV label="NID" value={r.clients?.nid_number} />
                        {r.clients?.photo_url && <Img src={r.clients.photo_url} label="Photo" />}
                        {r.clients?.nid_front_url && <Img src={r.clients.nid_front_url} label="NID Front" />}
                        {r.clients?.nid_back_url && <Img src={r.clients.nid_back_url} label="NID Back" />}
                      </div>
                      <div className="border rounded-lg p-3 bg-amber-50/40 dark:bg-amber-950/10">
                        <div className="text-xs font-semibold text-amber-700 mb-2">REQUESTED</div>
                        {Object.entries(r.changes || {}).map(([k, v]: any) =>
                          k.endsWith("_url") ? <Img key={k} src={v} label={k.replace(/_/g, " ")} /> : <KV key={k} label={k} value={String(v)} />
                        )}
                      </div>
                    </div>
                    {r.note && <div className="text-xs text-muted-foreground mt-2 italic">Note: {r.note}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewing?.action === "approve" ? "Approve" : "Reject"} request</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewing(null)}>Cancel</Button>
            <Button
              variant={reviewing?.action === "approve" ? "default" : "destructive"}
              onClick={() => decide.mutate({ id: reviewing.id, approve: reviewing.action === "approve", request: reviewing })}
              disabled={decide.isPending}
            >
              Confirm {reviewing?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const KV = ({ label, value }: { label: string; value?: any }) => (
  <div className="text-xs flex justify-between border-b border-dashed last:border-0 py-1">
    <span className="text-muted-foreground capitalize">{label.replace(/_/g, " ")}</span>
    <span className="font-medium truncate max-w-[60%]">{value || "—"}</span>
  </div>
);

const Img = ({ src, label }: { src: string; label: string }) => (
  <div className="mt-2">
    <div className="text-xs text-muted-foreground capitalize mb-1">{label}</div>
    <a href={src} target="_blank" rel="noopener noreferrer">
      <img src={src} alt={label} className="w-full h-32 object-cover rounded border hover:opacity-80" />
    </a>
  </div>
);

export default UserUpdateRequests;
