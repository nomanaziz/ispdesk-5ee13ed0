import ConfigCrudPage from "@/components/config/ConfigCrudPage";

export default function ConnectionTypes() {
  return (
    <ConfigCrudPage
      title="কানেকশন টাইপ (Connection Type)"
      tableName="connection_types_config"
      queryKey="config-connection-types"
      fields={[
        { key: "name", label: "কানেকশন টাইপের নাম", required: true, placeholder: "e.g. Fiber, Wireless" },
      ]}
    />
  );
}
