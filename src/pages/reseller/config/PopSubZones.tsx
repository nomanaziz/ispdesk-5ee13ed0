import PopScopedCrud from "@/components/reseller/PopScopedCrud";

export default function PopSubZones() {
  return (
    <PopScopedCrud
      title="Sub Zone"
      tableName="sub_zones"
      fields={[
        { key: "name", label: "Sub Zone Name", required: true },
        { key: "code", label: "Code" },
      ]}
    />
  );
}
