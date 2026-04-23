

## গুরুত্বপূর্ণ লিংক — আলাদা Page এবং Sidebar Menu

### লক্ষ্য
- `Dashboard.tsx` থেকে `<ImportantLinksSection />` widget সরিয়ে নেওয়া।
- Sidebar-এর "ড্যাশবোর্ড" group-এর নিচে নতুন "লিংক" নামে menu item add করা।
- নতুন route `/dashboard/links` তৈরি — যেখানে শুধু গুরুত্বপূর্ণ লিংক page আকারে দেখাবে।

### পরিবর্তন

**1. নতুন Page — `src/pages/dashboard/Links.tsx`**
- Simple wrapper page: page title + `<ImportantLinksSection />` render করবে।
- Existing component পুরোপুরি reuse — ImportantLinksSection-এ কোনো পরিবর্তন নয় (সব CRUD, dialog, category logic যেমন আছে তেমনই কাজ করবে)।

**2. `src/pages/Dashboard.tsx` — widget সরানো**
- Line 15-এর `import { ImportantLinksSection }` remove।
- Line 757-এর `<ImportantLinksSection />` render block remove।

**3. `src/components/AppSidebar.tsx` — menu update**
- "ড্যাশবোর্ড" group (line 67-75) এ:
    - `direct: true` সরানো (যাতে expandable group হয়, নিচে "লিংক" menu দেখা যায়)।
    - `items` array-এ নতুন entry যোগ:
      ```ts
      { title: "লিংক", url: "/dashboard/links", icon: Link2, titleEn: "Links" }
      ```
- ফলে sidebar-এ:
    ```
    📊 ড্যাশবোর্ড
       ├─ ড্যাশবোর্ড  → /dashboard
       └─ 🔗 লিংক     → /dashboard/links
    ```

**4. `src/App.tsx` — route add**
- Dashboard routes section-এ (line 441-এর কাছে):
  ```tsx
  import Links from "./pages/dashboard/Links";
  <Route path="/dashboard/links" element={<P><Links /></P>} />
  ```

### ফলাফল
- Dashboard page থেকে গুরুত্বপূর্ণ লিংক widget সরে যাবে → page পরিষ্কার হবে।
- Sidebar-এর "ড্যাশবোর্ড" group expand করলে "লিংক" সাব-মেনু দেখাবে।
- `/dashboard/links` page-এ পুরো গুরুত্বপূর্ণ লিংক UI আলাদা দেখা যাবে — সব category/link CRUD যেমন আগে কাজ করছিল ঠিক তেমনই কাজ করবে।
- কোনো database পরিবর্তন নেই, শুধু UI re-organization।

