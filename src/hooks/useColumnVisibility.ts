import { useCallback, useEffect, useMemo, useState } from "react";

export interface ColumnDef {
  key: string;
  label: string;
  defaultVisible?: boolean;
  /** If true, user cannot hide this column (e.g. row actions, primary id). */
  required?: boolean;
}

export function useColumnVisibility(storageKey: string, columns: ColumnDef[]) {
  const fullKey = `cols:${storageKey}`;

  const initial = useMemo(() => {
    const map: Record<string, boolean> = {};
    columns.forEach((c) => (map[c.key] = c.defaultVisible !== false));
    return map;
  }, [columns]);

  const [visible, setVisible] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const saved = window.localStorage.getItem(fullKey);
      if (!saved) return initial;
      const parsed = JSON.parse(saved) as Record<string, boolean>;
      // Merge with current column set (handles new/removed columns)
      const merged = { ...initial };
      for (const c of columns) {
        if (c.key in parsed) merged[c.key] = !!parsed[c.key];
        if (c.required) merged[c.key] = true;
      }
      return merged;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(fullKey, JSON.stringify(visible));
    } catch {
      /* ignore */
    }
  }, [fullKey, visible]);

  const toggle = useCallback(
    (key: string) =>
      setVisible((p) => {
        const col = columns.find((c) => c.key === key);
        if (col?.required) return p;
        return { ...p, [key]: !p[key] };
      }),
    [columns],
  );

  const reset = useCallback(() => setVisible(initial), [initial]);

  const isVisible = useCallback((key: string) => visible[key] !== false, [visible]);

  return { visible, toggle, reset, isVisible, columns };
}
