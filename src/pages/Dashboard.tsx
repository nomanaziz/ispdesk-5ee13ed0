import { Card, CardContent } from "@/components/ui/card";

const Dashboard = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Card className="max-w-md w-full">
      <CardContent className="p-8 text-center space-y-2">
        <h1 className="text-2xl font-bold">ERP Dashboard</h1>
        <p className="text-muted-foreground">Coming soon — ERP modules will appear here.</p>
      </CardContent>
    </Card>
  </div>
);

export default Dashboard;
