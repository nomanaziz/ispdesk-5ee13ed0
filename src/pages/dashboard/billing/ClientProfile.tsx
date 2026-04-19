import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, Edit, Calendar, Mail, Package, Download,
  User, Globe, Wifi, HardDrive, Search, WifiOff,
  Power, PowerOff, MessageSquare, RefreshCw, History,
  CreditCard, FileText, Activity, Shield, ChevronDown, ChevronRight
} from "lucide-react";
import BillEditDialog from "@/components/billing/BillEditDialog";

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pppSnapshot, setPppSnapshot] = useState<any>(null);
  const [inlineSearch, setInlineSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          zone:zones(name),
          sub_zone:sub_zones(name),
          package:isp_packages(name),
          box:boxes(name),
          billing!billing_client_id_fkey(id, bill_id, month, amount, paid, due, discount, advance, vat, status, pay_date, created_at),
          bill_collections!bill_collections_client_id_fkey(id, amount, discount, vat, payment_method, note, status, created_at, transaction_id, received_by)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: trafficData } = useQuery({
    queryKey: ["client-traffic", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_traffic_monthly")
        .select("*")
        .eq("client_id", id!)
        .order("month", { ascending: false })
        .limit(12);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: changeRequests = [] } = useQuery({
    queryKey: ["client-changes", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("change_requests")
        .select("*")
        .eq("client_id", id!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: supportTickets = [] } = useQuery({
    queryKey: ["client-tickets", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_tickets" as any)
        .select("*")
        .eq("client_id", id!)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data as any[]) || [];
    },
    enabled: !!id,
  });

  const { data: billHistory = [] } = useQuery({
    queryKey: ["bill-history", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("billing_history" as any)
        .select("*")
        .eq("client_id", id!)
        .order("changed_at", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!id,
  });

  const handleInlineSearch = useCallback(async (q: string) => {
    setInlineSearch(q);
    if (q.length < 2) { setSearchResults([]); setShowSearchResults(false); return; }
    setShowSearchResults(true);
    const { data } = await supabase
      .from("clients")
      .select("id, client_id, name, contact, status")
      .or(`name.ilike.%${q}%,client_id.ilike.%${q}%,contact.ilike.%${q}%,username.ilike.%${q}%`)
      .limit(8);
    setSearchResults(data || []);
  }, []);

  const selectSearchResult = (clientId: string) => {
    setInlineSearch("");
    setSearchResults([]);
    setShowSearchResults(false);
    navigate(`/dashboard/billing/client/${clientId}`);
  };

  const pppActionMutation = useMutation({
    mutationFn: async (action: "status" | "enable" | "disable" | "disconnect") => {
      if (!c.mikrotik_id || !c.username) throw new Error("MikroTik তথ্য পাওয়া যায়নি");
      const { data, error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
        body: { client_id: c.id, mikrotik_id: c.mikrotik_id, username: c.username, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { action, data };
    },
    onSuccess: async ({ action, data }) => {
      if (data?.mikrotik_status) {
        await supabase.from("clients").update({ mikrotik_status: data.mikrotik_status }).eq("id", c.id);
      }
      setPppSnapshot(data);
      queryClient.invalidateQueries({ queryKey: ["client-profile", id] });
      toast.success(action === "status" ? "PPP তথ্য রিফ্রেশ হয়েছে" : data?.message || "সফল");
    },
    onError: (e: any) => toast.error(e.message || "PPP action ব্যর্থ"),
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!client) return <div className="p-8 text-center text-muted-foreground">ক্লায়েন্ট পাওয়া যায়নি</div>;

  const c: any = client;
  const billings = (c.billing || []).sort((a: any, b: any) => b.month?.localeCompare(a.month));
  const collections = (c.bill_collections || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const pppData = pppSnapshot || {};
  const totalDue = billings.reduce((s: number, b: any) => s + Number(b.due || 0), 0);
  const totalPaid = billings.reduce((s: number, b: any) => s + Number(b.paid || 0), 0);
  const bs = billings[0]?.status || "unpaid";

  return (
    <div className="p-4 space-y-4">
      {/* Top Bar with Back + Search */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/billing")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> ফিরুন
        </Button>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ক্লায়েন্ট সার্চ (নাম, ID, মোবাইল)..."
            value={inlineSearch}
            onChange={(e) => handleInlineSearch(e.target.value)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            onFocus={() => { if (searchResults.length > 0) setShowSearchResults(true); }}
            className="pl-9 h-9"
          />
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left px-3 py-2.5 hover:bg-accent flex items-center gap-3 text-sm transition-colors"
                  onMouseDown={() => selectSearchResult(r.id)}
                >
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.client_id} • {r.contact || "-"}</p>
                  </div>
                  <Badge variant={r.status === "active" ? "default" : "destructive"} className="text-[10px] capitalize shrink-0">{r.status}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* ========== LEFT SIDEBAR ========== */}
        <div className="space-y-4">
          {/* Profile Card */}
          <Card className="overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-primary/30 via-primary/10 to-accent/20" />
            <CardContent className="p-5 -mt-10 space-y-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-2xl font-bold border-4 border-background shadow-lg">
                  {c.name?.charAt(0)?.toUpperCase()}
                </div>
                <h2 className="text-lg font-bold text-foreground">{c.name}</h2>
                <p className="text-sm text-muted-foreground font-mono">{c.client_id}</p>
                <div className="flex items-center gap-2">
                  {c.is_online ? (
                    <Badge className="bg-green-500/15 text-green-600 border-green-500/30 gap-1">
                      <Wifi className="h-3 w-3" /> Online
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <WifiOff className="h-3 w-3" /> Offline
                    </Badge>
                  )}
                  <Badge variant={c.status === "active" ? "default" : c.status === "left" ? "destructive" : "secondary"} className="capitalize">
                    {c.status}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2.5">
                <SidebarInfo label="ফোন" value={c.contact || c.phone_number || "-"} />
                <SidebarInfo label="ইমেইল" value={c.email || "-"} />
                <SidebarInfo label="ইউজারনেম" value={c.username || "-"} />
                <SidebarInfo label="প্যাকেজ" value={c.package?.name || "-"} />
                <SidebarInfo label="মাসিক বিল" value={`৳${Number(c.monthly_bill || 0).toLocaleString()}`} highlight />
                <SidebarInfo label="মোট বকেয়া" value={`৳${totalDue.toLocaleString()}`} danger={totalDue > 0} />
                <SidebarInfo label="সার্ভার" value={c.server_name || "-"} />
              </div>

              <Separator />

              <div className="space-y-2">
                <SidebarInfo label="বিলিং স্ট্যাটাস">
                  <Badge variant={bs === "paid" ? "default" : bs === "partial" ? "secondary" : "destructive"}>
                    {bs === "paid" ? "Paid" : bs === "partial" ? "Partial" : "Due"}
                  </Badge>
                </SidebarInfo>
                <SidebarInfo label="MikroTik">
                  <Badge variant="outline" className={c.mikrotik_status === "enabled" ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-red-500/10 text-red-600 border-red-500/30"}>
                    {c.mikrotik_status === "enabled" ? "Enabled" : c.mikrotik_status === "disabled" ? "Disabled" : "Unknown"}
                  </Badge>
                </SidebarInfo>
                <SidebarInfo label="যোগদান" value={c.joining_date || "-"} />
                <SidebarInfo label="মেয়াদ শেষ" value={c.expire_date || "-"} />
              </div>

              <Separator />

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => pppActionMutation.mutate("enable")} disabled={pppActionMutation.isPending}>
                  <Power className="h-3 w-3" /> Enable
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => pppActionMutation.mutate("disable")} disabled={pppActionMutation.isPending}>
                  <PowerOff className="h-3 w-3" /> Disable
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                  <MessageSquare className="h-3 w-3" /> মেসেজ
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                  <Package className="h-3 w-3" /> প্যাকেজ
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1.5 col-span-2" onClick={() => pppActionMutation.mutate("status")} disabled={pppActionMutation.isPending}>
                  <RefreshCw className="h-3 w-3" /> PPP Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary Card */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> আর্থিক সারসংক্ষেপ
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">মোট বিল (সর্বকালীন)</span>
                <span className="font-semibold">৳{billings.reduce((s: number, b: any) => s + Number(b.amount || 0), 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">মোট পরিশোধ</span>
                <span className="font-semibold text-green-600">৳{totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">মোট বকেয়া</span>
                <span className={`font-semibold ${totalDue > 0 ? "text-red-600" : "text-green-600"}`}>৳{totalDue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">মোট কালেকশন</span>
                <span className="font-semibold">৳{collections.reduce((s: number, c: any) => s + Number(c.amount || 0), 0).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========== RIGHT CONTENT ========== */}
        <Card>
          <CardContent className="p-4">
            <Tabs defaultValue="service">
              <TabsList className="flex flex-wrap h-auto gap-1 mb-4 bg-muted/50 p-1">
                <TabsTrigger value="service" className="text-xs gap-1"><Package className="h-3 w-3" /> সার্ভিস</TabsTrigger>
                <TabsTrigger value="network" className="text-xs gap-1"><Wifi className="h-3 w-3" /> নেটওয়ার্ক</TabsTrigger>
                <TabsTrigger value="personal" className="text-xs gap-1"><User className="h-3 w-3" /> ব্যক্তিগত</TabsTrigger>
                <TabsTrigger value="invoices" className="text-xs gap-1"><FileText className="h-3 w-3" /> বিল</TabsTrigger>
                <TabsTrigger value="generated" className="text-xs gap-1"><Edit className="h-3 w-3" /> Generated & Updated</TabsTrigger>
                <TabsTrigger value="collections" className="text-xs gap-1"><CreditCard className="h-3 w-3" /> কালেকশন</TabsTrigger>
                <TabsTrigger value="traffic" className="text-xs gap-1"><Activity className="h-3 w-3" /> ট্রাফিক</TabsTrigger>
                <TabsTrigger value="complain" className="text-xs gap-1"><MessageSquare className="h-3 w-3" /> অভিযোগ</TabsTrigger>
                <TabsTrigger value="changelog" className="text-xs gap-1"><History className="h-3 w-3" /> পরিবর্তন</TabsTrigger>
                <TabsTrigger value="remarks" className="text-xs gap-1"><Shield className="h-3 w-3" /> রিমার্কস</TabsTrigger>
              </TabsList>

              {/* Service Tab */}
              <TabsContent value="service">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  <DetailRow icon={Package} label="প্যাকেজ" value={c.package?.name || "-"} />
                  <DetailRow icon={Wifi} label="স্পিড/প্রোফাইল" value={c.speed || c.profile || "-"} />
                  <DetailRow icon={Calendar} label="যোগদান তারিখ" value={c.joining_date || "-"} />
                  <DetailRow icon={User} label="ক্লায়েন্ট টাইপ" value={c.client_type || "-"} />
                  <DetailRow icon={Calendar} label="বিলিং শুরুর মাস" value={c.billing_start_month || "-"} />
                  <DetailRow icon={Globe} label="ইউজারনেম/IP" value={c.username || c.remote_address || "-"} />
                  <DetailRow icon={Calendar} label="মেয়াদ শেষ" value={c.expire_date || "-"} />
                  <DetailRow icon={HardDrive} label="পাসওয়ার্ড" value={c.password || "-"} />
                  <DetailRow icon={HardDrive} label="মাসিক বিল" value={`৳${Number(c.monthly_bill || 0).toLocaleString()}`} />
                  <DetailRow icon={HardDrive} label="বিলিং তারিখ" value={c.billing_date ? `প্রতি মাসের ${c.billing_date} তারিখ` : "-"} />
                  <DetailRow icon={User} label="রেফারেন্স" value={c.reference_by || "-"} />
                  <DetailRow icon={User} label="সংযোগ সেটআপ" value={c.connected_by || "-"} />
                  <DetailRow icon={HardDrive} label="জোন" value={c.zone?.name || "-"} />
                  <DetailRow icon={HardDrive} label="সাব-জোন" value={c.sub_zone?.name || "-"} />
                  <DetailRow icon={HardDrive} label="বক্স" value={c.box?.name || "-"} />
                  <DetailRow icon={User} label="VIP" value={c.is_vip ? "হ্যাঁ" : "না"} />
                </div>
              </TabsContent>

              {/* Network Tab */}
              <TabsContent value="network">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                    <DetailRow icon={Wifi} label="কানেকশন টাইপ" value={c.connection_type || "-"} />
                    <DetailRow icon={Globe} label="প্রোটোকল" value={c.protocol_type || "-"} />
                    <DetailRow icon={HardDrive} label="MAC Address" value={c.mac_address || "-"} />
                    <DetailRow icon={HardDrive} label="সার্ভার" value={c.server_name || "-"} />
                    <DetailRow icon={Globe} label="Remote Address" value={c.remote_address || "-"} />
                    <DetailRow icon={HardDrive} label="ডিভাইস টাইপ" value={c.device_type || "-"} />
                    <DetailRow icon={HardDrive} label="ডিভাইস সিরিয়াল" value={c.device_serial || "-"} />
                    <DetailRow icon={HardDrive} label="ONU ID" value={c.onu_id || "-"} />
                    <DetailRow icon={HardDrive} label="ফাইবার কোড" value={c.fiber_code || "-"} />
                    <DetailRow icon={HardDrive} label="কোর কালার" value={c.core_color || "-"} />
                    <DetailRow icon={HardDrive} label="কোর কাউন্ট" value={String(c.core_count || "-")} />
                    <DetailRow icon={HardDrive} label="কেবল দৈর্ঘ্য" value={c.cable_length ? `${c.cable_length} মি` : "-"} />
                  </div>

                  {/* PPP Live Data */}
                  <Card className="border-dashed">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" /> PPP Live Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <DetailRow icon={Wifi} label="PPP Active" value={pppData.has_active_session ? "🟢 Online" : "🔴 Offline"} />
                        <DetailRow icon={HardDrive} label="Uptime" value={pppData.session?.uptime || "-"} />
                        <DetailRow icon={Download} label="Download" value={formatBytes(pppData.session?.download_bytes)} />
                        <DetailRow icon={Download} label="Upload" value={formatBytes(pppData.session?.upload_bytes)} />
                        <DetailRow icon={Activity} label="RX Traffic" value={formatBits(pppData.live_traffic?.rx_bps)} />
                        <DetailRow icon={Activity} label="TX Traffic" value={formatBits(pppData.live_traffic?.tx_bps)} />
                        <DetailRow icon={HardDrive} label="Caller ID" value={pppData.session?.caller_id || "-"} />
                        <DetailRow icon={Globe} label="Session IP" value={pppData.session?.address || "-"} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Personal Tab */}
              <TabsContent value="personal">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  <DetailRow icon={User} label="পিতার নাম" value={c.father_name || "-"} />
                  <DetailRow icon={User} label="মাতার নাম" value={c.mother_name || "-"} />
                  <DetailRow icon={Calendar} label="জন্ম তারিখ" value={c.date_of_birth || "-"} />
                  <DetailRow icon={User} label="লিঙ্গ" value={c.gender || "-"} />
                  <DetailRow icon={HardDrive} label="NID নম্বর" value={c.nid_number || "-"} />
                  <DetailRow icon={User} label="পেশা" value={c.occupation || "-"} />
                  <DetailRow icon={Mail} label="ইমেইল" value={c.email || "-"} />
                  <DetailRow icon={HardDrive} label="ফোন" value={c.phone_number || c.contact || "-"} />
                  <DetailRow icon={Globe} label="ঠিকানা" value={c.address || "-"} />
                  <DetailRow icon={Globe} label="স্থায়ী ঠিকানা" value={c.permanent_address || "-"} />
                  <DetailRow icon={HardDrive} label="রোড নং" value={c.road_number || "-"} />
                  <DetailRow icon={HardDrive} label="হাউজ নং" value={c.house_number || "-"} />
                </div>
              </TabsContent>

              {/* Invoices Tab */}
              <TabsContent value="invoices">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>মাস</TableHead>
                        <TableHead>Bill ID</TableHead>
                        <TableHead className="text-right">বিল</TableHead>
                        <TableHead className="text-right">পেইড</TableHead>
                        <TableHead className="text-right">ডিসকাউন্ট</TableHead>
                        <TableHead className="text-right">বকেয়া</TableHead>
                        <TableHead className="text-right">অগ্রিম</TableHead>
                        <TableHead>Pay Date</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billings.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center py-4 text-muted-foreground">কোনো ইনভয়েস নেই</TableCell></TableRow>
                      ) : billings.map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.month}</TableCell>
                          <TableCell className="font-mono text-xs">{b.bill_id}</TableCell>
                          <TableCell className="text-right">{Number(b.amount).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-green-600">{Number(b.paid || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(b.discount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-red-600">{Number(b.due || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(b.advance || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{b.pay_date || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={b.status === "paid" ? "default" : b.status === "partial" ? "secondary" : "destructive"} className="text-xs">
                              {b.status === "paid" ? "Paid" : b.status === "partial" ? "Partial" : "Due"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Generated & Updated Bill/Invoices Tab */}
              <TabsContent value="generated">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>তারিখ</TableHead>
                        <TableHead>বিলিং মাস</TableHead>
                        <TableHead>প্যাকেজ</TableHead>
                        <TableHead>স্পিড</TableHead>
                        <TableHead className="text-right">বিল পরিমাণ</TableHead>
                        <TableHead className="text-right">পরিশোধ</TableHead>
                        <TableHead className="text-right">বকেয়া</TableHead>
                        <TableHead className="text-center">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billings.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center py-4 text-muted-foreground">কোনো ইনভয়েস নেই</TableCell></TableRow>
                      ) : billings.map((b: any) => {
                        const histForBill = (billHistory as any[]).filter((h) => h.billing_id === b.id);
                        const expanded = expandedBillId === b.id;
                        return (
                          <>
                            <TableRow key={b.id}>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedBillId(expanded ? null : b.id)}>
                                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                              </TableCell>
                              <TableCell className="text-xs">{b.created_at ? new Date(b.created_at).toLocaleDateString("bn-BD") : "-"}</TableCell>
                              <TableCell className="font-medium">{b.month}</TableCell>
                              <TableCell>{c.package?.name || "-"}</TableCell>
                              <TableCell className="text-xs">{c.profile || c.speed || "-"}</TableCell>
                              <TableCell className="text-right font-semibold">৳{Number(b.amount).toLocaleString()}</TableCell>
                              <TableCell className="text-right text-green-600">৳{Number(b.paid || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-right text-red-600">৳{Number(b.due || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-center">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingBill(b)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                            {expanded && (
                              <TableRow key={`${b.id}-h`}>
                                <TableCell colSpan={9} className="bg-muted/40 p-3">
                                  <div className="text-xs font-semibold mb-2">পরিবর্তন ইতিহাস</div>
                                  {histForBill.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">কোনো ইতিহাস নেই</p>
                                  ) : (
                                    <ul className="space-y-1.5">
                                      {histForBill.map((h: any) => (
                                        <li key={h.id} className="text-xs flex flex-wrap gap-x-3">
                                          <Badge variant="outline" className="text-[10px] capitalize">{h.action}</Badge>
                                          <span className="text-muted-foreground">{new Date(h.changed_at).toLocaleString("bn-BD")}</span>
                                          {h.old_value?.amount !== undefined && (
                                            <span>৳{h.old_value.amount} → ৳{h.new_value?.amount}</span>
                                          )}
                                          {h.remarks && <span className="italic">— {h.remarks}</span>}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Collections Tab */}
              <TabsContent value="collections">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>তারিখ</TableHead>
                        <TableHead className="text-right">পরিমাণ</TableHead>
                        <TableHead className="text-right">ডিসকাউন্ট</TableHead>
                        <TableHead className="text-right">VAT</TableHead>
                        <TableHead>পেমেন্ট মেথড</TableHead>
                        <TableHead>Trans ID</TableHead>
                        <TableHead>গ্রহণকারী</TableHead>
                        <TableHead>নোট</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {collections.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center py-4 text-muted-foreground">কোনো কালেকশন নেই</TableCell></TableRow>
                      ) : collections.map((col: any) => (
                        <TableRow key={col.id}>
                          <TableCell className="text-xs">{new Date(col.created_at).toLocaleDateString("bn-BD")}</TableCell>
                          <TableCell className="text-right font-medium">{Number(col.amount).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(col.discount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(col.vat || 0).toLocaleString()}</TableCell>
                          <TableCell>{col.payment_method || "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{col.transaction_id || "-"}</TableCell>
                          <TableCell className="text-xs">{col.received_by || "-"}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{col.note || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={col.status === "approved" ? "default" : "secondary"} className="text-xs capitalize">{col.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Traffic Tab */}
              <TabsContent value="traffic">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">মাসিক ট্রাফিক ব্যবহার</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>মাস</TableHead>
                          <TableHead className="text-right">ডাউনলোড</TableHead>
                          <TableHead className="text-right">আপলোড</TableHead>
                          <TableHead className="text-right">মোট</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(!trafficData || trafficData.length === 0) ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">ট্রাফিক ডেটা পাওয়া যায়নি</TableCell></TableRow>
                        ) : trafficData.map((t: any) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.month}</TableCell>
                            <TableCell className="text-right">{formatBytes(t.total_download)}</TableCell>
                            <TableCell className="text-right">{formatBytes(t.total_upload)}</TableCell>
                            <TableCell className="text-right font-medium">{formatBytes(Number(t.total_download || 0) + Number(t.total_upload || 0))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* Complaints Tab */}
              <TabsContent value="complain">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>তারিখ</TableHead>
                        <TableHead>বিষয়</TableHead>
                        <TableHead>বিবরণ</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supportTickets.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">কোনো অভিযোগ নেই</TableCell></TableRow>
                      ) : supportTickets.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs">{new Date(t.created_at).toLocaleDateString("bn-BD")}</TableCell>
                          <TableCell className="font-medium">{t.subject || t.title || "-"}</TableCell>
                          <TableCell className="text-xs max-w-[300px] truncate">{t.description || "-"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{t.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Changelog Tab */}
              <TabsContent value="changelog">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>তারিখ</TableHead>
                        <TableHead>ধরন</TableHead>
                        <TableHead>পুরাতন</TableHead>
                        <TableHead>নতুন</TableHead>
                        <TableHead>কারণ</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changeRequests.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">কোনো পরিবর্তন রেকর্ড নেই</TableCell></TableRow>
                      ) : changeRequests.map((cr: any) => (
                        <TableRow key={cr.id}>
                          <TableCell className="text-xs">{new Date(cr.created_at).toLocaleDateString("bn-BD")}</TableCell>
                          <TableCell className="capitalize">{cr.request_type?.replace("_", " ")}</TableCell>
                          <TableCell className="text-xs">{cr.old_value || "-"}</TableCell>
                          <TableCell className="text-xs">{cr.new_value || "-"}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{cr.reason || "-"}</TableCell>
                          <TableCell><Badge variant={cr.status === "approved" ? "default" : cr.status === "rejected" ? "destructive" : "secondary"} className="text-xs capitalize">{cr.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Remarks Tab */}
              <TabsContent value="remarks">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{c.remarks || "কোনো রিমার্ক নেই"}</p>
                </div>
                {c.left_reason && (
                  <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm font-medium text-destructive mb-1">ত্যাগের কারণ:</p>
                    <p className="text-sm">{c.left_reason}</p>
                    {c.left_date && <p className="text-xs text-muted-foreground mt-1">তারিখ: {c.left_date}</p>}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <BillEditDialog
        open={!!editingBill}
        onOpenChange={(v) => { if (!v) setEditingBill(null); }}
        bill={editingBill}
        clientId={id!}
      />
    </div>
  );
}

function SidebarInfo({ label, value, highlight, danger, children }: { label: string; value?: string | number; highlight?: boolean; danger?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children || (
        <span className={`text-sm font-medium ${danger ? "text-red-600" : highlight ? "text-primary" : "text-foreground"}`}>
          {value}
        </span>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function formatBytes(value: string | number | null | undefined) {
  const bytes = Number(value || 0);
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatBits(value: string | number | null | undefined) {
  const bits = Number(value || 0);
  if (!bits) return "-";
  if (bits < 1000) return `${bits} bps`;
  if (bits < 1000 ** 2) return `${(bits / 1000).toFixed(2)} Kbps`;
  if (bits < 1000 ** 3) return `${(bits / 1000 ** 2).toFixed(2)} Mbps`;
  return `${(bits / 1000 ** 3).toFixed(2)} Gbps`;
}
