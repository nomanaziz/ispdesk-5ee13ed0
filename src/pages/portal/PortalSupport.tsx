import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeadphonesIcon } from "lucide-react";

const PortalSupport = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Support Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <HeadphonesIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No support tickets</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Support ticket system coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalSupport;
