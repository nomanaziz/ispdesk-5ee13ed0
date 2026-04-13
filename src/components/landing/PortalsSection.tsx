import { Monitor, UserCog, Globe } from "lucide-react";

const portals = [
  {
    icon: Monitor,
    title: "Admin Portal",
    desc: "Full control over your ISP operations — manage clients, billing, devices, HR, inventory, and accounting from a powerful dashboard.",
    color: "text-primary",
  },
  {
    icon: UserCog,
    title: "Employee Portal",
    desc: "Employees can view tasks, apply for leave, check payslips, manage assigned tickets, and access role-specific features.",
    color: "text-emerald-500",
  },
  {
    icon: Globe,
    title: "Client Portal",
    desc: "Clients can view their connection status, pay bills online, raise support tickets, and manage their account details.",
    color: "text-orange-500",
  },
];

export function PortalsSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Accessible <span className="text-primary">Web Portals</span> for Everyone
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Dedicated portals for admins, employees, and clients — accessible from any device, anywhere.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {portals.map((p) => (
            <div key={p.title} className="text-center p-8 rounded-xl border border-border/60 bg-card/60 shadow-md hover:border-primary/40 transition-all">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                <p.icon className={`h-8 w-8 ${p.color}`} />
              </div>
              <h3 className="font-bold text-xl mb-3">{p.title}</h3>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
