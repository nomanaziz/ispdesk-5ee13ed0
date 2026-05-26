
# BTRC Monthly Report Rebuild

বর্তমান `src/pages/dashboard/reports/Btrc.tsx` page-টা reference Galaxy Net screenshot-এর সাথে মিলিয়ে rebuild করা হবে। শুধু এই এক পেজ + একটি ছোট helper edit।

## ১. Filter bar (top section)

নিচের ক্রমে filter থাকবে (screenshot-এর মত):

| Filter | Options | Default |
|---|---|---|
| Previous Month | শেষ ১২ মাস (e.g. Apr-26, Mar-26 ...) | গত মাস |
| User Type | All / AdminCustomer / MAC Reseller | All |
| POPs | active reseller list (যখন User Type = Reseller) | All |
| Servers | active MikroTik servers | All |
| Service | All / Fiber / Broadband / Wireless | All |
| Client Type | All / Home / Corporate | All |
| Connection Type | All / Wired / Wireless | All |
| B.Status | All / Paid / Unpaid (info only — filter করে না active selection-এ) | All |
| Zone | active zones | All |
| Date Format | YYYY-MM-DD / DD-MM-YYYY / MM-DD-YYYY / DD/MM/YYYY / MM/DD/YYYY | DD-MM-YYYY |
| Allocated IP Type | User ID / MAC Address / IP Address | IP Address |
| Distributed Point Type | DC / NOC / POP / Server | POP |
| Sub Zone | selected zone-এর sub-zones | All |
| Box | selected sub-zone-এর boxes | All |
| Activation From / To | date pickers | মাসের ১-শেষ |

Top-right তিনটি action button: **Sync Clients & Servers**, **Generate PDF**, **Generate Excel** (existing exporters reuse)।

পেজের উপরে একটি ছোট info banner: "N.B: Click here" — click করলে Bangla notice modal খুলবে (screenshot-এর মত):
> "আপনি যখন বিটিআরসি রিপোর্ট টি ডাউনলোড করবেন, এক্সেল এ এক্টিভেশন ডেট টি নাম্বার আকারে শো করবে। চাইলে এক্সেল সিট থেকে ডেট ফরমেট চেঞ্জ করে দেখতে পারবেন।"

## ২. Core logic — কোন user list আসবে

BTRC report → **গত মাসের পুরো মাস জুড়ে active ছিল এমন সব user**:

- `clients.status = 'active'` **OR** `mikrotik_status = 'enabled'` (অর্থাৎ MikroTik-এ active ছিল)
- `joining_date <= <selected month last day>`
- যারা ঐ মাসের আগেই left/deleted হয়েছে — বাদ
- **Billing status check করব না** (free হলেও যাবে — selling_price 1 দেখাব)
- Default range = previous calendar month

`Previous Month` dropdown change করলে `Activation From/To` auto-fill হবে ঐ মাসের ১ → শেষ তারিখ।

## ৩. Allocated IP column behaviour

`Allocated IP Type` selection অনুযায়ী একটাই `allocated_ip` column-এ value বদলাবে:

- **User ID** → `clients.user_id`
- **MAC Address** → `clients.mac_address`
- **IP Address** → `clients.remote_address` (PPPoE/Static IP), না থাকলে `-`

## ৪. Table columns (exact heading order)

```
client_type | connection_type | client_name | bandwidth_distribution_point |
connectivity_type | activation_date | bandwidth_allocation | allocated_ip |
division | district | thana | address | client_mobile | client_email |
selling_price_bdt_excluding_vat
```

Mapping:
- `client_type` → `clients.client_type` (Home/Corporate)
- `connection_type` → `Wired` / `Wireless` (clients.connection_type থেকে — fiber/broadband = Wired)
- `client_name` → `clients.name`
- `bandwidth_distribution_point` → selected Distributed Point Type label (POP/NOC/DC/Server), অথবা client এর reseller-name যদি POP হয়
- `connectivity_type` → `Shared` (Home) / `Dedicated` (Corporate)
- `activation_date` → `joining_date`, selected Date Format-এ format
- `bandwidth_allocation` → `packages.olt_range` অথবা package name থেকে Mbps
- `allocated_ip` → section ৩ অনুযায়ী
- `division` / `district` / `thana` → client address থেকে যদি field থাকে, না থাকলে "-" (পরে structured করা যাবে)
- `address` → `clients.address`
- `client_mobile` → `clients.contact`
- `client_email` → `clients.email`
- `selling_price_bdt_excluding_vat` →
  - paid package → `monthly_bill` (VAT excluded — যদি VAT included থাকে তবে `/1.15`, currently flat ধরা হবে)
  - **free / 0-bill user → `1`** (BTRC কে কখনো 0 দেখানো যাবে না)

## ৫. Export & Display

- Table-এর উপরে: `SHOW [10/25/50/100/All] ENTRIES` + right-side search box
- `Activation Date` Excel-এ raw serial number হবে (Excel auto-detect করে), অন্য column text — তাই notice banner
- PDF: landscape, কোম্পানির header সহ (existing `exportPdf` reuse)
- Excel: `xlsx` lib, formatted (existing `exportExcel` reuse)

## ৬. Files touched

1. `src/pages/dashboard/reports/Btrc.tsx` — পুরো filter bar, query logic, columns rebuild
2. `src/components/reports/ReportLayout.tsx` — যদি `Show entries` selector আর info-banner slot না থাকে, তাহলে minor addition

ভবিষ্যতে structured division/district/thana লাগলে `clients` table-এ column add করা যাবে — এখন placeholder `-` থাকবে।

## প্রশ্ন (build শুরুর আগে)

1. `division/district/thana` কি `clients` table-এ এখনই add করব (migration), নাকি placeholder `-` রেখে পরে structured করব?
2. Selling price-এ VAT অলরেডি excluded ধরব, নাকি `monthly_bill / 1.15` করে VAT বাদ দেব?
