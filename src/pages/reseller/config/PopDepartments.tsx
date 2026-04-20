import PopScopedCrud from "@/components/reseller/PopScopedCrud";

export default function PopDepartments() {
  return (
    <PopScopedCrud
      title="Department"
      tableName="departments"
      fields={[{ key: "name", label: "Department Name", required: true }]}
    />
  );
}
