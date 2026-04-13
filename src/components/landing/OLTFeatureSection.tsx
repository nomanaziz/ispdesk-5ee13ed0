import { Activity, Eye, Signal, Bell, GitBranch, Search } from "lucide-react";

const oltFeatures = [
  { icon: Eye, title: "Real-time ONU Status", desc: "Live monitoring of all ONU devices across your network with instant online/offline status updates." },
  { icon: Signal, title: "Optical Power Tracking", desc: "Track RX/TX power levels with color-coded thresholds. Detect signal degradation before outages occur." },
  { icon: Bell, title: "Fiber-Down Detection", desc: "Automatic alerts via Telegram, WhatsApp, or SMS when ONUs go offline or power drops below thresholds." },
  { icon: GitBranch, title: "ONU History Graphs", desc: "Visualize optical power trends over time. Identify fiber degradation patterns and plan proactive maintenance." },
  { icon: Search, title: "Smart ONU Search", desc: "Find any ONU instantly by MAC, serial number, PPPoE username, or description across all OLTs." },
  { icon: Activity, title: "Ping & Diagnostics", desc: "Built-in network diagnostic tools for latency testing, device health checks, and troubleshooting." },
];

const brands = ["Huawei", "BDCOM", "VSOL", "C-DATA", "DBC", "ZTE", "Fiberhome", "Nokia"];

export function OLTFeatureSection() {
  return (
    <section id="olt" className="py-20 bg-muted/10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-4">
            <Signal className="h-4 w-4" /> What Sets Us Apart
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built-in{" "}
            <span className="text-primary">OLT & Fiber Monitoring</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Unlike other ISP billing software, ISP Desk includes a full OLT monitoring engine — track every ONU, detect fiber issues, and get instant alerts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
          {oltFeatures.map((f) => (
            <div key={f.title} className="p-6 rounded-xl border border-border/60 bg-card/60 hover:border-primary/40 transition-all group shadow-md">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Supported Brands */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-5 uppercase tracking-widest">Supported OLT & Network Brands</p>
          <div className="flex flex-wrap justify-center gap-4">
            {brands.map((b) => (
              <div
                key={b}
                className="px-6 py-3 rounded-lg border border-border/60 bg-card/50 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all shadow-sm"
              >
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
