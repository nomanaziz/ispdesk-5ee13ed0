import PopScopedCrud from "@/components/reseller/PopScopedCrud";

export default function PopDesignations() {
  return (
    <PopScopedCrud
      title="Designation"
      tableName="positions"
      fields={[{ key: "name", label: "Designation Name", required: true }]}
    />
  );
}
