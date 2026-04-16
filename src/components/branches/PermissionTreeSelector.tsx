import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { POP_MENU_GROUPS, buildDefaultPermissions, allPermissionKeys } from "@/lib/popPermissions";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Props {
  value: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
}

export default function PermissionTreeSelector({ value, onChange }: Props) {
  const [search] = useState("");

  const allKeys = allPermissionKeys();
  const allChecked = allKeys.every((k) => value[k]);
  const noneChecked = allKeys.every((k) => !value[k]);

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    for (const k of allKeys) next[k] = checked;
    onChange(next);
  };

  const toggleGroup = (groupKey: string, checked: boolean) => {
    const group = POP_MENU_GROUPS.find((g) => g.key === groupKey);
    if (!group) return;
    const next = { ...value };
    for (const item of group.items) next[item.key] = checked;
    onChange(next);
  };

  const toggleItem = (key: string, checked: boolean) => {
    onChange({ ...value, [key]: checked });
  };

  const resetDefaults = () => onChange(buildDefaultPermissions());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-3">
        <div className="flex items-center gap-3">
          <Switch
            checked={allChecked}
            onCheckedChange={(v) => toggleAll(!!v)}
          />
          <Label className="font-medium">
            {allChecked ? "সব মেনু নির্বাচিত" : noneChecked ? "কোনো মেনু নির্বাচিত নয়" : "আংশিক নির্বাচিত"}
          </Label>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={resetDefaults}>
          ডিফল্ট পারমিশন রিসেট
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {POP_MENU_GROUPS.map((group) => {
          const groupKeys = group.items.map((i) => i.key);
          const groupAll = groupKeys.every((k) => value[k]);
          const groupSome = groupKeys.some((k) => value[k]);
          return (
            <Card key={group.key} className="border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Checkbox
                    checked={groupAll ? true : groupSome ? "indeterminate" : false}
                    onCheckedChange={(v) => toggleGroup(group.key, !!v)}
                  />
                  <span>{group.label}</span>
                  {group.key === "payment_gateway" && (
                    <span className="text-xs text-destructive ml-auto">⚠ Admin only</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 gap-1.5">
                  {group.items.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
                    >
                      <Checkbox
                        checked={!!value[item.key]}
                        onCheckedChange={(v) => toggleItem(item.key, !!v)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
