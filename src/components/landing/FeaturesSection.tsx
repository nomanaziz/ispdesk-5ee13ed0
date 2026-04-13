import {
  LayoutDashboard, Settings, GitBranch, Users, ShoppingCart, Wifi,
  UserCog, Calculator, MessageSquare, FileText, Lock, Sparkles,
  Handshake, Package, CreditCard
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const modules = [
  {
    icon: LayoutDashboard, title: "Informative Dashboard",
    bullets: ["Real-time statistics & KPIs", "Client/revenue overview", "Quick action shortcuts"],
  },
  {
    icon: Settings, title: "Configuration",
    bullets: ["Zone, Sub Zone, Box management", "Packages, Protocols, Connection types", "District & Upazila setup"],
  },
  {
    icon: GitBranch, title: "Multi-Branch Management",
    bullets: ["Branch-level access control", "Branch managers & funding", "PGW payments & settlements"],
  },
  {
    icon: Users, title: "CRM & Client Management",
    bullets: ["Client onboarding & requests", "Billing automation & collection", "Support ticketing system"],
  },
  {
    icon: ShoppingCart, title: "Purchase & Inventory",
    bullets: ["Vendor & requisition management", "Stock tracking & store locations", "Purchase bills & item categories"],
  },
  {
    icon: Wifi, title: "Network & OLT Monitoring",
    bullets: ["Real-time ONU status tracking", "Optical power & fiber-down alerts", "Network diagrams & POP maps"],
  },
  {
    icon: UserCog, title: "HRM & Payroll",
    bullets: ["Employee lifecycle management", "Salary sheets & payslips", "Leave & resignation workflows"],
  },
  {
    icon: Calculator, title: "Finance & Accounting",
    bullets: ["Chart of accounts & journals", "Income/expense tracking", "Financial reports & profit analysis"],
  },
  {
    icon: MessageSquare, title: "SMS & Notifications",
    bullets: ["Bulk & individual SMS", "SMS templates & groups", "Gateway configuration"],
  },
  {
    icon: FileText, title: "Reports & Analytics",
    bullets: ["Bill collection & BTRC reports", "Customer & financial analytics", "Discount & processing fee reports"],
  },
  {
    icon: Lock, title: "System & ACL",
    bullets: ["User management & roles", "Permission-based access control", "System-wide settings"],
  },
  {
    icon: Sparkles, title: "VAS (Value Added Services)",
    bullets: ["VAS configuration & pricing", "Transaction tracking", "Revenue analytics"],
  },
  {
    icon: Handshake, title: "Reseller / Affiliate",
    bullets: ["Partner registration & management", "Commission rate setup", "Earnings tracking"],
  },
  {
    icon: Package, title: "Asset Management",
    bullets: ["Asset tracking & assignment", "Destroyed items log", "Category-wise reports"],
  },
  {
    icon: CreditCard, title: "Payment Gateways",
    bullets: ["PGW integration support", "Settlement tracking", "Payment reconciliation"],
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            All Modules You Need to{" "}
            <span className="text-primary">Run Your ISP</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A comprehensive ERP platform with 15+ integrated modules — from client onboarding to financial reporting.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((m) => (
            <Card key={m.title} className="border border-border/60 bg-card/60 hover:border-primary/50 hover:bg-card/80 transition-all group shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <m.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-2">{m.title}</h3>
                    <ul className="space-y-1">
                      {m.bullets.map((b, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                          <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
