import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "notices", label: "Notices" },
  { key: "media_servers", label: "Media Servers" },
  { key: "news_events", label: "News & Events" },
  { key: "speed_test", label: "Speed Test Server" },
  { key: "registered_clients", label: "Registered Clients" },
];

export default function PortalManage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("media_servers");
  const [subTab, setSubTab] = useState<"categories" | "servers">("categories");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", url: "", category_id: "" });

  // Categories
  const { data: categories } = useQuery({
    queryKey: ["portal-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("portal_categories").select("*").eq("status", "active").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  // Servers
  const { data: servers } = useQuery({
    queryKey: ["portal-servers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("portal_servers").select("*, portal_categories:category_id(name)").eq("status", "active").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const upsertCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("নাম আবশ্যক");
      const payload = { name: form.name, description: form.description || null };
      if (editId) {
        const { error } = await supabase.from("portal_categories").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("portal_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-categories"] });
      toast.success("সেভ হয়েছে");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const upsertServerMutation = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("নাম আবশ্যক");
      const payload = { name: form.name, url: form.url || null, description: form.description || null, category_id: form.category_id || null };
      if (editId) {
        const { error } = await supabase.from("portal_servers").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("portal_servers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-servers"] });
      toast.success("সেভ হয়েছে");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      const { error } = await supabase.from(table as any).update({ status: "inactive" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-categories"] });
      queryClient.invalidateQueries({ queryKey: ["portal-servers"] });
      toast.success("মুছে ফেলা হয়েছে");
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm({ name: "", description: "", url: "", category_id: "" });
  };

  const openAdd = () => {
    setForm({ name: "", description: "", url: "", category_id: "" });
    setEditId(null);
    setDialogOpen(true);
  };

  const openEditCategory = (item: any) => {
    setForm({ name: item.name, description: item.description || "", url: "", category_id: "" });
    setEditId(item.id);
    setDialogOpen(true);
  };

  const openEditServer = (item: any) => {
    setForm({ name: item.name, description: item.description || "", url: item.url || "", category_id: item.category_id || "" });
    setEditId(item.id);
    setDialogOpen(true);
  };

  const isMediaTab = activeTab === "media_servers";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Client <span className="text-sm font-normal text-muted-foreground">Portal Management</span></h1>

      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-56 shrink-0 border rounded-lg p-2 space-y-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearch(""); }}
              className={cn("w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                activeTab === tab.key ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {isMediaTab && (
            <>
              <div className="border-b flex gap-0">
                <button onClick={() => setSubTab("categories")} className={cn("px-4 py-2 text-sm border-b-2 transition-colors", subTab === "categories" ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground")}>
                  Server Categories
                </button>
                <button onClick={() => setSubTab("servers")} className={cn("px-4 py-2 text-sm border-b-2 transition-colors", subTab === "servers" ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground")}>
                  Media Servers
                </button>
              </div>

              <div className="flex justify-between items-center">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add {subTab === "categories" ? "Server Category" : "Media Server"}</Button>
              </div>

              {subTab === "categories" ? (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10">
                        <TableHead className="text-xs">Sr.</TableHead>
                        <TableHead className="text-xs">Media Category</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-xs">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(categories || []).filter((c: any) => !search || c.name?.toLowerCase().includes(search.toLowerCase())).map((c: any, i: number) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs">{i + 1}</TableCell>
                          <TableCell className="text-xs font-medium">{c.name}</TableCell>
                          <TableCell className="text-xs">{c.description || "-"}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditCategory(c)}><Edit className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ table: "portal_categories", id: c.id })}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10">
                        <TableHead className="text-xs">Sr.</TableHead>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-xs">URL</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-xs">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(servers || []).filter((s: any) => !search || s.name?.toLowerCase().includes(search.toLowerCase())).map((s: any, i: number) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs">{i + 1}</TableCell>
                          <TableCell className="text-xs font-medium">{s.name}</TableCell>
                          <TableCell className="text-xs">{s.portal_categories?.name || "-"}</TableCell>
                          <TableCell className="text-xs">{s.url || "-"}</TableCell>
                          <TableCell className="text-xs">{s.description || "-"}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditServer(s)}><Edit className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ table: "portal_servers", id: s.id })}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}

          {!isMediaTab && (
            <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/30">
              <p className="text-muted-foreground">{TABS.find(t => t.key === activeTab)?.label} — Coming Soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "সম্পাদনা" : "নতুন যোগ করুন"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>নাম *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            {isMediaTab && subTab === "servers" && (
              <>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={v => setForm(p => ({ ...p, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>URL</Label>
                  <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} />
                </div>
              </>
            )}
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={() => {
              if (isMediaTab && subTab === "servers") upsertServerMutation.mutate();
              else upsertCategoryMutation.mutate();
            }}>
              {editId ? "আপডেট" : "সেভ করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
