import { Users, Globe, Headphones, Server } from "lucide-react";

const stats = [
  { icon: Users, value: "500+", label: "Happy ISPs" },
  { icon: Globe, value: "10+", label: "Districts Covered" },
  { icon: Server, value: "1,000+", label: "OLTs Monitored" },
  { icon: Headphones, value: "24/7", label: "Support Available" },
];

export function StatsSection() {
  return (
    <section className="py-16 border-y border-border/40 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl md:text-4xl font-extrabold text-foreground">{s.value}</div>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
