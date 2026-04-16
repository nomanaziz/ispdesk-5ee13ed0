

## সমস্যা

`AddClient.tsx`-এ client save করার পর navigate করে `/dashboard/clients/list`-এ, কিন্তু আসল route হলো `/dashboard/clients`। তাই save-এর পর 404 পেজ দেখায় যেটা সাদা/ফাঁকা দেখায়।

## সমাধান

`AddClient.tsx`-এ দুটি জায়গায় `/dashboard/clients/list` কে `/dashboard/clients`-এ পরিবর্তন করতে হবে:

1. **Line 206** — `onSuccess` callback: `navigate("/dashboard/clients/list")` → `navigate("/dashboard/clients")`
2. **Line 589** — "Go To List" button: `navigate("/dashboard/clients/list")` → `navigate("/dashboard/clients")`

### ফাইল
| File | Change |
|------|--------|
| `src/pages/dashboard/clients/AddClient.tsx` | দুটি navigate path fix |

একটি ১-লাইন fix, কোনো জটিলতা নেই।

