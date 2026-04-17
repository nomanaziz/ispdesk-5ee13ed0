import { ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, FileText, ArrowDown, ArrowUp, ArrowUpDown, FileType2 } from "lucide-react";
import { exportCSV, exportPDF, exportExcel, type Column } from "@/lib/reportExport";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  breadcrumb: string;
  filters: ReactNode;
  columns: (Column & { sortable?: boolean; align?: "left" | "right" | "center"; className?: string })[];
  rows: any[];
  loading?: boolean;
  totalsRow?: Record<string, ReactNode>;
  enableExcel?: boolean;
  extraActions?: ReactNode;
  rowKey?: (r: any, i: number) => string;
  onRowClick?: (r: any) => void;
  pageSizeOptions?: number[];
}

export function ReportLayout({
  title,
  breadcrumb,
  filters,
  columns,
  rows,
  loading,
  totalsRow,
  enableExcel,
  extraActions,
  rowKey,
  onRowClick,
  pageSizeOptions = [10, 25, 50, 100],
}: Props) {
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      columns.some((c) => {
        const v = c.format ? c.format(r[c.key], r) : r[c.key];
        return v != null && String(v).toLowerCase().includes(q);
      }),
    );
  }, [rows, search, columns]);

  const sorted = useMemo(() => {
    if (!sortBy) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortBy], bv = b[sortBy];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const an = Number(av), bn = Number(bv);
      let cmp: number;
      if (!isNaN(an) && !isNaN(bn)) cmp = an - bn;
      else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortBy, sortDir]);

  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = pageSize === -1 ? sorted : sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) => {
    if (sortBy !== key) { setSortBy(key); setSortDir("asc"); return; }
    if (sortDir === "asc") { setSortDir("desc"); return; }
    setSortBy(null);
  };

  const exportCols: Column[] = columns.map(({ key, label, format }) => ({ key, label, format }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">{breadcrumb}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {extraActions}
          <Button variant="outline" size="sm" onClick={() => exportPDF(title, exportCols, sorted)} className="gap-2">
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(title, exportCols, sorted)} className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
          {enableExcel && (
            <Button variant="outline" size="sm" onClick={() => exportExcel(title, exportCols, sorted)} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2">
          <FileType2 className="h-4 w-4" /> Filters
        </div>
        <div className="p-4">{filters}</div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="flex items-center justify-between px-4 py-2 gap-2 flex-wrap border-b">
          <div className="flex items-center gap-2 text-sm">
            <span>Show</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                <SelectItem value="-1">All</SelectItem>
              </SelectContent>
            </Select>
            <span>entries</span>
          </div>
          <Input placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="h-8 w-64" />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#1e3a5f] hover:bg-[#1e3a5f]">
                {columns.map((c) => (
                  <TableHead
                    key={c.key}
                    onClick={() => c.sortable !== false && toggleSort(c.key)}
                    className={cn(
                      "text-white whitespace-nowrap text-xs font-semibold",
                      c.sortable !== false && "cursor-pointer select-none hover:bg-[#284a72]",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.className,
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {c.sortable !== false && (
                        sortBy === c.key
                          ? sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          : <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">No data available</TableCell></TableRow>
              ) : (
                paged.map((r, i) => (
                  <TableRow key={rowKey ? rowKey(r, i) : i} onClick={() => onRowClick?.(r)} className={onRowClick ? "cursor-pointer" : ""}>
                    {columns.map((c) => (
                      <TableCell key={c.key} className={cn("text-xs whitespace-nowrap", c.align === "right" && "text-right", c.align === "center" && "text-center")}>
                        {c.format ? c.format(r[c.key], r) : (r[c.key] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
              {totalsRow && paged.length > 0 && (
                <TableRow className="bg-muted font-semibold">
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn("text-xs", c.align === "right" && "text-right", c.align === "center" && "text-center")}>
                      {totalsRow[c.key] ?? ""}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t text-xs flex-wrap gap-2">
          <span className="text-muted-foreground">
            Showing {paged.length === 0 ? 0 : (page - 1) * (pageSize === -1 ? sorted.length : pageSize) + 1} to{" "}
            {(page - 1) * (pageSize === -1 ? sorted.length : pageSize) + paged.length} of {sorted.length} entries
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="px-2">Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
