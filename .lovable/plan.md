

## লক্ষ্য
POP Reseller Package page-কে screenshot-এর মতো simple table layout-এ পরিবর্তন — শুধু **SellingRate** column editable, বাকি সব read-only।

## Current vs Target

**বর্তমান** (`PopPackages.tsx`): Card layout, helper info banners, inline pencil-edit on Sell Rate, ৯টি column।

**Target** (screenshot অনুযায়ী): Plain table, ৯ column same order:
`PackageName | ServerName | Protocol | Profile | BuyingRate | SellingRate | ValidityDays | Min R.Days | Action`

পার্থক্য:
- শুধু **Action column-এর pencil button** চাপলে SellingRate cell editable হবে (currently SellingRate-এ click করলেও editable, ওটা off করব না — Action button দিয়ে trigger same)
- Helper banner ও info card সরিয়ে clean look
- Search box ও pagination header (screenshot-এর মতো `SHOW [100] ENTRIES ... SEARCH:` style)

## পরিবর্তন (single file)

### `src/pages/reseller/config/PopPackages.tsx`

1. **Remove**: top heading description, blue info Card, Card wrapper around table
2. **Add at top**: page title + breadcrumb-style subtitle ("Configuration > Package")
3. **Add toolbar row**: 
   - Left: `Show [select 10/25/50/100] entries`
   - Right: `Search: [input]` — client-side filter on package name / server / profile
4. **Table styling**: bordered, header dark slate bg (matching screenshot), centered numeric columns
5. **Edit flow**: unchanged logic (`updateRate` mutation, buy_rate floor validation), শুধু Pencil icon → green edit-pencil icon (screenshot-এর মতো)
6. **Footer row**: `Showing X to Y of N entries` + simple pagination (Previous / page numbers / Next)

## যা **বদলাবে না**
- `portal-data` edge function (`get_tariff_packages`, `update_tariff_selling_rate`) — intact
- Buy rate immutability + sell ≥ buy validation — intact  
- Auth/permission flow — intact

## Files
- **Modified**: `src/pages/reseller/config/PopPackages.tsx`

approve করলে এই ১টি file rewrite করব।

