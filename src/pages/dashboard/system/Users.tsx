import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users as UsersIcon, Plus, Search, Eye, EyeOff, Trash2, Shield, Lock } from "lucide-react";

export default function Users() {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [entriesPerPage, setEntriesPerPage] = useState("10");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const togglePassword = (id: string) => setShowPasswords(p => ({ ...p, [id]: !p[id] }));

  // Placeholder data
  const users = [
    { id: "1", username: "admin", password: "admin123", status: "Active", employee: "Admin User", role: "Super Admin", modules: "সকল" },
    { id: "2", username: "operator", password: "op2024", status: "Active", employee: "Operator 1", role: "Operator", modules: "বিলিং, ক্লায়েন্ট" },
    { id: "3", username: "viewer", password: "view456", status: "InActive", employee: "Viewer User", role: "Viewer", modules: "রিপোর্ট" },
  ];

  const roles = [
    { id: "1", name: "Super Admin", status: "Active", redirect: "/dashboard", createdBy: "System", createdOn: "2024-01-01" },
    { id: "2", name: "Operator", status: "Active", redirect: "/dashboard/billing", createdBy: "Admin", createdOn: "2024-03-15" },
    { id: "3", name: "Viewer", status: "Active", redirect: "/dashboard/reports", createdBy: "Admin", createdOn: "2024-05-01" },
  ];

  const permissions = [
    { id: "1", role: "Super Admin", status: "Active", modules: "সকল মডিউল", permissions: "পূর্ণ অ্যাক্সেস", createdBy: "System", createdOn: "2024-01-01" },
    { id: "2", role: "Operator", status: "Active", modules: "বিলিং, ক্লায়েন্ট, নেটওয়ার্ক", permissions: "তৈরি, সম্পাদনা, দেখা", createdBy: "Admin", createdOn: "2024-03-15" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <UsersIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">অ্যাপ ইউজার</h1>
          <p className="text-xs text-muted-foreground">সিস্টেম &gt; অ্যাপ ইউজার</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="users" className="gap-2"><UsersIcon className="h-3.5 w-3.5" /> অ্যাপ্লিকেশন ইউজার</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2"><Shield className="h-3.5 w-3.5" /> ইউজার রোল (গ্রুপ)</TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2"><Lock className="h-3.5 w-3.5" /> রোল মডিউল (পার্মিশন)</TabsTrigger>
        </TabsList>

        {/* Application Users Tab */}
        <TabsContent value="users">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2"><UsersIcon className="h-4 w-4" /> অ্যাপ্লিকেশন ইউজার তালিকা</span>
              <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs"><Plus className="h-3 w-3" /> নতুন ইউজার</Button>
            </div>
            <div className="p-4 bg-card space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-end">
                <div className="w-40">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="ইউজার স্ট্যাটাস" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল</SelectItem>
                      <SelectItem value="Active">সক্রিয়</SelectItem>
                      <SelectItem value="InActive">নিষ্ক্রিয়</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="ইউজার রোল" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল</SelectItem>
                      <SelectItem value="Super Admin">Super Admin</SelectItem>
                      <SelectItem value="Operator">Operator</SelectItem>
                      <SelectItem value="Viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Show</span>
                  <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                    <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="সার্চ..." className="h-8 w-48 pl-8 text-xs" />
                  </div>
                </div>
              </div>
              {/* Table */}
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs w-12">ক্র.নং</TableHead>
                      <TableHead className="text-xs">ইউজার নাম</TableHead>
                      <TableHead className="text-xs">পাসওয়ার্ড</TableHead>
                      <TableHead className="text-xs">স্ট্যাটাস</TableHead>
                      <TableHead className="text-xs">কর্মচারী</TableHead>
                      <TableHead className="text-xs">রোল/গ্রুপ</TableHead>
                      <TableHead className="text-xs">মডিউল</TableHead>
                      <TableHead className="text-xs w-20">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u, i) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs">{i + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{u.username}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono">{showPasswords[u.id] ? u.password : "••••••"}</span>
                            <button onClick={() => togglePassword(u.id)} className="text-muted-foreground hover:text-foreground">
                              {showPasswords[u.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.status === "Active" ? "default" : "destructive"} className={`text-[10px] ${u.status === "Active" ? "bg-green-500 hover:bg-green-600" : ""}`}>
                            {u.status === "Active" ? "সক্রিয়" : "নিষ্ক্রিয়"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{u.employee}</TableCell>
                        <TableCell className="text-xs">{u.role}</TableCell>
                        <TableCell className="text-xs">{u.modules}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>মোট {users.length}টি এন্ট্রি</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled>পূর্ববর্তী</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs bg-primary text-primary-foreground">1</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled>পরবর্তী</Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* User Roles Tab */}
        <TabsContent value="roles">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> ইউজার রোল (গ্রুপ)</span>
              <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs"><Plus className="h-3 w-3" /> নতুন রোল (গ্রুপ)</Button>
            </div>
            <div className="p-4 bg-card">
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs w-12">ক্র.নং</TableHead>
                      <TableHead className="text-xs">নাম</TableHead>
                      <TableHead className="text-xs">স্ট্যাটাস</TableHead>
                      <TableHead className="text-xs">Redirect URL</TableHead>
                      <TableHead className="text-xs">তৈরি করেছেন</TableHead>
                      <TableHead className="text-xs">তৈরির তারিখ</TableHead>
                      <TableHead className="text-xs w-20">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((r, i) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{i + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{r.name}</TableCell>
                        <TableCell>
                          <Badge className="text-[10px] bg-green-500 hover:bg-green-600">{r.status === "Active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{r.redirect}</TableCell>
                        <TableCell className="text-xs">{r.createdBy}</TableCell>
                        <TableCell className="text-xs">{r.createdOn}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Role Modules Tab */}
        <TabsContent value="permissions">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> রোল মডিউল (পার্মিশন)</span>
              <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs"><Plus className="h-3 w-3" /> নতুন রোল মডিউল</Button>
            </div>
            <div className="p-4 bg-card">
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs w-12">ক্র.নং</TableHead>
                      <TableHead className="text-xs">রোল</TableHead>
                      <TableHead className="text-xs">স্ট্যাটাস</TableHead>
                      <TableHead className="text-xs">মডিউলসমূহ</TableHead>
                      <TableHead className="text-xs">পার্মিশন</TableHead>
                      <TableHead className="text-xs">তৈরি করেছেন</TableHead>
                      <TableHead className="text-xs">তৈরির তারিখ</TableHead>
                      <TableHead className="text-xs w-20">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((p, i) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs">{i + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{p.role}</TableCell>
                        <TableCell>
                          <Badge className="text-[10px] bg-green-500 hover:bg-green-600">{p.status === "Active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{p.modules}</TableCell>
                        <TableCell className="text-xs">{p.permissions}</TableCell>
                        <TableCell className="text-xs">{p.createdBy}</TableCell>
                        <TableCell className="text-xs">{p.createdOn}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
