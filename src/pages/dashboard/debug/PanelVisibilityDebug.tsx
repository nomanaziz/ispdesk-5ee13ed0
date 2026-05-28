import { useEffect } from "react";
import { useEmployeeContext, EMPLOYEE_ROLE_ID } from "@/hooks/useEmployeeContext";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Debug view: "আমার প্যানেল" visibility check.
 * Mirrors the exact logic used in AppSidebar.tsx:
 *   showEmployeePanel = isEmployee || !!appUser?.employee_id
 */
export default function PanelVisibilityDebug() {
  const { user, isAdmin } = useAuth();
  const ctx = useEmployeeContext();
  const { appUser, employee, primaryRoleId, primaryRoleName, extraRoleNames, isEmployee, isEmployeeOnly, loading } = ctx;

  const showEmployeePanel = isEmployee || !!appUser?.employee_id;
  const reason = !appUser
    ? "app_users row পাওয়া যায়নি (auth_user_id mismatch)"
    : isEmployee && appUser?.employee_id
      ? "✅ Employee role + employee_id দুটোই আছে"
      : isEmployee
        ? "✅ Employee primary role আছে (employee_id না থাকলেও দেখাবে)"
        : appUser?.employee_id
          ? "✅ Employee role না থাকলেও employee_id linked আছে"
          : "❌ Employee role নাই এবং employee_id-ও নাই → panel hide হবে";

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[PanelVisibilityDebug]", {
      authUserId: user?.id,
      isAdmin,
      appUserId: appUser?.id,
      appUser_employee_id: appUser?.employee_id,
      primaryRoleId,
      primaryRoleName,
      EMPLOYEE_ROLE_ID,
      isEmployee,
      isEmployeeOnly,
      extraRoleNames,
      showEmployeePanel,
    });
  }, [user?.id, isAdmin, appUser?.id, primaryRoleId, isEmployee, showEmployeePanel]);

  if (loading) return <div className="p-6">লোড হচ্ছে…</div>;

  const Row = ({ k, v }: { k: string; v: any }) => (
    <tr className="border-b border-border">
      <td className="py-2 pr-4 font-medium text-muted-foreground">{k}</td>
      <td className="py-2 font-mono text-sm break-all">{String(v ?? "—")}</td>
    </tr>
  );

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">প্যানেল ভিজিবিলিটি ডিবাগ</h1>
        <p className="text-muted-foreground text-sm">"আমার প্যানেল" sidebar এ দেখানোর লজিক যাচাই</p>
      </div>

      <div className={`rounded-lg p-4 border-2 ${showEmployeePanel ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"}`}>
        <div className="text-lg font-bold">
          showEmployeePanel = <span className="font-mono">{String(showEmployeePanel)}</span>
        </div>
        <div className="text-sm mt-1">{reason}</div>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Auth / App User</h2>
        <table className="w-full text-left">
          <tbody>
            <Row k="auth.user.id" v={user?.id} />
            <Row k="isAdmin (Super/Admin role)" v={isAdmin} />
            <Row k="app_users.id" v={appUser?.id} />
            <Row k="app_users.username" v={appUser?.username} />
            <Row k="app_users.employee_id" v={appUser?.employee_id} />
            <Row k="linked employee.name" v={employee?.name} />
            <Row k="linked employee.employee_id (code)" v={employee?.employee_id} />
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Roles</h2>
        <table className="w-full text-left">
          <tbody>
            <Row k="primaryRoleName" v={primaryRoleName} />
            <Row k="primaryRoleId" v={primaryRoleId} />
            <Row k="EMPLOYEE_ROLE_ID (expected)" v={EMPLOYEE_ROLE_ID} />
            <Row k="primaryRoleId === EMPLOYEE_ROLE_ID" v={primaryRoleId === EMPLOYEE_ROLE_ID} />
            <Row k="isEmployee" v={isEmployee} />
            <Row k="isEmployeeOnly" v={isEmployeeOnly} />
            <Row k="extraRoles" v={extraRoleNames.join(", ") || "—"} />
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Logic Trace</h2>
        <pre className="bg-muted p-3 rounded text-xs overflow-auto">
{`showEmployeePanel = isEmployee || !!appUser?.employee_id
                  = ${isEmployee} || ${!!appUser?.employee_id}
                  = ${showEmployeePanel}`}
        </pre>
        <p className="text-xs text-muted-foreground mt-2">
          Console-এ "[PanelVisibilityDebug]" search করলে full snapshot পাবেন।
        </p>
      </div>
    </div>
  );
}
