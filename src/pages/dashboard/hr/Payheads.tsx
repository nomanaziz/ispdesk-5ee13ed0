import ConfigCrudPage from "@/components/config/ConfigCrudPage";

export default function Payheads() {
  return (
    <ConfigCrudPage
      title="পে-হেড"
      tableName="payheads"
      queryKey="payheads"
      fields={[
        { key: "name", label: "পে-হেড নাম", required: true, placeholder: "e.g. Basic Salary, Late Fee, Bonus" },
        {
          key: "type",
          label: "পে-হেড ধরন",
          type: "select",
          required: true,
          options: [
            { value: "allowance", label: "Addition (ভাতা)" },
            { value: "deduction", label: "Deduction (কর্তন)" },
          ],
        },
        { key: "amount", label: "পরিমাণ", placeholder: "0" },
        { key: "description", label: "বিবরণ", placeholder: "পে-হেডের বিবরণ (ঐচ্ছিক)" },
      ]}
      showStatusTabs
    />
  );
}
