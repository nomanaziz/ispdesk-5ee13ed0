import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import PopScopedListPage from "@/components/reseller/PopScopedListPage";
import { Badge } from "@/components/ui/badge";

export default function PopClientList() {
  return (
    <PopScopedListPage
      title="Active Clients"
      subtitle="এই POP-এর সক্রিয় ক্লায়েন্ট তালিকা"
      tableName="clients"
      selectFields="id, name, username, mobile, address, monthly_bill, status, expire_date, created_at"
      extraFilter={(q) => q.in("status", ["active", "online", "offline"]).eq("owner_scope", "pop")}
      columns={[
        { key: "username", label: "PPP ID" },
        { key: "name", label: "Name" },
        { key: "mobile", label: "Mobile" },
        { key: "monthly_bill", label: "Monthly Bill", render: (r: any) => r.monthly_bill ? `৳ ${Number(r.monthly_bill).toLocaleString()}` : "—" },
        { key: "expire_date", label: "Expire" },
        { key: "status", label: "Status", render: (r: any) => <Badge>{r.status}</Badge> },
      ]}
      rightSlot={
        <Link to="/pop-admin/clients/add">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Add Client</Button>
        </Link>
      }
    />
  );
}
