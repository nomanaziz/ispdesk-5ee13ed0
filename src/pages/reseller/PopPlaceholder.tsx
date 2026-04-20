import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function PopPlaceholder({ title, message }: { title: string; message?: string }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">POP-scoped {title}</p>
      </div>
      <Card>
        <CardContent className="p-12 text-center space-y-3">
          <Construction className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-semibold">শীঘ্রই আসছে</h2>
          <p className="text-sm text-muted-foreground">
            {message || "এই module Phase 2-এ build হবে। বর্তমানে শুধু sidebar এবং structure ready।"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
