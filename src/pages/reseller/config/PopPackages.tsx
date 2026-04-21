import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callPortal } from "@/lib/portalApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Check, X, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { toast } from "sonner";

export default function PopPackages() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftRate, setDraftRate] = useState<string>("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["pop-tariff-packages"],
    queryFn: async () => {
      const res = await callPortal<{ packages: any[] }>("get_tariff_packages");
      return res.packages || [];
    },
  });

  const updateRate = useMutation({
    mutationFn: async ({ id, rate }: { id: string; rate: number }) =>
      callPortal("update_tariff_selling_rate", {
        package_id: id,
        selling_rate: rate,
      }),
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
      return toast.error(
        `Selling rate buying rate (৳${p.buy_rate}) এর কম হতে পারবে না`,
      );
    updateRate.mutate({ id: p.id, rate: n });
  };

  const filtered = useMemo(() => {
    const list = data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p: any) =>
      [
        p.isp_packages?.name,
        p.mikrotik_devices?.name,
        p.protocol_type,
        p.mikrotik_profile,
      ]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(q)),
    );
  }, [data, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(startIdx, startIdx + pageSize);
  const showingFrom = total === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + pageSize, total);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const max = 5;
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + max - 1);
    start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Package</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Configuration &gt; Package
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span>Show</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>entries</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>Search:</span>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-8 w-64"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive py-6 text-center">
          Package লোড করা যায়নি — {(error as any).message}
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package Name</TableHead>
                <TableHead>Server Name</TableHead>
                <TableHead>Protocol Type</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead className="text-center">BuyingRate</TableHead>
                <TableHead className="text-center">SellingRate</TableHead>
                <TableHead className="text-center">ValidityDays</TableHead>
                <TableHead className="text-center">Min R.Days</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-8"
                  >
                    কোনো package পাওয়া যায়নি
                  </TableCell>
                </TableRow>
              )}
              {pageRows.map((p: any) => {
                const isEdit = editingId === p.id;
                const buy = Number(p.buy_rate || 0);
                const invalid =
                  isEdit && Number(draftRate) > 0 && Number(draftRate) < buy;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.isp_packages?.name || "—"}
                    </TableCell>
                    <TableCell>{p.mikrotik_devices?.name || "—"}</TableCell>
                    <TableCell className="uppercase">
                      {p.protocol_type || "—"}
                    </TableCell>
                    <TableCell>{p.mikrotik_profile || "—"}</TableCell>
                    <TableCell className="text-center font-mono text-muted-foreground">
                      <span
                        className="inline-flex items-center gap-1"
                        title="Admin-এর নির্ধারিত rate (পরিবর্তনযোগ্য নয়)"
                      >
                        <Lock className="h-3 w-3 opacity-60" />
                        {buy.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold">
                      {isEdit ? (
                        <Input
                          type="number"
                          value={draftRate}
                          onChange={(e) => setDraftRate(e.target.value)}
                          className={`h-8 w-24 mx-auto text-center ${
                            invalid
                              ? "border-destructive focus-visible:ring-destructive"
                              : ""
                          }`}
                          min={buy}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") save(p);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                      ) : (
                        Number(p.selling_rate || 0).toLocaleString()
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.validity_days || 30}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.min_activation_days || 1}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEdit ? (
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={updateRate.isPending}
                            onClick={() => save(p)}
                            title="সংরক্ষণ"
                          >
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setEditingId(null)}
                            title="বাতিল"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => startEdit(p)}
                          title="Selling Rate edit করুন"
                        >
                          <Pencil className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="text-muted-foreground">
              Showing {showingFrom} to {showingTo} of {total} entries
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              {pageNumbers.map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={n === currentPage ? "default" : "outline"}
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(n)}
                >
                  {n}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
