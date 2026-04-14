import ConfigCrudPage from "@/components/config/ConfigCrudPage";

export default function Positions() {
  return (
    <ConfigCrudPage
      title="পদবী"
      tableName="positions"
      queryKey="positions"
      fields={[
        { key: "name", label: "নাম", required: true, placeholder: "পদবীর নাম" },
      ]}
      showStatusTabs
    />
  );
}
