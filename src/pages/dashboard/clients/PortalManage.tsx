import { useState } from "react";
import { cn } from "@/lib/utils";
import { Clapperboard, Newspaper, Rocket, Users } from "lucide-react";
import MediaServersTab from "@/components/portal-manage/MediaServersTab";
import NewsEventsTab from "@/components/portal-manage/NewsEventsTab";
import SpeedTestTab from "@/components/portal-manage/SpeedTestTab";
import RegisteredClientsTab from "@/components/portal-manage/RegisteredClientsTab";
import DefaultPasswordSettings from "@/components/portal-manage/DefaultPasswordSettings";

const TABS = [
  { key: "media", label: "Media Servers", icon: Clapperboard },
  { key: "news", label: "News & Events", icon: Newspaper },
  { key: "speed", label: "Speed Test", icon: Rocket },
  { key: "clients", label: "Registered Clients", icon: Users },
];

export default function PortalManage() {
  const [active, setActive] = useState("clients");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Portal Manager</h1>
        <p className="text-sm text-muted-foreground">Manage what your clients see and do in the customer portal</p>
      </div>

      <DefaultPasswordSettings />

      <div className="flex gap-4">
        <aside className="w-56 shrink-0 border rounded-lg p-2 space-y-1 h-fit sticky top-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
                  active === t.key ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </aside>

        <div className="flex-1 min-w-0">
          {active === "media" && <MediaServersTab />}
          {active === "news" && <NewsEventsTab />}
          {active === "speed" && <SpeedTestTab />}
          {active === "clients" && <RegisteredClientsTab />}
        </div>
      </div>
    </div>
  );
}
