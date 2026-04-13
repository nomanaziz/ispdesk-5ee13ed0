import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface Package {
  id: string;
  name: string;
  price: number;
  price_label: string;
  olt_range: string | null;
  features: string[];
  is_popular: boolean;
  sort_order: number;
}

export function PricingSection() {
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    supabase
      .from("packages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setPackages(data as Package[]);
      });
  }, []);

  return (
    <section id="pricing" className="py-20 bg-muted/10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, <span className="text-primary">Transparent</span> Pricing
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            SaaS-based monthly subscription. Choose the plan that fits your ISP. All plans include core ERP + OLT monitoring features.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`relative border border-border/60 bg-card/60 flex flex-col shadow-md ${
                pkg.is_popular ? "border-primary ring-2 ring-primary/20 scale-105 shadow-lg" : ""
              }`}
            >
              {pkg.is_popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                <div className="text-2xl font-bold mt-2">{pkg.price_label}</div>
                {pkg.olt_range && (
                  <p className="text-xs text-muted-foreground">{pkg.olt_range}</p>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2 flex-1 mb-4">
                  {pkg.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="#contact">
                  <Button className="w-full" variant={pkg.is_popular ? "default" : "outline"}>
                    {pkg.price === 0 ? "Contact Us" : "Get Started"}
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Custom solution CTA */}
        <div className="text-center mt-10">
          <p className="text-muted-foreground mb-3">Need a custom solution or enterprise plan?</p>
          <a href="#contact">
            <Button variant="outline" size="lg">Contact Us for Custom Pricing</Button>
          </a>
        </div>
      </div>
    </section>
  );
}
