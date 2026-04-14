import ConfigCrudPage from "@/components/config/ConfigCrudPage";

export default function BillingStatuses() {
  return (
    <ConfigCrudPage
      title="বিলিং স্ট্যাটাস (Billing Status)"
      tableName="billing_statuses"
      queryKey="config-billing-statuses"
      fields={[
        { key: "name", label: "স্ট্যাটাসের নাম", required: true, placeholder: "e.g. Paid, Unpaid, Due" },
        { key: "color", label: "রঙ", type: "color" },
      ]}
    />
  );
}
