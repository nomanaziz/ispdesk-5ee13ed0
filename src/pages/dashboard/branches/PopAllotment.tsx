import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MapPin, Save, Search, Plus, Star } from "lucide-react";

interface Props {
  popId: string;
}

export default function PopAllotment({ popId }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [showAddDistrict, setShowAddDistrict] = useState(false);
  // local edit state: districtId -> Set of upazilaIds (empty Set => "all upazilas")
  const [draft, setDraft] = useState<Record<string, Set<string>>>({});

  // POP profile (for default district/upazila)
  const { data: pop } = useQuery({
    queryKey: ["pop-profile-allotment", popId],
    enabled: !!popId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_managers")
        .select("id, district_id, upazila_id, name")
        .eq("id", popId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const defaultDistrictId = pop?.district_id || null;
  const defaultUpazilaId = pop?.upazila_id || null;

  const { data: districts, isLoading: ldDistricts } = useQuery({
    queryKey: ["all-districts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("districts")
        .select("id, name, code")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: upazilasByDistrict } = useQuery({
    queryKey: ["upazilas-by-district", selectedDistrict],
    enabled: !!selectedDistrict,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("upazilas")
        .select("id, name")
        .eq("district_id", selectedDistrict!)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: existing, isLoading: ldExisting } = useQuery({
    queryKey: ["pop-allotment", popId],
    enabled: !!popId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pop_district_assignments")
        .select("district_id, upazila_ids")
        .eq("branch_manager_id", popId);
      if (error) throw error;
      return data || [];
    },
  });

  // Hydrate draft from existing OR seed with POP's default district/upazila
  useEffect(() => {
    if (!existing) return;
    const map: Record<string, Set<string>> = {};
    for (const row of existing) {
      map[row.district_id] = new Set(row.upazila_ids || []);
    }
    // Seed default if no extra allotment exists
    if (Object.keys(map).length === 0 && defaultDistrictId) {
      map[defaultDistrictId] = new Set(defaultUpazilaId ? [defaultUpazilaId] : []);
      setSelectedDistrict(defaultDistrictId);
    }
    setDraft(map);
  }, [existing, defaultDistrictId, defaultUpazilaId]);

  const filteredDistricts = useMemo(() => {
    if (!districts) return [];
    const q = search.trim().toLowerCase();
    let list = districts as any[];
    // By default only show: enabled districts + default district
    if (!showAddDistrict && !q) {
      list = list.filter((d) => draft[d.id] || d.id === defaultDistrictId);
    }
    if (q) {
      list = list.filter(
        (d: any) => d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [districts, search, showAddDistrict, draft, defaultDistrictId]);

  const toggleDistrict = (id: string, checked: boolean) => {
    if (id === defaultDistrictId && !checked) {
      toast.warning("POP profile-এর own district uncheck করা যাবে না");
      return;
    }
    setDraft((prev) => {
      const next = { ...prev };
      if (checked) {
        if (!next[id]) next[id] = new Set();
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const toggleUpazila = (districtId: string, upazilaId: string, checked: boolean) => {
    setDraft((prev) => {
      const next = { ...prev };
      const set = new Set(next[districtId] || []);
      if (checked) set.add(upazilaId);
      else set.delete(upazilaId);
      next[districtId] = set;
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error: delErr } = await supabase
        .from("pop_district_assignments")
        .delete()
        .eq("branch_manager_id", popId);
      if (delErr) throw delErr;

      const rows = Object.entries(draft).map(([district_id, upazilaSet]) => ({
        branch_manager_id: popId,
        district_id,
        upazila_ids: Array.from(upazilaSet),
      }));
      if (rows.length === 0) return;
      const { error } = await supabase.from("pop_district_assignments").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("District/Upazila allotment সংরক্ষিত হয়েছে");
      qc.invalidateQueries({ queryKey: ["pop-allotment", popId] });
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });

  const totalDistricts = Object.keys(draft).length;
  const totalUpazilas = Object.values(draft).reduce((s, set) => s + set.size, 0);

  if (ldDistricts || ldExisting) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/80">
        <strong>Auto-prefill:</strong> POP profile-এ যে District ও Upazila set আছে সেটাই default allotment।
        শুধু POP-এর scope বাড়াতে চাইলে নিচের <em>"Add another District"</em> button থেকে নতুন district/upazila add করুন।
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">District / Upazila Allotment</h3>
            <p className="text-xs text-muted-foreground">
              এই POP যে এলাকাগুলোতে কাজ করতে পারবে
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{totalDistricts} জেলা</Badge>
          <Badge variant="secondary">{totalUpazilas} উপজেলা</Badge>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Allotment"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* District list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Districts (জেলা)</span>
              <Badge variant="outline">{filteredDistricts.length}</Badge>
            </CardTitle>
            <div className="flex gap-2 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search district..."
                  className="pl-8 h-9"
                />
              </div>
              <Button
                type="button"
                variant={showAddDistrict ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAddDistrict((v) => !v)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {showAddDistrict ? "Done" : "Add another"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-3">
              <div className="space-y-1">
                {filteredDistricts.map((d: any) => {
                  const checked = !!draft[d.id];
                  const isActive = selectedDistrict === d.id;
                  const isDefault = d.id === defaultDistrictId;
                  return (
                    <div
                      key={d.id}
                      className={`flex items-center gap-2 px-2 py-2 rounded hover:bg-muted cursor-pointer ${
                        isActive ? "bg-primary/10" : ""
                      }`}
                      onClick={() => setSelectedDistrict(d.id)}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={isDefault}
                        onCheckedChange={(c) => toggleDistrict(d.id, !!c)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="flex-1 text-sm flex items-center gap-1.5">
                        {d.name}
                        {isDefault && (
                          <Badge variant="outline" className="text-[10px] gap-1 px-1.5">
                            <Star className="h-2.5 w-2.5" /> Default
                          </Badge>
                        )}
                      </span>
                      {checked && draft[d.id]?.size > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {draft[d.id].size}
                        </Badge>
                      )}
                    </div>
                  );
                })}
                {filteredDistricts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    {showAddDistrict ? "কোনো district পাওয়া যায়নি" : '"Add another" button click করুন নতুন district যোগ করতে'}
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Upazila list of selected district */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>
                Upazilas ({selectedDistrict
                  ? districts?.find((x: any) => x.id === selectedDistrict)?.name
                  : "জেলা select করুন"})
              </span>
              {selectedDistrict && upazilasByDistrict && (
                <Badge variant="outline">{upazilasByDistrict.length}</Badge>
              )}
            </CardTitle>
            {selectedDistrict && draft[selectedDistrict] && (
              <p className="text-xs text-muted-foreground mt-1">
                কোনো upazila select না করলে = পুরো জেলায় access
              </p>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-3">
              {!selectedDistrict ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  বাঁ পাশ থেকে একটা জেলা select করুন
                </p>
              ) : !draft[selectedDistrict] ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  আগে এই জেলাকে enable করুন (left-এ checkbox click)
                </p>
              ) : (
                <div className="space-y-1">
                  {(upazilasByDistrict || []).map((u: any) => {
                    const isChecked = draft[selectedDistrict]?.has(u.id);
                    const isDefaultU = u.id === defaultUpazilaId && selectedDistrict === defaultDistrictId;
                    return (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(c) => toggleUpazila(selectedDistrict, u.id, !!c)}
                        />
                        <span className="flex-1 text-sm flex items-center gap-1.5">
                          {u.name}
                          {isDefaultU && (
                            <Badge variant="outline" className="text-[10px] gap-1 px-1.5">
                              <Star className="h-2.5 w-2.5" /> Default
                            </Badge>
                          )}
                        </span>
                      </label>
                    );
                  })}
                  {(!upazilasByDistrict || upazilasByDistrict.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      এই জেলায় কোনো upazila নেই
                    </p>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
