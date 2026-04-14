import ConfigCrudPage from "@/components/config/ConfigCrudPage";
import { Badge } from "@/components/ui/badge";

export default function Payheads() {
  return (
    <ConfigCrudPage
      title="পে-হেড"
      tableName="payheads"
      queryKey="payheads"
      fields={[
        { key: "name", label: "নাম", required: true, placeholder: "পে-হেডের নাম" },
        {
          key: "type",
          label: "ধরন",
          type: "select",
          required: true,
          options: [
            { value: "allowance", label: "ভাতা (Allowance)" },
            { value: "deduction", label: "কর্তন (Deduction)" },
          ],
        },
        { key: "amount", label: "পরিমাণ", placeholder: "0" },
      ]}
      extraColumns={[
        {
          key: "is_percentage",
          label: "শতাংশ?",
          render: (row: any) => (
            <Badge variant={row.is_percentage ? "default" : "secondary"}>
              {row.is_percentage ? "হ্যাঁ" : "না"}
            </Badge>
          ),
        },
      ]}
      showStatusTabs
    />
  );
}
