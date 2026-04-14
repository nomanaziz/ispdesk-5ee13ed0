import ConfigCrudPage from "@/components/config/ConfigCrudPage";

export default function ServiceTypes() {
  return (
    <ConfigCrudPage
      title="সার্ভিস টাইপ (Service Type)"
      tableName="service_types"
      queryKey="config-service-types"
      fields={[
        { key: "name", label: "সার্ভিস টাইপের নাম", required: true, placeholder: "e.g. Internet, IPTV, VoIP" },
        { key: "description", label: "বিবরণ" },
      ]}
    />
  );
}
