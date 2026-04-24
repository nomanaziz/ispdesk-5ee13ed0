

## Invoice PDF সুন্দর করে redesign — plan

### সমস্যা
বর্তমান `exportInvoicesPdf()` (in `src/lib/exportClients.ts`) একটা plain jsPDF text dump তৈরি করে — কোম্পানি লোগো নেই, header/footer নেই, settings থেকে কিছুই আসে না, edit history নেই। তাই PDF দেখতে "গোজামিল"।

### Data sources যা ইতিমধ্যে আছে ✅
| তথ্য | উৎস |
|---|---|
| কোম্পানির নাম, লোগো, ঠিকানা, মোবাইল, ফোন, email, website, TIN, BIN | `system_settings.company_info` (Company.tsx) |
| Invoice title, title position, footer note, show VAT toggle, invoice logo | `system_settings.invoice_setup` (PopInvoice.tsx) |
| Client info, package, monthly_bill, currentBill (amount/paid/due/discount/vat/advance) | already passed to `exportInvoicesPdf` |
| Bill edit history (পুরোনো amount, নতুন amount, কারণ, কখন, কে) | `billing_history` table (action, old_value, new_value, remarks) |

কোনো DB schema change লাগবে না।

---

## Redesign — `src/lib/exportClients.ts` → `exportInvoicesPdf`

### Function signature change
```ts
exportInvoicesPdf(
  clients: any[],
  filename: string,
  opts: { company: CompanyInfo; invoiceCfg: InvoiceCfg; histories?: Record<string, BillingHistory[]> }
)
```

Caller (BillingList, ClientList, ClientActionButtons) প্রথমে `system_settings` থেকে দুটি setting fetch করে এবং প্রতিটা bill-এর জন্য `billing_history` rows fetch করে dialog কল করার আগে।

### PDF layout (A4, প্রতি client = ১ page)

```text
┌─────────────────────────────────────────────────────────┐
│  [LOGO]   Company Name (large, bold)                    │
│           Address line 1, line 2                        │
│           📞 Mobile · ☎ Phone · ✉ Email · 🌐 Website     │
│           TIN: xxx · BIN: xxx                           │
├─────────────────────────────────────────────────────────┤
│  INVOICE  (left/center/right per invoiceCfg.titlePos)   │
│  Bill #: BILL-xxx-2026-04         Date: 24 Apr 2026     │
│  Month: April 2026                Status: [PAID/DUE]    │
├─────────────────────────────────────────────────────────┤
│  Bill To:                                               │
│  Client Name (Code)                                     │
│  Mobile · Address                                       │
│  Package: 10Mbps Home                                   │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────┬─────────┬─────────┐  │
│  │ Description                   │  Qty    │  Amount │  │
│  ├───────────────────────────────┼─────────┼─────────┤  │
│  │ Internet Service — Package    │   1     │   500   │  │
│  │ VAT (5%)         (if showVat) │         │    25   │  │
│  │ Discount                      │         │   -50   │  │
│  ├───────────────────────────────┼─────────┼─────────┤  │
│  │ Subtotal                                   475     │  │
│  │ Paid                                       400     │  │
│  │ Advance                                     0      │  │
│  │ TOTAL DUE                                   75     │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  📝 Bill Modification History (only if any history rows) │
│  • 22 Apr — Amount 500 → 600  ·  Reason: Extra usage    │
│  • 20 Apr — Package upgraded: 10Mbps → 15Mbps           │
├─────────────────────────────────────────────────────────┤
│  Footer note (from invoiceCfg.footerNote)               │
│  Generated on 24 Apr 2026 · Page 1 of N                 │
└─────────────────────────────────────────────────────────┘
```

### Key implementation details
1. **Logo loading** — convert image URL to base64 via `fetch + FileReader` before `doc.addImage()` (jsPDF requires data URL or base64).
2. **Title position** — `invoiceCfg.titlePosition` (left/center/right) দ্বারা x-coord ঠিক করব।
3. **Edit history filter** — `billing_history` থেকে যেগুলোর `action` = `update` / `amount_change` / `package_change` সেগুলো render করব। remarks থাকলে দেখাব।
4. **Conditional VAT row** — `invoiceCfg.showVat === false` হলে hide।
5. **Status badge** — `due > 0 ? red "DUE" : green "PAID"` (jsPDF rect + text)।
6. **Multi-client** — একাধিক client select করে download করলে প্রতি client = নতুন `addPage()`।

---

### Files যা change হবে

| File | কাজ |
|---|---|
| `src/lib/exportClients.ts` | `exportInvoicesPdf` সম্পূর্ণ rewrite (header, body, footer, history section, logo support); নতুন helper `loadImageAsBase64()` যোগ |
| `src/components/client-actions/ClientActionButtons.tsx` | invoice download করার আগে `company_info`, `invoice_setup`, `billing_history` fetch করে নতুন signature-এ pass |
| `src/pages/dashboard/billing/BillingList.tsx` | bulk invoice download — same fetch + pass |
| `src/pages/dashboard/clients/ClientList.tsx` | bulk invoice download — same fetch + pass |

---

### Outcome
- Invoice PDF-এ **কোম্পানির লোগো + পুরো contact info** header-এ থাকবে
- পরিচ্ছন্ন **table format**-এ bill (amount, VAT, discount, paid, due)
- **Bill যদি edit করা হয়**, "Bill Modification History" section-এ পুরোনো → নতুন amount + reason দেখাবে
- **Package update** হলেও সেটা history-তে দেখাবে
- **Footer**-এ settings থেকে আসা footer note + কোম্পানির ফোন/ঠিকানা
- Settings (`PopInvoice` ও `Company`)-এ কিছু change করলেই invoice automatic সেই অনুযায়ী generate হবে — কোডে আর কিছু ছোঁয়া লাগবে না

