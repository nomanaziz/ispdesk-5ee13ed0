import PopScopedListPage from "@/components/reseller/PopScopedListPage";
import { Badge } from "@/components/ui/badge";

export default function PopBillingClient() {
  return (
    <PopScopedListPage
      title="Billing Clients"
      subtitle="বিল প্রস্তুতির জন্য eligible ক্লায়েন্ট"
      tableName="clients"
      selectFields="id, name, username, mobile, monthly_bill, status, expire_date"
      extraFilter={(q) => q.in("status", ["active", "online", "offline", "disabled"])}
      columns={[
        { key: "username", label: "PPP ID" },
        { key: "name", label: "Name" },
        { key: "mobile", label: "Mobile" },
        { key: "monthly_bill", label: "Bill", render: (r: any) => `৳ ${Number(r.monthly_bill || 0).toLocaleString()}` },
        { key: "expire_date", label: "Expire" },
        { key: "status", label: "Status", render: (r: any) => <Badge>{r.status}</Badge> },
      ]}
    />
  );
}
