import PopScopedListPage from "@/components/reseller/PopScopedListPage";
import { Badge } from "@/components/ui/badge";

export default function PopScheduler() {
  return (
    <PopScopedListPage
      title="Scheduler"
      subtitle="ক্লায়েন্টের নির্ধারিত স্ট্যাটাস পরিবর্তন"
      tableName="client_schedulers"
      selectFields="id, client_id, action, scheduled_at, status, created_at"
      columns={[
        { key: "client_id", label: "Client ID" },
        { key: "action", label: "Action", render: (r: any) => <Badge variant="outline">{r.action}</Badge> },
        { key: "scheduled_at", label: "Scheduled At" },
        { key: "status", label: "Status", render: (r: any) => <Badge>{r.status}</Badge> },
      ]}
      emptyText="কোনো scheduled কাজ নেই"
    />
  );
}
