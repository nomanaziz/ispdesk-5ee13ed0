import PopScopedCrud from "@/components/reseller/PopScopedCrud";

export default function PopDesignations() {
  return (
    <PopScopedCrud
      title="Designation"
      subtitle="POP-এর জন্য পদবী management"
      tableName="designations"
      fields={[{ key: "name", label: "Designation Name", required: true }]}
    />
  );
}
