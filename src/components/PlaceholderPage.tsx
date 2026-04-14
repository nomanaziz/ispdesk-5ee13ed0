import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  module?: string;
}

export function PlaceholderPage({ title, module }: PlaceholderPageProps) {
  return (
    <div>
      <div className="mb-6">
        {module && <p className="text-sm text-muted-foreground mb-1">{module}</p>}
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Construction className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
          <p className="text-muted-foreground text-sm max-w-md">
            This module is under development. Full functionality will be available soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
