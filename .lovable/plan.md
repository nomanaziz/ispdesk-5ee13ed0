

## ভেরিয়েবল chip clickable + POP-এ নতুন template add

### আসল সমস্যা
1. Variable list এখন শুধু text হিসেবে দেখায় — copy/type করতে হয়
2. POP Admin শুধু existing template edit করতে পারে, **নতুন custom template add করতে পারে না**

---

### সমাধান

#### ১) Reusable Variable Chip Component
নতুন file: `src/components/sms/VariableChips.tsx`
- `TEMPLATE_VARIABLES` থেকে সব variable badge/chip আকারে render
- প্রতিটা chip ক্লিক করলে → textarea-এর current cursor position-এ `{Variable}` insert হবে
- Props: `textareaRef`, `value`, `onChange`
- Cursor position track করে after-insert focus restore হবে
- Hover-এ "ক্লিক করে বসান" tooltip
- Compact, wrap-friendly layout — small badge buttons

ব্যবহার:
```tsx
<Textarea ref={taRef} value={form.content} onChange={...} />
<VariableChips textareaRef={taRef} value={form.content}
  onChange={(v) => setForm({...form, content: v})} />
```

#### ২) যেসব জায়গায় integrate হবে
| File | কাজ |
|------|-----|
| `src/pages/dashboard/sms/Templates.tsx` | পুরোনো plain text variable line replace → `<VariableChips/>` |
| `src/pages/reseller/PopSmsTemplates.tsx` | একই replace + নতুন "Add" button + dialog mode |
| `src/components/billing/BulkSmsDialog.tsx` | message textarea-এর নিচে chips |
| `src/pages/dashboard/sms/Send.tsx` | message textarea-এর নিচে chips |
| `src/pages/dashboard/sms/Individual.tsx` | message textarea-এর নিচে chips |

#### ৩) POP নতুন custom template add করতে পারবে
**Edge function** `supabase/functions/portal-data/index.ts` — নতুন action যোগ:
- **`pop_create_template`**: POP/admin নিজের custom template create করবে
  - Service role দিয়ে `sms_template_master`-এ insert
  - Forced fields: `template_type='custom'`, `is_protected=false`, `template_key='pop_<branch_id_short>_<timestamp>'` (unique)
  - `created_by_branch` column যোগ করতে হবে → কে create করেছে track করার জন্য
  - POP শুধু নিজের তৈরি custom template **edit/delete** করতে পারবে (master default-এ override route আগের মতই থাকবে)

- **`pop_delete_template`**: POP নিজের তৈরি custom template delete (only if `created_by_branch = own branch`, never protected)

**Database migration**:
```sql
ALTER TABLE sms_template_master 
  ADD COLUMN created_by_branch uuid REFERENCES branches(id);
-- existing rows NULL = system-level (default behaviour preserved)
```
View `sms_templates_effective`-এ এই column expose হবে যাতে POP দেখতে পারে কোনগুলো তার নিজের।

#### ৪) UI changes
- **PopSmsTemplates.tsx**: top-right-এ "+ নতুন টেমপ্লেট" button
- Dialog একই UI (নাম, কন্টেন্ট, ক্যাটাগরি, status) + variable chips
- Table-এ যদি `created_by_branch === own branchId` → "নিজস্ব" badge দেখাবে আর delete button enable হবে
- System default এবং অন্য POP-এর template untouchable

### ফলাফল
- ১৫টা variable সব dialog/textarea-এ click-to-insert chips হিসেবে আসবে
- POP Admin "+ নতুন টেমপ্লেট" দিয়ে নিজের template বানাতে পারবে — variable chips সহ
- Admin/Super Admin আগের মতই full CRUD পাবে
- Default protected templates একইভাবে delete-protected থাকবে
- POP যেগুলো নিজে create করেছে শুধু সেগুলোই delete করতে পারবে

### Files to create/edit
- **New**: `src/components/sms/VariableChips.tsx`
- **Migration**: `sms_template_master`-এ `created_by_branch` column add
- `supabase/functions/portal-data/index.ts` — `pop_create_template`, `pop_delete_template` actions; `pop_list_templates`-এ `created_by_branch` return
- `src/pages/reseller/PopSmsTemplates.tsx` — Add button, create/delete flow, chips
- `src/pages/dashboard/sms/Templates.tsx` — chips integration
- `src/components/billing/BulkSmsDialog.tsx`, `Send.tsx`, `Individual.tsx` — chips below textarea

### Technical notes
- Cursor-aware insert: `textarea.selectionStart`/`End` ব্যবহার করে exact position-এ insert
- chips small-size `badge`-style buttons, wrap layout, theme-consistent
- POP write path পুরোটাই edge function-এ branch-validated — RLS loosen হবে না

