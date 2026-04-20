import PopScopedCrud from "@/components/reseller/PopScopedCrud";

export default function PopZones() {
  return (
    <PopScopedCrud
      title="Zone"
      subtitle="POP-এর জন্য zone management"
      tableName="zones"
      fields={[
        { key: "name", label: "Zone Name", required: true },
        { key: "code", label: "Code" },
        { key: "description", label: "Description" },
      ]}
    />
  );
}
