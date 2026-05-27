# RBAC v2 + Audit Log + Recycle Bin — Full Plan

## লক্ষ্য
ISP ERP-এ admin/employee সবার জন্য একটাই unified permission system। প্রতিটি module-এ 3 ধরনের permission, একজন user একাধিক role পেতে পারবে (max-wins merge), সব admin action log হবে, এবং delete হওয়া data Super Admin recycle bin থেকে restore করতে পারবে।

---

## ১. Permission Model (3-tier)

প্রতিটি module-এ এক user-এর জন্য permission level একটাই — এক বা একাধিক role থেকে merge হবে (highest wins):

| Level | Read | Create | Update | Delete | Restore/Audit |
|-------|------|--------|--------|--------|----------------|
| `none` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `read` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `write` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `full` | ✅ | ✅ | ✅ | ✅ | ❌ |

**Special:**
- `super_admin` সব কিছু পায়, কেউ তাকে delete/disable করতে পারবে না।
- Recycle Bin + Audit Restore শুধু Super Admin (বা super_admin যাকে explicit grant দেয়)।
- Employee-এর নিজস্ব data (own attendance, salary, leave) সবসময় read — permission লাগে না।

**Merge rule:** কোনো user-এর কোনো module-এ effective permission = `MAX(level)` across সব assigned roles। `full > write > read > none`.

---

## ২. Database Changes

বর্তমান tables (`app_roles`, `app_role_modules`, `app_user_extra_roles`, `app_user_effective_modules`) তে `permission` column already আছে কিন্তু enum/enforcement নাই। নতুন migration:

### 2.1 Enum + column tighten
```sql
CREATE TYPE perm_level AS ENUM ('none','read','write','full');
ALTER TABLE app_role_modules ALTER COLUMN permission TYPE perm_level USING permission::perm_level;
ALTER TABLE app_user_effective_modules ALTER COLUMN permission TYPE perm_level USING permission::perm_level;
```

### 2.2 Effective-permission function (max-wins)
```sql
CREATE FUNCTION get_user_module_permission(_user_id uuid, _module text)
RETURNS perm_level LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(MAX(arm.permission), 'none'::perm_level)
  FROM app_users u
  LEFT JOIN app_user_extra_roles ext ON ext.user_id = u.id
  LEFT JOIN app_role_modules arm 
    ON arm.role_id IN (u.role_id, ext.role_id) 
    AND arm.module_name = _module AND arm.enabled
  WHERE u.auth_user_id = _user_id;
$$;
```
+ helper booleans: `can_read(_module)`, `can_write(_module)`, `can_delete(_module)`, `is_super_admin()`.

### 2.3 Audit log
```sql
CREATE TABLE admin_audit_log (
  id uuid PK, tenant_id, actor_auth_id, actor_username,
  action text,           -- 'create'|'update'|'delete'|'restore'|'login'|...
  entity_type text,      -- 'client'|'employee'|'invoice'|...
  entity_id uuid,
  before jsonb, after jsonb,
  ip text, user_agent text, created_at);
```
Generic trigger `log_audit()` attached to high-value tables (clients, employees, billing, payments, app_users, app_roles, …).

### 2.4 Recycle bin (soft-delete)
সব critical tables-এ `deleted_at timestamptz`, `deleted_by uuid` যোগ। RLS-এ default filter `deleted_at IS NULL`। আলাদা VIEW `recycle_bin` যা সব soft-deleted rows union করে — শুধু super_admin SELECT করতে পারবে। RPC:
- `soft_delete(entity, id)` → sets deleted_at
- `restore(entity, id)` → clears deleted_at (super_admin only)
- `purge(entity, id)` → hard delete (super_admin only)

Critical tables initial list: `clients`, `employees`, `app_users`, `app_roles`, `billing`, `invoices`, `payments`, `inventory_items`, `mikrotik_clients`, `onu_list`.

