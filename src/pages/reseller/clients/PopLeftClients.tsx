import PopScopedListPage from "@/components/reseller/PopScopedListPage";
import { Badge } from "@/components/ui/badge";

export default function PopLeftClients() {
  return (
    <PopScopedListPage
      title="Left Clients"
      subtitle="যারা সেবা ত্যাগ করেছেন"
      tableName="clients"
      selectFields="id, name, username, mobile, status, updated_at, expire_date"
      extraFilter={(q) => q.in("status", ["left", "inactive"])}
      columns={[
        { key: "username", label: "PPP ID" },
        { key: "name", label: "Name" },
        { key: "mobile", label: "Mobile" },
        { key: "expire_date", label: "Last Expire" },
        { key: "status", label: "Status", render: (r: any) => <Badge variant="secondary">{r.status}</Badge> },
      ]}
      orderBy={{ column: "updated_at", ascending: false }}
    />
  );
}
