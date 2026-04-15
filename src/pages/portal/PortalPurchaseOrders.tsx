import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart } from "lucide-react";

const PortalPurchaseOrders = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No purchase orders yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Purchase orders will appear here when created.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalPurchaseOrders;
