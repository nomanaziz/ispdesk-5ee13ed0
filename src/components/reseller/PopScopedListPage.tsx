import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPopScope } from "@/lib/popScope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface Props<T> {
  title: string;
  subtitle?: string;
  tableName: string;
  selectFields?: string;
  columns: Column<T>[];
  scopeColumn?: string;
  emptyText?: string;
  extraFilter?: (q: any) => any;
  rightSlot?: ReactNode;
  orderBy?: { column: string; ascending?: boolean };
}

export function PopScopedListPage<T extends { id: string }>({
  title,
  subtitle,
  tableName,
  selectFields = "*",
  columns,
  scopeColumn = "branch_id",
  emptyText = "কোনো তথ্য পাওয়া যায়নি",
  extraFilter,
  rightSlot,
  orderBy = { column: "created_at", ascending: false },
}: Props<T>) {
  const { customer } = usePortalAuth();
  const { branchId } = getPopScope(customer);

  const { data, isLoading } = useQuery({
    queryKey: [`pop-list-${tableName}`, branchId],
    enabled: !!branchId,
    queryFn: async () => {
      let q: any = supabase.from(tableName as any).select(selectFields).eq(scopeColumn, branchId!);
      if (extraFilter) q = extraFilter(q);
      q = q.order(orderBy.column, { ascending: !!orderBy.ascending });
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as T[];
    },
  });

  if (!branchId) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <h2 className="text-lg font-semibold">এই POP-এর জন্য branch assign করা নেই</h2>
          <p className="text-sm text-muted-foreground">
            Admin panel → POP Manager → এই POP-এ branch assign করুন।
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {rightSlot}
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {title}
            {data && <Badge variant="secondary">{data.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (data || []).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">{emptyText}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-border">
                <thead className="bg-primary/10">
                  <tr>
                    {columns.map((c) => (
                      <th key={c.key} className="text-left px-3 py-2 font-semibold border-r border-border last:border-r-0">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data || []).map((row, i) => (
                    <tr key={(row as any).id} className={i % 2 ? "bg-primary/5" : ""}>
                      {columns.map((c) => (
                        <td key={c.key} className="px-3 py-2 border-r border-b border-border last:border-r-0">
                          {c.render ? c.render(row) : ((row as any)[c.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PopScopedListPage;
