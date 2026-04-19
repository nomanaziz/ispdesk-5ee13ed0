
Goal: make the client portal reliable end-to-end so it always reads the correct client, billing, invoice, company, and live-usage data from one trusted backend path instead of the current mixed/broken setup.

What I found
1. `/portal/profile` is linked from the UI, but the route is missing in `App.tsx`, which is why you get 404.
2. Portal data is split across two systems:
   - some pages use `portal-data` edge function
   - many other pages read Supabase directly from the browser
   Portal users are not normal Supabase-auth users, so those direct queries often return empty data.
3. `portal-data` itself is querying the wrong schema in places:
   - it asks for `connection_types(name)` though the project stores client connection as `connection_type`
   - it asks package speed as `download_speed/upload_speed`, but this schema uses `bandwidth_down/bandwidth_up`
4. Company info pages read the wrong JSON keys. Admin saves `name`, `address1`, `address2`, `mobile1`, `phone1`, etc., but portal pages expect `company_name`, `company_address`, `hotline`.
5. Client invoices page is using `bw_sales_invoices`, which is the wrong source for normal clients. Normal clients should see `billing`/bill invoice data.
6. There is also auth/session technical debt: the portal token is currently just base64 JSON, not a properly validated secure session. That is not permanent enough.

Implementation plan
1. Fix portal routing first
   - add the missing `/portal/profile` route
   - review portal menu items so client users only see relevant items
   - make `/portal/invoices` client-aware so normal clients see their billing invoices instead of empty BW-sale data

2. Replace mixed portal data fetching with one backend-driven portal API
   - move the portal pages that currently read Supabase directly onto `portal-data`
   - add/extend actions for:
     - dashboard summary
     - profile
     - company info
     - live usage
     - bills / bill detail
     - client invoice list
   - keep page components thin and only render normalized response data

3. Correct the data mapping so real values show
   - package name from `isp_packages.name`
   - speed from `isp_packages.bandwidth_down/bandwidth_up` or fallback `clients.speed`
   - protocol from `clients.protocol_type`
   - connection from `clients.connection_type`
   - client details from `contact`, `email`, `present_address/address`, `zone`, `nid_number`
   - join date from `joining_date`
   - ledger balance from billing + collections summary, not placeholder values
   - company info from the actual `company_info` JSON shape already used in admin settings

4. Fix the affected pages one by one
   - Dashboard: service overview, client details, package bars, ledger summary
   - My Profile: route + stable loading/form initialization
   - Live Usage: show client name/code/username/mobile/email plus live online/offline data
   - Company Information: map saved company fields correctly
   - Bills/Invoices: show the client’s real monthly billing rows, edited amounts, paid amount, due amount, and bill detail correctly
   - Bill detail page: load through portal API and keep payment submission consistent

5. Make it more interactive and less “broken”
   - add proper loading skeletons
   - add explicit empty/error states instead of blank sections
   - add quick action cards/buttons where useful
   - improve dashboard summary cards so values are readable and actionable
   - keep mobile and desktop navigation consistent

6. Make the fix permanent at the auth/session level
   - replace the current unsigned portal token approach with a proper server-validated portal session
   - store a secure opaque session token (or signed token with server validation) and validate it inside `portal-data`
   - clean up the stale Supabase refresh-token error so portal users do not get noisy auth failures in console

Verification checklist
- login as an affected client and confirm:
  - home dashboard shows package, speed, protocol, connection, mobile, email, address, zone, NID, join date
  - ledger balance is populated
  - `/portal/profile` opens without 404
  - `/portal/live-usage` shows client identity info and live status
  - `/portal/company` shows saved company name/address/phones/email/website
  - monthly bill/invoice pages show the edited bill amount and correct paid/due values
  - bill detail reflects payment and invoice changes
- test both desktop sidebar and mobile bottom nav
- confirm there are no more route 404s and no portal-related auth/data blank states

Technical details
- Files likely involved:
  - `src/App.tsx`
  - `src/components/PortalLayout.tsx`
  - `src/contexts/PortalAuthContext.tsx`
  - `src/lib/portalApi.ts`
  - `src/pages/portal/PortalDashboard.tsx`
  - `src/pages/portal/PortalProfile.tsx`
  - `src/pages/portal/PortalInvoices.tsx`
  - `src/pages/portal/PortalBills.tsx`
  - `src/pages/portal/PortalBillInvoice.tsx`
  - `src/pages/portal/PortalCompanyInfo.tsx`
  - `src/pages/portal/PortalLiveUsage.tsx`
  - `supabase/functions/portal-auth/index.ts`
  - `supabase/functions/portal-data/index.ts`
- Backend work expected:
  - edge function refactor for normalized portal responses
  - likely one small migration for secure portal session storage
- Existing business data should stay intact; this is mainly a route/API/session/data-mapping repair, not a billing-data rewrite.
