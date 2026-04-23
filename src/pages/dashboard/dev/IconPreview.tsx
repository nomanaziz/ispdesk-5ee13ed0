import { useState } from "react";
import { HishabeeIcon, HISHABEE_ICON_NAMES } from "@/components/icons/HishabeeIcon";
import { Icons8Icon, ICONS8_NAMES } from "@/components/icons/Icons8Icon";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

/**
 * Dev-only browser for every available icon set.
 * Visit /dashboard/_icons.
 * Click any tile to copy the icon's name to clipboard.
 */
export default function IconPreview() {
  const [q, setQ] = useState("");
  const norm = q.trim().toLowerCase();
  const filterFn = (n: string) => n.toLowerCase().includes(norm);

  const icons8 = ICONS8_NAMES.filter(filterFn);
  const hishabee = HISHABEE_ICON_NAMES.filter(filterFn);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Icon Library</h1>
        <p className="text-sm text-muted-foreground">
          {ICONS8_NAMES.length} Icons8 + {HISHABEE_ICON_NAMES.length} Hishabee icons available.
          Click any tile to copy its name.
        </p>
      </div>

      <Input
        placeholder="Search icons..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm"
      />

      <Tabs defaultValue="icons8">
        <TabsList>
          <TabsTrigger value="icons8">Icons8 ({icons8.length})</TabsTrigger>
          <TabsTrigger value="hishabee">Hishabee ({hishabee.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="icons8" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {icons8.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(name);
                  toast.success(`Copied: ${name}`);
                }}
                className="group flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/40 transition-all"
              >
                <Icons8Icon name={name} size={56} />
                <span className="text-xs font-mono text-foreground break-all text-center">{name}</span>
              </button>
            ))}
            {icons8.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-12">No Icons8 match "{q}"</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="hishabee" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {hishabee.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(name);
                  toast.success(`Copied: ${name}`);
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/40 transition-all"
              >
                <HishabeeIcon name={name} size={56} />
                <span className="text-xs font-mono text-foreground break-all text-center">{name}</span>
              </button>
            ))}
            {hishabee.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-12">No Hishabee match "{q}"</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
