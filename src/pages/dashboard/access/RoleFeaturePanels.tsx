import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { BULK_ACTION_GROUPS, DASHBOARD_SECTIONS, FEATURE_SCOPE, type FeatureGroup } from "@/lib/featureRegistry";

interface Props {
  roleId: string;
  readOnly?: boolean;
}

type FeatureMap = Record<string, boolean>; // key = `${scope}|${scope_key}|${feature_key}`

function makeKey(scope: string, scopeKey: string, featureKey: string) {
  return `${scope}|${scopeKey}|${featureKey}`;
}

export default function RoleFeaturePanels({ roleId, readOnly }: Props) {
  const [features, setFeatures] = useState<FeatureMap>({});
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_role_features" as any)
      .select("scope, scope_key, feature_key, enabled")
      .eq("role_id", roleId);
    if (error) {
      toast.error(error.message);
    } else {
      const map: FeatureMap = {};
      (data as any[] || []).forEach((r) => {
        map[makeKey(r.scope, r.scope_key, r.feature_key)] = r.enabled;
      });
      setFeatures(map);
    }
    setLoading(false);
  };

  useEffect(() => { if (roleId) load(); }, [roleId]);

  const toggle = async (scope: string, scopeKey: string, featureKey: string, value: boolean) => {
    if (readOnly) return;
    const k = makeKey(scope, scopeKey, featureKey);
    setFeatures((p) => ({ ...p, [k]: value })); // optimistic
    const { error } = await supabase
      .from("app_role_features" as any)
      .upsert(
        { role_id: roleId, scope, scope_key: scopeKey, feature_key: featureKey, enabled: value, updated_at: new Date().toISOString() },
        { onConflict: "role_id,scope,scope_key,feature_key" }
      );
    if (error) {
      toast.error(error.message);
      setFeatures((p) => ({ ...p, [k]: !value }));
    }
  };

  const renderGroup = (scope: string, group: FeatureGroup) => {
    const groupId = `${scope}|${group.scopeKey}`;
    const isOpen = openGroups[groupId] ?? false;
    const enabledCount = group.items.filter(
      (i) => features[makeKey(scope, group.scopeKey, i.key)] === true
    ).length;
    // Determine: if no rows exist for this group at all → "ডিফল্ট (সব চালু)"
    const hasAnyRow = group.items.some((i) => makeKey(scope, group.scopeKey, i.key) in features);

    return (
      <div key={groupId} className="border rounded-md">
        <button
          onClick={() => setOpenGroups((p) => ({ ...p, [groupId]: !isOpen }))}
          className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-sm"
        >
          <div className="flex items-center gap-2">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium">{group.label}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {hasAnyRow ? `${enabledCount}/${group.items.length} চালু` : "ডিফল্ট (সব চালু)"}
          </span>
        </button>
        {isOpen && (
          <div className="border-t p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.items.map((item) => {
              const k = makeKey(scope, group.scopeKey, item.key);
              const checked = k in features ? features[k] : true; // default on
              return (
                <label key={item.key} className="flex items-center justify-between gap-2 border rounded-md p-2">
                  <span className="text-sm truncate">{item.label}</span>
                  <Switch
                    checked={checked}
                    disabled={readOnly}
                    onCheckedChange={(c) => toggle(scope, group.scopeKey, item.key, !!c)}
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>;
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Bulk Action Permissions */}
      <Card className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-sm">কমন বাল্ক অ্যাকশন পারমিশন</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            প্রতিটি লিস্ট পেজের উপরের bulk button (Excel/PDF/SMS/Sync/বন্ধ/স্ট্যাটাস) এই রোলের জন্য চালু/বন্ধ
          </p>
        </div>
        <div className="space-y-2">
          {BULK_ACTION_GROUPS.map((g) => renderGroup(FEATURE_SCOPE.BULK, g))}
        </div>
      </Card>

      {/* Dashboard Widget Permissions */}
      <Card className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-sm">ড্যাশবোর্ড উইজেট পারমিশন</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            ড্যাশবোর্ডের কোন widget এই রোল দেখতে পারবে নির্বাচন করুন (সংবেদনশীল ডাটা যেমন: কোম্পানি আয় ইত্যাদি)
          </p>
        </div>
        <div className="space-y-2">
          {DASHBOARD_SECTIONS.map((g) => renderGroup(FEATURE_SCOPE.WIDGET, g))}
        </div>
      </Card>
    </div>
  );
}
