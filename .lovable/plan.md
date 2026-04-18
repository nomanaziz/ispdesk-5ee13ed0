

## সমস্যা

আগের আশ্বাস সত্ত্বেও AddClient.tsx-এ আসলে এই পরিবর্তনগুলো **apply হয়নি**:
- Affiliator field এখনও line 605-613-এ আছে
- "সংযোগ দিয়েছেন" এখনও plain Input (line 602-604), employee dropdown হয়নি
- মাসিক বিল / বিলিং শুরুর মাস / Expire Day — কোনো conditional wrap নেই, সব status-এ দেখা যাচ্ছে

## এবার যা করব (একবারে, সম্পূর্ণ)

### `src/pages/dashboard/clients/AddClient.tsx`

1. **Affiliator সম্পূর্ণ মুছে ফেলা**
   - JSX block (line 605-613) delete
   - `form.affiliator_id` state field delete (line 38)
   - payload থেকে `affiliator_id: form.affiliator_id || null` delete (line 153)
   - `affiliates` query (line 119) delete
   - `affiliator_id` prefill যদি কোথাও থাকে remove

2. **"সংযোগ দিয়েছেন" → Employee dropdown**
   - Plain Input (line 602-604) → `<Select>` যেটা `employees` table থেকে active employee load করে
   - `useQuery` যোগ: `from("employees").select("id, name").eq("status", "active")`
   - Value `connected_by`-তে employee id store হবে

3. **Billing fields conditional wrapping** — শুধু `billing_status === "Active"` হলে দেখাবে:
   - মাসিক বিল (line 574-577)
   - বিলিং শুরুর মাস (line 578-581)
   - Expired Date day select (line 582-592)
   
   একসাথে একটা `{form.billing_status === "Active" && (<>...</>)}` block-এ wrap

4. **Status change handler**: যখন `billing_status` Active থেকে অন্য কিছুতে যায়, reset:
   ```ts
   setForm(prev => ({ ...prev, billing_status: v, monthly_bill: 0, billing_start_month: "", expire_day: "" }))
   ```

5. **Package select**: যদি current status "Active" না হয়, package select করলেও `monthly_bill` auto-set করবে না (line 519-522)

## Files

- `src/pages/dashboard/clients/AddClient.tsx` — উপরের পাঁচটা পরিবর্তন

## ফলাফল

- Affiliator field সম্পূর্ণ গায়েব
- "সংযোগ দিয়েছেন"-এ employee list থেকে select করা যাবে
- Free / Personal / VIP / Suspended যেকোন non-Active status দিলে মাসিক বিল, বিলিং শুরু, Expire Day তিনটাই hide হবে
- Active status select করলেই কেবল billing fields ফিরে আসবে

