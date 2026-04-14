import ConfigCrudPage from "@/components/config/ConfigCrudPage";

export default function ClientTypes() {
  return (
    <ConfigCrudPage
      title="ক্লায়েন্ট টাইপ (Client Type)"
      tableName="client_types"
      queryKey="config-client-types"
      fields={[
        { key: "name", label: "ক্লায়েন্ট টাইপের নাম", required: true, placeholder: "e.g. Home, Corporate" },
      ]}
    />
  );
}
