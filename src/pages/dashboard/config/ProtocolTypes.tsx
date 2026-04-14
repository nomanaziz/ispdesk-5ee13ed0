import ConfigCrudPage from "@/components/config/ConfigCrudPage";

export default function ProtocolTypes() {
  return (
    <ConfigCrudPage
      title="প্রোটোকল টাইপ (Protocol Type)"
      tableName="protocol_types"
      queryKey="config-protocol-types"
      fields={[
        { key: "name", label: "প্রোটোকল টাইপের নাম", required: true, placeholder: "e.g. PPPoE, IPoE, Static" },
      ]}
    />
  );
}
