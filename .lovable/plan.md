
## লক্ষ্য

QuickPay page-এ গ্রাহক খুঁজে পাওয়ার পর একটা **"Pay Now"** button থাকবে। সেটা click করলে payment method choice আসবে — Bank, bKash/Nagad (Personal/Merchant), অথবা RechargeServer gateway। Submit হলে admin-এর Daily Collection page-এ "অপেক্ষমাণ" status-এ আসবে; admin approve করলে billing auto-update হবে।

## Flow

```
[বিল পরিশোধ page]
   ↓ "Pay Now" click
[Method picker dialog]
   ├─ Bank Transfer → Account info show + Trx ID + Sender info → Submit
   ├─ bKash/Nagad Personal → Number show + Trx ID + Sender number → Submit
   ├─ bKash/Nagad Merchant → External redirect (Phase 2 — placeholder এখন)
   └─ RechargeServer Gateway → Existing edge function call (Phase 2)
   ↓
[public_payment_requests insert; status=pending]
   ↓
Admin Daily Collection-এ "অপেক্ষমাণ অনলাইন পেমেন্ট" section-এ দেখাবে
   ↓
Admin "Approve" click → oldest unpaid bill-এ paid amount add, due কমে, status update; payment request approved marked
```

## এই Phase 1-এ যা করব

- **Bank Transfer (manual Trx ID)**
- **bKash Personal (manual Trx ID)**
- **Nagad Personal (manual Trx ID)**

Merchant redirect ও RechargeServer integration **Phase 2**-এ আলাদা step-এ করব (ঐগুলো API-heavy)।

## Config source

এই step-এ bank account number, bKash number, Nagad number হিসেবে **placeholder values** (component-level constants) ব্যবহার করব। পরের step-এ admin-এর জন্য `Payment Methods Settings` page বানাব যেখান থেকে edit করা যাবে।

## Approve হলে কী হবে

Admin approve click করলে:
1. `public_payment_requests.status = 'approved'`
2. Client-এর সবচেয়ে পুরনো unpaid/partial `billing` row-এ `paid` amount add হবে, `due` কমবে, status update (paid/partial)
3. একটা note `billing.notes`-এ যোগ হবে (Trx ID + method)

এটা client-side transaction দিয়ে হবে (admin RLS access আছে)।

## Files

**New:**
- `src/components/public/QuickPayDialog.tsx` — Method picker + form (amount, Trx ID, sender number)

**Edit:**
- `src/pages/public/QuickPay.tsx` — "Pay Now" button + dialog open
- `src/pages/dashboard/billing/DailyCollection.tsx` — নতুন "অপেক্ষমাণ অনলাইন পেমেন্ট" section + Approve/Reject button

**DB migration (new table):**
```
public_payment_requests
  id, client_id (fk clients), amount, method,
  trx_id, sender_number, note,
  status (pending/approved/rejected),
  admin_note, approved_by, approved_at,
  created_at
```
RLS:
- `anon` role: INSERT allowed (so non-logged-in submission works)
- `authenticated` admin: full SELECT/UPDATE/DELETE

## ফলাফল

- Public QuickPay page-এ গ্রাহক খুঁজে পাওয়ার পর "Pay Now" → method choose → Trx ID submit → confirmation message
- Admin Daily Collection page-এ pending online payments দেখা যাবে; এক click-এ approve হলে billing auto-update
- Phase 2-এ Merchant API + RechargeServer + admin settings page যোগ হবে
