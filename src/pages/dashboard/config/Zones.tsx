import ConfigCrudPage from "@/components/config/ConfigCrudPage";

export default function Zones() {
  return (
    <ConfigCrudPage
      title="জোন (Zone)"
      tableName="zones"
      queryKey="config-zones"
      fields={[
        { key: "name", label: "জোনের নাম", required: true },
        { key: "code", label: "কোড" },
        { key: "description", label: "বিবরণ" },
      ]}
    />
  );
}
