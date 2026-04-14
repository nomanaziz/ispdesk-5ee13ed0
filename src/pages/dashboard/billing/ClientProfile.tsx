import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Edit, Calendar, Mail, Package, Download,
  User, Globe, Wifi, HardDrive
} from "lucide-react";

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
          bill_collections!bill_collections_client_id_fkey(id, amount, discount, vat, payment_method, note, status, created_at, transaction_id)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!client) return <div className="p-8 text-center text-muted-foreground">ক্লায়েন্ট পাওয়া যায়নি</div>;

  const c: any = client;
  const billings = (c.billing || []).sort((a: any, b: any) => b.month?.localeCompare(a.month));
  const collections = (c.bill_collections || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalDue = billings.reduce((s: number, b: any) => s + Number(b.due || 0), 0);
  const bs = billings[0]?.status || "unpaid";

  return (
    <div className="p-4 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/billing")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> বিলিং তালিকায় ফিরুন
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Left Sidebar */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{c.name}</h2>
              <p className="text-sm text-muted-foreground">{c.contact || "-"}</p>
            </div>

            <Separator />

            <InfoRow label="ক্লায়েন্ট কোড" value={c.client_id} />
            <InfoRow label="ইউজারনেম/IP" value={c.username || c.remote_address || "-"} />
            <InfoRow label="স্ট্যাটাস">
              <Badge variant={c.status === "active" ? "default" : c.status === "left" ? "destructive" : "secondary"} className="capitalize">
                {c.status}
              </Badge>
            </InfoRow>
            <InfoRow label="বিলিং স্ট্যাটাস">
              <Badge variant={bs === "paid" ? "default" : bs === "partial" ? "secondary" : "destructive"}>
                {bs === "paid" ? "Paid" : bs === "partial" ? "Partial" : "Due"}
              </Badge>
            </InfoRow>
            <InfoRow label="মোট বকেয়া" value={`৳${totalDue.toLocaleString()}`} />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">MikroTik Status</span>
              <Switch checked={c.mikrotik_status === "active"} />
            </div>

            <InfoRow label="তৈরি তারিখ" value={c.created_at ? new Date(c.created_at).toLocaleDateString("bn-BD") : "-"} />

            <Separator />

            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="text-xs"><Edit className="h-3 w-3 mr-1" /> আপডেট</Button>
              <Button size="sm" variant="outline" className="text-xs"><Calendar className="h-3 w-3 mr-1" /> শিডিউলার</Button>
              <Button size="sm" variant="outline" className="text-xs"><Mail className="h-3 w-3 mr-1" /> মেসেজ</Button>
              <Button size="sm" variant="outline" className="text-xs"><Package className="h-3 w-3 mr-1" /> প্যাকেজ</Button>
              <Button size="sm" variant="outline" className="text-xs col-span-2"><Download className="h-3 w-3 mr-1" /> তথ্য ডাউনলোড</Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Content */}
        <Card>
          <CardContent className="p-4">
            <Tabs defaultValue="service">
              <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
                <TabsTrigger value="service">সার্ভিস তথ্য</TabsTrigger>
                <TabsTrigger value="network">নেটওয়ার্ক</TabsTrigger>
                <TabsTrigger value="personal">ব্যক্তিগত</TabsTrigger>
                <TabsTrigger value="invoices">ইনভয়েস</TabsTrigger>
                <TabsTrigger value="collections">কালেকশন</TabsTrigger>
                <TabsTrigger value="complain">অভিযোগ</TabsTrigger>
                <TabsTrigger value="remarks">রিমার্কস</TabsTrigger>
              </TabsList>

              <TabsContent value="service">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  <DetailRow icon={Package} label="প্যাকেজ" value={c.package?.name || "-"} />
                  <DetailRow icon={Wifi} label="স্পিড" value={c.speed || c.profile || "-"} />
                  <DetailRow icon={Calendar} label="যোগদান তারিখ" value={c.joining_date || "-"} />
                  <DetailRow icon={User} label="ক্লায়েন্ট টাইপ" value={c.client_type || "-"} />
                  <DetailRow icon={Calendar} label="বিলিং শুরুর মাস" value={c.billing_start_month || "-"} />
                  <DetailRow icon={Globe} label="ইউজারনেম/IP" value={c.username || c.remote_address || "-"} />
                  <DetailRow icon={Calendar} label="মেয়াদ শেষ" value={c.expire_date || "-"} />
                  <DetailRow icon={HardDrive} label="পাসওয়ার্ড" value={c.password || "-"} />
                  <DetailRow icon={HardDrive} label="মাসিক বিল" value={`৳${Number(c.monthly_bill || 0).toLocaleString()}`} />
                  <DetailRow icon={HardDrive} label="বকেয়া" value={`৳${totalDue.toLocaleString()}`} />
                  <DetailRow icon={User} label="রেফারেন্স" value={c.reference_by || "-"} />
                  <DetailRow icon={User} label="সংযোগ সেটআপ" value={c.connected_by || "-"} />
                </div>
              </TabsContent>

              <TabsContent value="network">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  <DetailRow icon={Wifi} label="কানেকশন টাইপ" value={c.connection_type || "-"} />
                  <DetailRow icon={Globe} label="প্রোটোকল টাইপ" value={c.protocol_type || "-"} />
                  <DetailRow icon={HardDrive} label="MAC Address" value={c.mac_address || "-"} />
                  <DetailRow icon={HardDrive} label="সার্ভার" value={c.server_name || "-"} />
                  <DetailRow icon={Globe} label="Remote Address" value={c.remote_address || "-"} />
                  <DetailRow icon={HardDrive} label="ডিভাইস টাইপ" value={c.device_type || "-"} />
                  <DetailRow icon={HardDrive} label="ডিভাইস সিরিয়াল" value={c.device_serial || "-"} />
                  <DetailRow icon={HardDrive} label="ONU ID" value={c.onu_id || "-"} />
                  <DetailRow icon={HardDrive} label="ফাইবার কোড" value={c.fiber_code || "-"} />
                  <DetailRow icon={HardDrive} label="কোর কালার" value={c.core_color || "-"} />
                  <DetailRow icon={HardDrive} label="কোর কাউন্ট" value={c.core_count || "-"} />
                  <DetailRow icon={HardDrive} label="কেবল দৈর্ঘ্য" value={c.cable_length ? `${c.cable_length} মি` : "-"} />
                </div>
              </TabsContent>

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
                  <DetailRow icon={Globe} label="জোন" value={c.zone?.name || "-"} />
                  <DetailRow icon={Globe} label="সাব-জোন" value={c.sub_zone?.name || "-"} />
                </div>
              </TabsContent>

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
                          <TableCell>{b.month}</TableCell>
                          <TableCell className="font-mono text-xs">{b.bill_id}</TableCell>
                          <TableCell className="text-right">{Number(b.amount).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(b.paid || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(b.discount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(b.due || 0).toLocaleString()}</TableCell>
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
                        <TableHead>নোট</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {collections.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-4 text-muted-foreground">কোনো কালেকশন নেই</TableCell></TableRow>
                      ) : collections.map((col: any) => (
                        <TableRow key={col.id}>
                          <TableCell className="text-xs">{new Date(col.created_at).toLocaleDateString("bn-BD")}</TableCell>
                          <TableCell className="text-right">{Number(col.amount).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(col.discount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(col.vat || 0).toLocaleString()}</TableCell>
                          <TableCell>{col.payment_method || "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{col.transaction_id || "-"}</TableCell>
                          <TableCell className="text-xs">{col.note || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={col.status === "approved" ? "default" : "secondary"} className="text-xs capitalize">{col.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="complain">
                <p className="text-sm text-muted-foreground text-center py-8">অভিযোগের তথ্য শীঘ্রই যুক্ত হবে</p>
              </TabsContent>

              <TabsContent value="remarks">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-foreground">{c.remarks || "কোনো রিমার্ক নেই"}</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value, children }: { label: string; value?: string | number; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children || <span className="text-sm font-medium text-foreground">{value}</span>}
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
