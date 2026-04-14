import ConfigCrudPage from "@/components/config/ConfigCrudPage";

export default function Departments() {
  return (
    <ConfigCrudPage
      title="ডিপার্টমেন্ট"
      tableName="departments"
      queryKey="departments"
      fields={[
        { key: "name", label: "নাম", required: true, placeholder: "ডিপার্টমেন্টের নাম" },
      ]}
      showStatusTabs
    />
  );
}
