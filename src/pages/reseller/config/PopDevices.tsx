import PopScopedListPage from "@/components/reseller/PopScopedListPage";
import { Badge } from "@/components/ui/badge";

export default function PopDevices() {
  return (
    <PopScopedListPage
      title="MikroTik Devices"
      subtitle="এই POP-এ assigned MikroTik devices"
      tableName="mikrotik_devices"
      selectFields="id, name, host, port, status, created_at"
      columns={[
        { key: "name", label: "Device Name" },
        { key: "host", label: "Host / IP" },
        { key: "port", label: "Port" },
        {
          key: "status",
          label: "Status",
          render: (r: any) => (
            <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status || "—"}</Badge>
          ),
        },
      ]}
    />
  );
}
