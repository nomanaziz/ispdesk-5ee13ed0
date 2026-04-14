

## Plan: Insert Demo Content for a Lively Website

All website-related tables are currently empty. This plan inserts realistic Bangla demo data using the Supabase insert tool across 10+ tables so the public website looks vibrant and professional.

### Data to Insert

| Table | Records | Content |
|---|---|---|
| `isp_packages` | 6 | Basic (500), Standard (700), Popular (1000), Premium (1500), Business (2500), Corporate (5000) with realistic bandwidth and `show_on_homepage=true` |
| `districts` | 4 | ঢাকা, চট্টগ্রাম, রাজশাহী, সিলেট |
| `upazilas` | 8 | 2 per district (e.g., সাভার, গাজীপুর under ঢাকা) |
| `zones` | 6 | Coverage zones like পূর্ব জোন, পশ্চিম জোন, etc. |
| `website_services` | 5 | Home Internet, Business Internet, Dedicated Line, IPTV, Corporate Solution |
| `website_features` | 6 | Fast Speed, Security, 24/7 Support, Fiber Optic, Free Router, Quick Resolution |
| `website_testimonials` | 4 | Fake customer reviews with Bangla names, 4-5 star ratings |
| `website_partners` | 4 | BDCOM, Huawei, MikroTik, TP-Link with logo URLs |
| `website_notices` | 3 | Maintenance notice, Eid offer notice, New coverage area notice |
| `website_offers` | 2 | "নতুন কানেকশনে ৫০% ছাড়" and "রেফার করুন ৫০০ টাকা পান" |
| `website_pages` | 3 | Privacy Policy, Terms of Service, Refund Policy |
| `website_menu` | 5 | Home, Packages, Services, About, Contact |
| `payment_methods` | 4 | bKash, Nagad, Rocket, Bank Transfer |
| `landing_content` | 4 | Hero section, about section, settings (company name, logo, contact) -- update existing + add new |

### Technical Approach

- Use the Supabase **insert tool** for all data operations (no migrations needed)
- All inserts use Bangla content appropriate for a Bangladeshi ISP
- Packages priced in BDT with realistic bandwidth (5-100 Mbps)
- All records set to `status: 'active'` and `show_on_homepage: true` where applicable

### Files to Edit

No code files need editing. This is purely a data insertion task using the Supabase insert tool across ~14 tables.

