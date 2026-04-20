import PopScopedCrud from "@/components/reseller/PopScopedCrud";

export default function PopBoxes() {
  return (
    <PopScopedCrud
      title="Box"
      tableName="boxes"
      fields={[
        { key: "name", label: "Box Name", required: true },
        { key: "code", label: "Code" },
        { key: "description", label: "Description" },
      ]}
    />
  );
}
