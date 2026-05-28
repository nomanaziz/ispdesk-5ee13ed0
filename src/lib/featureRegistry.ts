// Source of truth: প্রতি module-এর bulk-action toggles ও dashboard widget toggles
// scope_key must match `module_name` from app_role_modules রেজিস্ট্রি যেখানে প্রযোজ্য।

export interface FeatureItem {
  key: string;
  label: string;
}

export interface FeatureGroup {
  scopeKey: string;        // e.g. "Home Clients"
  label: string;           // Bangla display label
  items: FeatureItem[];
}

// ─── Bulk Actions ─────────────────────────────────────────────────────────
const COMMON_BULK: FeatureItem[] = [
  { key: "export_excel",       label: "এক্সেল ডাউনলোড" },
  { key: "export_pdf",         label: "পিডিএফ ডাউনলোড" },
  { key: "client_sync",        label: "ক্লায়েন্ট সিঙ্ক" },
  { key: "bulk_disable",       label: "বাল্ক বন্ধ" },
  { key: "bulk_enable",        label: "বাল্ক চালু" },
  { key: "bulk_status_change", label: "বাল্ক স্ট্যাটাস পরিবর্তন" },
  { key: "bulk_sms",           label: "বাল্ক SMS পাঠান" },
  { key: "bulk_delete",        label: "বাল্ক ডিলিট" },
];

export const BULK_ACTION_GROUPS: FeatureGroup[] = [
  { scopeKey: "Home Clients",      label: "হোম ক্লায়েন্ট",       items: COMMON_BULK },
  { scopeKey: "Corporate Clients", label: "কর্পোরেট ক্লায়েন্ট", items: COMMON_BULK },
  { scopeKey: "All Clients",       label: "সকল ক্লায়েন্ট",       items: COMMON_BULK },
  { scopeKey: "Billing",           label: "বিলিং",                 items: COMMON_BULK },
  { scopeKey: "Inventory Items",   label: "ইনভেন্টরি",             items: COMMON_BULK.filter(i => i.key !== "client_sync" && i.key !== "bulk_sms") },
  { scopeKey: "VAS Subscriptions", label: "VAS সাবস্ক্রিপশন",      items: COMMON_BULK.filter(i => i.key !== "client_sync") },
];

