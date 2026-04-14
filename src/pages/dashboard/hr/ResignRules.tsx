import ConfigCrudPage from "@/components/config/ConfigCrudPage";

export default function ResignRules() {
  return (
    <ConfigCrudPage
      title="পদত্যাগের নিয়ম"
      tableName="resign_rules"
      queryKey="resign_rules"
      fields={[
        { key: "name", label: "নাম", required: true, placeholder: "নিয়মের নাম" },
        { key: "notice_period_days", label: "নোটিশ পিরিয়ড (দিন)", placeholder: "30" },
      ]}
      showStatusTabs
    />
  );
}
