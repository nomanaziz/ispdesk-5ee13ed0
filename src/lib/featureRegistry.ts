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
    scopeKey: "kpi_top",
    label: "KPI কার্ড",
    items: [
      { key: "kpi_total_clients", label: "মোট ক্লায়েন্ট" },
      { key: "kpi_active",        label: "অ্যাক্টিভ ক্লায়েন্ট" },
      { key: "kpi_earnings",      label: "মোট আয় (সংবেদনশীল)" },
      { key: "kpi_users",         label: "মোট ইউজার" },
    ],
  },
  {
    scopeKey: "system_resource",
    label: "সিস্টেম রিসোর্স",
    items: [
      { key: "resource_overview", label: "রিসোর্স ওভারভিউ" },
    ],
  },
  {
    scopeKey: "top_due",
    label: "টপ বকেয়া",
    items: [
      { key: "top_due_table", label: "টপ বকেয়া তালিকা" },
    ],
  },
  {
    scopeKey: "action_needed",
    label: "অ্যাকশন প্রয়োজন",
    items: [
      { key: "action_panel", label: "অ্যাকশন প্যানেল" },
    ],
  },
  {
    scopeKey: "financial_summary",
    label: "আর্থিক বিবরণ",
    items: [
      { key: "financial_panel", label: "আর্থিক প্যানেল" },
    ],
  },
];

export const FEATURE_SCOPE = {
  BULK: "bulk_action",
  WIDGET: "dashboard_widget",
} as const;