// ─── Dashboard Widgets ────────────────────────────────────────────────────
export const DASHBOARD_SECTIONS: FeatureGroup[] = [
  {
    scopeKey: "kpi_top",
    label: "KPI কার্ড (উপরের)",
    items: [
      { key: "kpi_total_clients", label: "মোট ক্লায়েন্ট" },
      { key: "kpi_users",         label: "অনলাইন ব্যবহারকারী" },
      { key: "kpi_active",        label: "সচল ক্লায়েন্ট" },
      { key: "kpi_earnings",      label: "বন্ধ লাইন" },
    ],
  },
  {
    scopeKey: "system_overview",
    label: "সিস্টেম ওভারভিউ",
    items: [
      { key: "this_month_sales",  label: "এই মাসের সেল" },
      { key: "today_sales",       label: "আজকের সেল" },
      { key: "billing_clients",   label: "বিলিং ক্লায়েন্ট" },
      { key: "expired_clients",   label: "মেয়াদোত্তীর্ণ" },
      { key: "portal_active",     label: "পোর্টাল অ্যাক্টিভ" },
      { key: "portal_inactive",   label: "পোর্টাল ইনঅ্যাক্টিভ" },
      { key: "vip_clients",       label: "VIP ক্লায়েন্ট" },
      { key: "total_due",         label: "মোট বকেয়া" },
    ],
  },
  {
    scopeKey: "system_resource",
    label: "সিস্টেম রিসোর্স",
    items: [
      { key: "onu_gauge",        label: "ONU অনলাইন গেজ" },
      { key: "paid_gauge",       label: "পেইড ক্লায়েন্ট গেজ" },
      { key: "collection_gauge", label: "কালেকশন গেজ" },
      { key: "sms_balance",      label: "SMS ব্যালেন্স" },
    ],
  },
  {
    scopeKey: "pop_overview",
    label: "POP ওভারভিউ",
    items: [
      { key: "total_pop",            label: "মোট POP" },
      { key: "total_pop_clients",    label: "মোট POP ক্লায়েন্ট" },
      { key: "pop_active_clients",   label: "সচল POP ক্লায়েন্ট" },
      { key: "pop_inactive_clients", label: "নিষ্ক্রিয় POP ক্লায়েন্ট" },
    ],
  },
  {
    scopeKey: "tickets_overview",
    label: "টিকেট / টাস্ক ওভারভিউ",
    items: [
      { key: "zone_donut",            label: "জোন অনুযায়ী সমস্যা" },
      { key: "subzone_donut",         label: "সাবজোন অনুযায়ী সমস্যা" },
      { key: "pending_tickets",       label: "পেন্ডিং টিকেট" },
      { key: "processing_tickets",    label: "প্রসেসিং টিকেট" },
      { key: "pending_tasks",         label: "পেন্ডিং টাস্ক" },
      { key: "processing_tasks",      label: "প্রসেসিং টাস্ক" },
      { key: "monthly_problem_donut", label: "মাসিক সমস্যার ধরন" },
      { key: "top_solver_chart",      label: "সর্বোচ্চ সমাধানকারী" },
    ],
  },
  {
    scopeKey: "growth_charts",
    label: "গ্রোথ চার্ট",
    items: [
      { key: "monthly_new_clients", label: "মাসিক নতুন ক্লায়েন্ট" },
      { key: "top_active_users",    label: "টপ অ্যাক্টিভ ব্যবহারকারী" },
    ],
  },
  {
    scopeKey: "top_due",
    label: "টপ বকেয়া",
    items: [
      { key: "home_due_tile",       label: "হোম বকেয়া (টাইল)" },
      { key: "corporate_due_tile",  label: "কর্পোরেট বকেয়া (টাইল)" },
      { key: "bandwidth_due_tile",  label: "ব্যান্ডউইথ বকেয়া (টাইল)" },
      { key: "pop_negative_tile",   label: "POP নেগেটিভ (টাইল)" },
      { key: "home_due_list",       label: "হোম — টপ ২০ তালিকা" },
      { key: "corporate_due_list",  label: "কর্পোরেট — টপ ২০ তালিকা" },
      { key: "bandwidth_due_list",  label: "ব্যান্ডউইথ — টপ ২০ তালিকা" },
      { key: "pop_negative_list",   label: "POP নেগেটিভ — টপ ২০ তালিকা" },
    ],
  },
  {
    scopeKey: "action_needed",
    label: "অ্যাকশন প্রয়োজন",
    items: [
      { key: "overdue_billing",   label: "ওভারডিউ বিলিং" },
      { key: "expired_clients",   label: "মেয়াদোত্তীর্ণ" },
      { key: "inactive_left",     label: "নিষ্ক্রিয়/বাতিল" },
      { key: "grace_extension",   label: "গ্রেস/এক্সটেনশন" },
      { key: "pending_tickets",   label: "পেন্ডিং টিকেট" },
      { key: "pending_tasks",     label: "পেন্ডিং টাস্ক" },
    ],
  },
  {
    scopeKey: "financial_summary",
    label: "আর্থিক বিবরণ",
    items: [
      { key: "total_bill",       label: "মোট বিল" },
      { key: "collected",        label: "কালেক্টেড" },
      { key: "discount",         label: "ডিসকাউন্ট" },
      { key: "total_due",        label: "বকেয়া" },
      { key: "income",           label: "আয়" },
      { key: "expense",          label: "ব্যয়" },
      { key: "trend_12_chart",   label: "১২-মাসের ট্রেন্ড চার্ট" },
      { key: "unpaid_clients",   label: "বকেয়া ক্লায়েন্ট তালিকা" },
    ],
  },
];

export const FEATURE_SCOPE = {
  BULK: "bulk_action",
  WIDGET: "dashboard_widget",
} as const;
