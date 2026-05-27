/**
 * Maps each sidebar group label → the `module_name` used in
 * `app_role_modules`. Group is shown only if the user has at least
 * `read` permission on that module. Super Admin always passes.
 *
 * "আমার প্যানেল" (employee self-service) is always shown for
 * logged-in users — employee panel is the user's own portal and
 * its own items are individually permissioned via EMPLOYEE_SELF_SERVICE.
 */
export const GROUP_MODULE: Record<string, string> = {
  "ড্যাশবোর্ড": "Dashboard",
  "All Clients": "Client List",
  "POP / MAC ক্লায়েন্ট": "Managers",
  "ব্যান্ডউইথ ক্লায়েন্ট": "Customers",
  "সাপোর্ট ও টিকেটিং": "Tickets",
  "অ্যাকাউন্টিং": "Chart of Accounts",
  "HR ও পেরোল": "Employees",
  "OLT ম্যানেজমেন্ট": "Devices",
  "নেটওয়ার্ক মনিটরিং": "Live Traffic",
  "নেটওয়ার্ক ডায়াগ্রাম": "Diagram",
  "ডিভাইস": "Devices",
  "টাস্ক ম্যানেজমেন্ট": "Tasks",
  "ব্যান্ডউইথ ক্রয়": "Bills",
  "রিপোর্ট": "Bill Collection",
  "SMS সার্ভিস": "Send",
  "ই-কমার্স": "Products",
  "ক্রয়": "Purchases",
  "বিক্রয় ও সার্ভিস": "Service Invoice",
  "ইনভেন্টরি": "Items",
  "অ্যাসেট": "Asset List",
  "ইভেন্ট ও ছুটি": "Apply",
  "ওয়েবসাইট প্যানেল": "Pages",
  "কনফিগারেশন": "Packages",
  "সিস্টেম": "Setup",
  "VAS": "Config",
};

/** Group labels that are always visible to any logged-in app_user. */
export const ALWAYS_VISIBLE_GROUPS = new Set<string>(["আমার প্যানেল"]);
