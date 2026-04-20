import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import PopScopedListPage from "@/components/reseller/PopScopedListPage";
import { Badge } from "@/components/ui/badge";

export default function PopEmployees() {
  return (
    <PopScopedListPage
      title="Employees"
      subtitle="এই POP-এর সমস্ত কর্মী"
      tableName="employees"
      selectFields="id, name, mobile, email, designation, department, salary, status, created_at"
      columns={[
        { key: "name", label: "Name" },
        { key: "mobile", label: "Mobile" },
        { key: "designation", label: "Designation" },
        { key: "department", label: "Department" },
        { key: "salary", label: "Salary", render: (r: any) => r.salary ? `৳ ${Number(r.salary).toLocaleString()}` : "—" },
        {
          key: "status",
          label: "Status",
          render: (r: any) => <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status || "active"}</Badge>,
        },
      ]}
      rightSlot={
        <Link to="/pop-admin/employees/add">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Add Employee</Button>
        </Link>
      }
    />
  );
}