### 2.5 RLS update
সব module table-এর existing RLS-এ permission check inject:
```sql
USING (can_read('clients'))
WITH CHECK (TG_OP='INSERT' AND can_write('clients') 
         OR TG_OP='UPDATE' AND can_write('clients')
         OR TG_OP='DELETE' AND can_delete('clients'))
```

---

## ৩. Frontend Changes

### 3.1 `usePermission` hook rewrite
```ts
const { level, canRead, canWrite, canDelete, isSuperAdmin } = useModulePermission('clients');
```
এক query-তে user-এর সব module-এর effective permission cache হবে (5 min stale)। যেহেতু "client menu আছে কিন্তু data নাই" বর্তমান bug — sidebar item visibility = `canRead`, page guard = `canRead`, add button = `canWrite`, delete button = `canDelete`.

### 3.2 Sidebar gating
`AppSidebar`-এ প্রতিটা menu item-এ `module` key যোগ → effective permission-এ filter। Employee role-এ default শুধু "My *" menus (আগের plan অনুযায়ী)।

### 3.3 Role management UI
`/dashboard/access/roles` কে refactor:
- Role create/edit dialog-এ module tree (group → module) + প্রতি row-এ radio `none/read/write/full`।
- User edit dialog-এ multi-role selector (primary role + extra roles), preview effective permission table।

### 3.4 Recycle Bin page (super_admin only)
`/dashboard/access/recycle-bin` — entity dropdown + deleted rows list + Restore/Purge button + filter by date/actor.

### 3.5 Audit Log page (super_admin only)
`/dashboard/access/audit-log` — filterable timeline (actor, entity, action, date), JSON diff view, "Restore this version" for update logs.

### 3.6 Action button guards
Reusable `<Guarded module="clients" need="write">` wrapper — child render হবে শুধু permission থাকলে।

---

## ৪. Bug Fix: "Client menu আছে, data নাই"
বর্তমানে sidebar item দেখায় কিন্তু `clients` table-এর RLS-এ tenant filter পাশাপাশি role check নাই, ফলে empty list। নতুন `can_read('clients')` যোগ + role-এ যদি permission থাকে তাহলে data আসবে। যাচাই: EMP001 কে temporary `clients: read` দিয়ে test।

---

## ৫. Multi-Role Examples
- User U1 → Role A (`clients: read`) + Role B (`clients: write`) → effective `write` (create/edit পারবে, delete নাই)।
- User U2 → Role HR (`employees: full`) + Role Billing (`billing: read`) → HR-এ delete করতে পারবে, Billing-এ শুধু দেখবে।

---

## ৬. Protection Rules
- `super_admin` role `is_protected=true` — delete/rename blocked।
- Main super_admin user (system first user) কে কেউ disable/delete করতে পারবে না (trigger check)।
- যদি কেউ bulk delete clients করে → soft delete only, super_admin restore করতে পারবে।

---

## ৭. Execution Order (4 phases)

**Phase 1 — DB foundation** (1 migration)
- perm_level enum, effective-permission function, audit_log table + generic trigger, soft-delete columns on 10 critical tables, recycle_bin view, RPCs.

**Phase 2 — Permission enforcement**
- RLS update on top 10 tables। `usePermission` rewrite। `<Guarded>` component।

**Phase 3 — UI**
- Role editor refactor (module tree + 4-level radio)। User dialog: multi-role + effective preview।

**Phase 4 — Super Admin tools**
- Recycle Bin page। Audit Log page with restore। Super-admin protection triggers।

---

## ৮. Out of Scope (এই plan-এ নয়)
- Field-level permission (column hide)
- Row-level sharing rules (e.g., "শুধু নিজের branch-এর clients")  — পরে branch-scoped permission আনব
- Audit log retention/archival
- Mobile shell

---

## অনুমোদন
এই 4 phase-এর full plan-এ এগোবো? নাকি প্রথমে শুধু Phase 1+2 (foundation + bug fix) করব এবং Recycle Bin/Audit Log পরে?
