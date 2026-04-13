import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, BarChart3, Users, Wifi, Shield } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative pt-28 pb-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-emerald-500/5" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute top-40 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium">
              <Zap className="h-4 w-4" /> All-in-One ISP Management ERP
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Complete{" "}
              <span className="bg-gradient-to-r from-primary via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                ISP Management
              </span>{" "}
              & Billing ERP
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Manage your entire ISP operation from one platform — OLT & ONU monitoring, automated billing, CRM, HRM, inventory, accounting, multi-branch management, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <a href="#pricing">
                <Button size="lg" className="gap-2 text-base px-8">
                  See Pricing <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href="#contact">
                <Button size="lg" variant="outline" className="text-base px-8">
                  Request a Demo
                </Button>
              </a>
            </div>
            {/* Quick trust badges */}
            <div className="flex flex-wrap gap-4 pt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /> Secure & Reliable</span>
              <span className="flex items-center gap-1.5"><Wifi className="h-4 w-4 text-primary" /> Real-time Monitoring</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> Multi-Branch</span>
            </div>
          </div>

          {/* Right: Feature highlights mockup */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {[
              { icon: BarChart3, title: "Smart Dashboard", desc: "Real-time analytics & insights" },
              { icon: Wifi, title: "OLT Monitoring", desc: "ONU status & power tracking" },
              { icon: Users, title: "CRM & Billing", desc: "Automated invoicing & collection" },
              { icon: Shield, title: "Multi-Branch", desc: "Centralized control, branch access" },
            ].map((item) => (
              <div
                key={item.title}
                className="p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-lg hover:border-primary/40 transition-all"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center mb-3">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
