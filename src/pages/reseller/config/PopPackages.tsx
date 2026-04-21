import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callPortal } from "@/lib/portalApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, Info, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function PopPackages() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftRate, setDraftRate] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["pop-tariff-packages"],
    queryFn: async () => {
      const res = await callPortal<{ packages: any[] }>("get_tariff_packages");
      return res.packages || [];
    },
  });

  const updateRate = useMutation({
    mutationFn: async ({ id, rate }: { id: string; rate: number }) =>
      callPortal("update_tariff_selling_rate", { package_id: id, selling_rate: rate }),
    onSuccess: () => {
      toast.success("Selling rate আপডেট হয়েছে");
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["pop-tariff-packages"] });
    },
    onError: (e: any) => toast.error(e.message || "আপডেট ব্যর্থ"),
  });

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setDraftRate(String(p.selling_rate ?? ""));
  };

  const save = (p: any) => {
    const n = Number(draftRate);
    if (!Number.isFinite(n) || n < 0) return toast.error("সঠিক rate দিন");
    if (n < Number(p.buy_rate || 0))
      return toast.error(`Selling rate buy rate (৳${p.buy_rate}) এর কম হতে পারবে না`);
    updateRate.mutate({ id: p.id, rate: n });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Package</h1>
        <p className="text-sm text-muted-foreground">
          Admin আপনার tariff-এ যে package assign করেছে — <b>Buy Rate</b> = admin আপনার থেকে নিচ্ছে, <b>Sell Rate</b> = আপনি client-এর কাছে যে দামে বেচবেন
        </p>
      </div>

      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4 flex items-start gap-2 text-sm">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            <b>Buy Rate</b> পরিবর্তন করতে admin-এর সাথে যোগাযোগ করুন। আপনি শুধু <b>Sell Rate</b> পরিবর্তন করতে পারবেন — যা কখনো Buy Rate-এর কম হতে পারবে না।
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Tariff Packages
            {data && <Badge variant="secondary">{data.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : error ? (
            <p className="text-sm text-destructive py-6 text-center">
              Package লোড করা যায়নি — {(error as any).message}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package Name</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead className="text-right">Buy Rate (৳)</TableHead>
                    <TableHead className="text-right">Sell Rate (৳)</TableHead>
                    <TableHead className="text-center">Validity</TableHead>
                    <TableHead className="text-center">Min R.Days</TableHead>
                    <TableHead className="text-center w-20">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!data || data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                        Admin এখনো এই POP-এ কোনো tariff/package assign করেনি
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.map((p: any) => {
                    const isEdit = editingId === p.id;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.isp_packages?.name || "—"}</TableCell>
                        <TableCell>{p.mikrotik_devices?.name || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{p.protocol_type || "—"}</Badge></TableCell>
                        <TableCell>{p.mikrotik_profile || "—"}</TableCell>
                        <TableCell className="text-right font-mono">
                          ৳ {Number(p.buy_rate || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-primary">
                          {isEdit ? (
                            <Input
                              type="number"
                              value={draftRate}
                              onChange={(e) => setDraftRate(e.target.value)}
                              className="h-8 w-28 ml-auto text-right"
                              min={p.buy_rate || 0}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") save(p);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                          ) : (
                            <>৳ {Number(p.selling_rate || 0).toLocaleString()}</>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{p.validity_days || 30}</TableCell>
                        <TableCell className="text-center">{p.min_activation_days || 1}</TableCell>
                        <TableCell className="text-center">
                          {isEdit ? (
                            <div className="flex gap-1 justify-center">
                              <Button size="icon" variant="ghost" className="h-7 w-7"
                                disabled={updateRate.isPending} onClick={() => save(p)}>
                                <Check className="h-4 w-4 text-emerald-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => setEditingId(null)}>
                                <X className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
