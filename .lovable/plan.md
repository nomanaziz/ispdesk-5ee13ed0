

## Manage Your Clients — Tiered Pricing + Auto Usage-Based Billing

### আপনার নতুন pricing model (simplified)

| Tier | User Range | Per-Month Charge |
|------|-----------|------------------|
| **P#1 — Starter** | 0 – 500 users | Flat ৳500/মাস |
| **P#2 — Growth** | 501 – 3,000 users | ৳1 × actual user count |
| **P#3 — Pro (Free Slab)** | 3,001+ users | **Free** (কোনো charge না) |

POP Admin-এর complex 3-step formula বাদ। শুধু **৩টা slab**, যেটার মধ্যে user-এর active client count পড়ে — সেই অনুযায়ী next month-এর bill auto generate।

---

### পরিবর্তন

#### 1. **Database — `bw_panel_pricing_slabs` table কে redesign**
বর্তমান table-এ `user_limit` (single number) + `monthly_price` (flat) আছে। নতুন structure:

```
id, tier_name, min_users, max_users (nullable=∞),
billing_mode ('flat' | 'per_user' | 'free'),
flat_price (nullable), per_user_rate (nullable),
display_order, is_active
```

Seed data:
- P#1: min=0, max=500, mode=flat, flat_price=500
- P#2: min=501, max=3000, mode=per_user, per_user_rate=1
- P#3: min=3001, max=NULL, mode=free

#### 2. **`bw_sale_customers` table — current usage tracking**
নতুন columns:
- `active_client_count` (int, auto-updated trigger) — কতজন real client তার panel-এ আছে
- `current_tier_id` (FK) — এই মাসে সে কোন tier-এ আছে
- `next_month_estimated_bill` (numeric) — preview

**Trigger**: `clients` table-এ insert/delete হলে → owner BW customer-এর `active_client_count` recalculate এবং সঠিক tier auto-assign।

#### 3. **Admin page — `PanelPricing.tsx` simplified UI**

পুরোনো 4-column table (User Limit / Monthly / Per-User / Status) replace হবে নতুন **3-row tier card** দিয়ে:

```
┌─────────────────────────────────────────────────┐
│ P#1  Starter         0–500 users    ৳500/মাস   │ [Edit]
├─────────────────────────────────────────────────┤
│ P#2  Growth        501–3,000 users  ৳1/user/মাস│ [Edit]
├─────────────────────────────────────────────────┤
│ P#3  Pro          3,001+ users      FREE 🎉    │ [Edit]
└─────────────────────────────────────────────────┘
```

নতুন **"Active Customer Usage" column** যোগ হবে নিচের একটা table-এ:

```
Customer Name | Active Clients | Current Tier | Next Month Bill
```

এতে admin দেখতে পাবে কে কোন tier-এ আছে এবং পরের মাসে কত bill generate হবে।

#### 4. **BW customer-এর `Manage Your Clients` modal update**
`ManageClientsUpgradeModal.tsx`-এ ৩টা slab এভাবে দেখাবে (clean cards):

```
┌──────────┐ ┌──────────┐ ┌──────────────┐
│  P#1     │ │  P#2     │ │  P#3 ⭐ FREE │
│  ৳500    │ │  ৳1/user │ │  3,000+ users│
│  /month  │ │  per month│ │   no charge │
│  ≤500 users│ │501-3000 │ │   forever   │
└──────────┘ └──────────┘ └──────────────┘
```

প্লাস **"আপনার বর্তমান usage"** banner: *"আপনার এখন ১২৫ জন active client — Tier P#1-এ আছেন (৳500/মাস)"*

#### 5. **Auto monthly bill generation**
- Cron edge function `bw-panel-monthly-billing` (১ম তারিখে চলবে)
- Logic: প্রতিটি active BW customer-এর `active_client_count` দেখে → matching tier খুঁজে → bill calculate → `bw_billing` table-এ insert করবে।

#### 6. **Components affected**
- `src/pages/dashboard/bw-sale/PanelPricing.tsx` — simplified 3-tier UI
- `src/components/ManageClientsUpgradeModal.tsx` — new tier cards + usage banner
- `supabase/functions/bw-panel-monthly-billing/index.ts` — new cron function
- DB: schema migration + trigger + seed

---

### Outcome

- Admin শুধু ৩টা simple tier manage করবে — কোনো complex formula না।
- BW customer তার active client count দেখে বুঝবে সে কোন tier-এ আছে।
- Client বাড়লে auto next-month bill higher হবে; ৩,০০০ পার করলে বিনামূল্যে।
- Admin dashboard-এ প্রতিটি customer-এর usage + projected bill visible।

