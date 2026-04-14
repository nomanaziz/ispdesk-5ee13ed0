import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Globe } from "lucide-react";

const GATEWAYS = [
  { id: "1", name: "bKash", type: "Mobile Banking", account: "01XXXXXXXXX", status: "active", showOnWebsite: true, color: "#E2136E" },
  { id: "2", name: "Nagad", type: "Mobile Banking", account: "01XXXXXXXXX", status: "active", showOnWebsite: true, color: "#F6921E" },
  { id: "3", name: "Rocket", type: "Mobile Banking", account: "01XXXXXXXXX", status: "inactive", showOnWebsite: false, color: "#8B2F8B" },
  { id: "4", name: "Bank Transfer", type: "Bank", account: "XXXX-XXXX-XXXX", status: "active", showOnWebsite: true, color: "#1E88E5" },
  { id: "5", name: "SSLCommerz", type: "Payment Gateway", account: "merchant_id", status: "active", showOnWebsite: false, color: "#2E7D32" },
];

export default function PaymentGateways() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payment Gateways</h1>
        <p className="text-sm text-muted-foreground">
          Manage payment methods for billing and website display
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gateway</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Account / Merchant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Globe className="h-3.5 w-3.5" /> Show on Website
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {GATEWAYS.map((gw) => (
                <TableRow key={gw.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: gw.color }}
                      />
                      <span className="font-medium">{gw.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{gw.type}</TableCell>
                  <TableCell className="font-mono text-sm">{gw.account}</TableCell>
                  <TableCell>
                    <Badge variant={gw.status === "active" ? "default" : "secondary"}>
                      {gw.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={gw.showOnWebsite} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
