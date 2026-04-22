import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import PopScopedListPage from "@/components/reseller/PopScopedListPage";
import { Badge } from "@/components/ui/badge";

export default function PopEmployees() {
  return (
    <PopScopedListPage
      title="Employees"
      subtitle="এই POP-এর সমস্ত কর্মী"
      tableName="employees"
      selectFields="id, employee_id, name, phone, personal_phone, email, salary, status, has_user_access, user_username, created_at, departments(name), positions(name)"
      columns={[
        { key: "employee_id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "phone", label: "Phone", render: (r: any) => r.personal_phone || r.phone || "—" },
        { key: "designation", label: "Designation", render: (r: any) => r.positions?.name || "—" },
        { key: "department", label: "Department", render: (r: any) => r.departments?.name || "—" },
        { key: "salary", label: "Salary", render: (r: any) => r.salary ? `৳ ${Number(r.salary).toLocaleString()}` : "—" },
        {
          key: "user_access",
          label: "User Access",
          render: (r: any) => r.has_user_access
            ? <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">{r.user_username || "Yes"}</Badge>
            : <Badge variant="outline">No</Badge>,
        },
        {
          key: "status",
          label: "Status",
          render: (r: any) => <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status || "active"}</Badge>,
        },
        {
          key: "actions",
          label: "",
          render: (r: any) => (
            <Link to={`/pop-admin/employees/edit/${r.id}`}>
              <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
            </Link>
          ),
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
