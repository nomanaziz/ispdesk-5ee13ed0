
-- ISP Packages
INSERT INTO public.isp_packages (name, code, bandwidth_down, bandwidth_up, price, setup_fee, show_on_homepage, status, protocol) VALUES
  ('বেসিক', 'BASIC-5', 5, 5, 500, 1000, true, 'active', 'PPPoE'),
  ('স্ট্যান্ডার্ড', 'STD-10', 10, 10, 700, 1000, true, 'active', 'PPPoE'),
  ('পপুলার', 'POP-20', 20, 10, 1000, 1500, true, 'active', 'PPPoE'),
  ('প্রিমিয়াম', 'PREM-40', 40, 20, 1500, 1500, true, 'active', 'PPPoE'),
  ('বিজনেস', 'BIZ-60', 60, 30, 2500, 2000, true, 'active', 'PPPoE'),
  ('কর্পোরেট', 'CORP-100', 100, 50, 5000, 3000, true, 'active', 'PPPoE');

-- Districts
INSERT INTO public.districts (name, code, status) VALUES
  ('ঢাকা', 'DHK', 'active'),
  ('চট্টগ্রাম', 'CTG', 'active'),
  ('রাজশাহী', 'RAJ', 'active'),
  ('সিলেট', 'SYL', 'active');

-- Upazilas
INSERT INTO public.upazilas (name, district_id, code, status)
SELECT 'সাভার', id, 'SAV', 'active' FROM districts WHERE code='DHK'
UNION ALL SELECT 'গাজীপুর', id, 'GAZ', 'active' FROM districts WHERE code='DHK'
UNION ALL SELECT 'সীতাকুণ্ড', id, 'STK', 'active' FROM districts WHERE code='CTG'
UNION ALL SELECT 'পটিয়া', id, 'PTY', 'active' FROM districts WHERE code='CTG'
UNION ALL SELECT 'রাজপাড়া', id, 'RJP', 'active' FROM districts WHERE code='RAJ'
UNION ALL SELECT 'বোয়ালিয়া', id, 'BWL', 'active' FROM districts WHERE code='RAJ'
UNION ALL SELECT 'জালালাবাদ', id, 'JLB', 'active' FROM districts WHERE code='SYL'
UNION ALL SELECT 'বিশ্বনাথ', id, 'BSN', 'active' FROM districts WHERE code='SYL';

-- Zones (with required code column)
INSERT INTO public.zones (name, code, status) VALUES
  ('পূর্ব জোন', 'EAST', 'active'),
  ('পশ্চিম জোন', 'WEST', 'active'),
  ('উত্তর জোন', 'NORTH', 'active'),
  ('দক্ষিণ জোন', 'SOUTH', 'active'),
  ('কেন্দ্রীয় জোন', 'CENTER', 'active'),
  ('শিল্প জোন', 'INDUSTRIAL', 'active');

-- Sub Zones
INSERT INTO public.sub_zones (name, zone_id, status)
SELECT 'পূর্ব-১', id, 'active' FROM zones WHERE code='EAST'
UNION ALL SELECT 'পূর্ব-২', id, 'active' FROM zones WHERE code='EAST'
UNION ALL SELECT 'পশ্চিম-১', id, 'active' FROM zones WHERE code='WEST'
UNION ALL SELECT 'পশ্চিম-২', id, 'active' FROM zones WHERE code='WEST'
UNION ALL SELECT 'উত্তর-১', id, 'active' FROM zones WHERE code='NORTH'
UNION ALL SELECT 'দক্ষিণ-১', id, 'active' FROM zones WHERE code='SOUTH'
UNION ALL SELECT 'কেন্দ্র-১', id, 'active' FROM zones WHERE code='CENTER'
UNION ALL SELECT 'শিল্প-১', id, 'active' FROM zones WHERE code='INDUSTRIAL';

-- Website Services
INSERT INTO public.website_services (title, description, icon, sort_order, status) VALUES
  ('হোম ইন্টারনেট', 'পরিবারের জন্য উচ্চ গতির ফাইবার অপটিক ইন্টারনেট সংযোগ। HD স্ট্রিমিং, গেমিং এবং দৈনন্দিন ব্রাউজিংয়ের জন্য উপযুক্ত।', 'Home', 1, 'active'),
  ('বিজনেস ইন্টারনেট', 'ব্যবসা প্রতিষ্ঠানের জন্য ডেডিকেটেড ব্যান্ডউইথ এবং SLA গ্যারান্টি সহ ইন্টারনেট সেবা।', 'Building', 2, 'active'),
  ('ডেডিকেটেড লাইন', 'কর্পোরেট অফিস ও ডাটা সেন্টারের জন্য সিমেট্রিক ডেডিকেটেড ইন্টারনেট লাইন।', 'Server', 3, 'active'),
  ('IPTV সার্ভিস', 'লাইভ টিভি চ্যানেল ও অন-ডিমান্ড কন্টেন্ট সহ IPTV সেবা। ১০০+ চ্যানেল।', 'Tv', 4, 'active'),
  ('কর্পোরেট সলিউশন', 'এন্টারপ্রাইজ গ্রেড নেটওয়ার্ক সলিউশন, VPN, ফায়ারওয়াল এবং ম্যানেজড সার্ভিস।', 'Shield', 5, 'active');

-- Website Features
INSERT INTO public.website_features (title, description, icon, sort_order, status) VALUES
  ('আল্ট্রা ফাস্ট স্পিড', '১০০ Mbps পর্যন্ত ডাউনলোড স্পিড সহ বাফারিং-মুক্ত অভিজ্ঞতা।', 'Zap', 1, 'active'),
  ('নিরাপদ সংযোগ', 'এন্টারপ্রাইজ গ্রেড ফায়ারওয়াল ও DDoS প্রটেকশন।', 'Shield', 2, 'active'),
  ('২৪/৭ সাপোর্ট', '৩৬৫ দিন ২৪ ঘণ্টা দক্ষ টেকনিক্যাল টিম আপনার সেবায়।', 'Headphones', 3, 'active'),
  ('ফাইবার অপটিক', 'সরাসরি FTTH সংযোগ দ্বারা সর্বোচ্চ স্থিতিশীলতা।', 'Globe', 4, 'active'),
  ('ফ্রি রাউটার', 'নতুন কানেকশনের সাথে বিনামূল্যে ডুয়াল-ব্যান্ড ওয়াই-ফাই রাউটার।', 'Wifi', 5, 'active'),
  ('দ্রুত সমাধান', 'সমস্যার ২ ঘণ্টার মধ্যে সমাধান।', 'Clock', 6, 'active');

-- Website Testimonials
INSERT INTO public.website_testimonials (name, designation, company, content, rating, sort_order, status) VALUES
  ('মোহাম্মদ রফিকুল ইসলাম', 'ব্যবস্থাপনা পরিচালক', 'আলিফ টেকনোলজিস', 'গত ২ বছর ধরে ব্যবহার করছি। স্পিড এবং সার্ভিস কোয়ালিটি অসাধারণ।', 5, 1, 'active'),
  ('ফাতেমা বেগম', 'গৃহিণী', '', 'বাচ্চাদের অনলাইন ক্লাস এবং পরিবারের বিনোদনের জন্য একদম পারফেক্ট।', 5, 2, 'active'),
  ('আহমেদ করিম', 'সফটওয়্যার ইঞ্জিনিয়ার', 'ডিজিটাল সলিউশনস বিডি', 'ফ্রিল্যান্সিং ও রিমোট ওয়ার্কের জন্য দারুণ। আপলোড স্পিড খুবই ভালো।', 4, 3, 'active'),
  ('সাবরিনা চৌধুরী', 'উদ্যোক্তা', 'গ্রিন কমার্স', 'ই-কমার্স ব্যবসার জন্য নির্ভরযোগ্য ইন্টারনেট। দারুণ সেবা!', 5, 4, 'active');

-- Website Partners
INSERT INTO public.website_partners (name, logo_url, website_url, sort_order, status) VALUES
  ('BDCOM', 'https://www.bdcom.cn/static/img/logo.png', 'https://www.bdcom.cn', 1, 'active'),
  ('Huawei', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Huawei_Logo.svg/200px-Huawei_Logo.svg.png', 'https://www.huawei.com', 2, 'active'),
  ('MikroTik', 'https://mikrotik.com/img/mtv2/newlogo.svg', 'https://www.mikrotik.com', 3, 'active'),
  ('TP-Link', 'https://static.tp-link.com/upload/image-line/logo_20200714015626m.png', 'https://www.tp-link.com', 4, 'active');

-- Website Notices
INSERT INTO public.website_notices (title, content, status, publish_date) VALUES
  ('সিস্টেম আপগ্রেড নোটিশ', 'আগামী শুক্রবার রাত ২:০০ AM থেকে ৫:০০ AM পর্যন্ত সিস্টেম আপগ্রেডের কারণে সার্ভিসে সাময়িক বিঘ্ন ঘটতে পারে।', 'published', CURRENT_DATE),
  ('ঈদ স্পেশাল অফার!', 'ঈদ উপলক্ষে নতুন কানেকশনে ৫০% ইনস্টলেশন ফি ছাড়! সীমিত সময়ের জন্য।', 'published', CURRENT_DATE),
  ('নতুন কভারেজ এরিয়া', 'গাজীপুর ও সাভার এলাকায় আমাদের ফাইবার অপটিক নেটওয়ার্ক সম্প্রসারিত হয়েছে।', 'published', CURRENT_DATE);

-- Website Offers
INSERT INTO public.website_offers (title, description, discount_text, status, start_date, end_date) VALUES
  ('নতুন কানেকশনে ৫০% ছাড়', 'যেকোনো প্যাকেজে নতুন কানেকশন নিলে ইনস্টলেশন ফিতে ৫০% ছাড়!', '৫০% ছাড়', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days'),
  ('রেফার করুন, ৫০০ টাকা পান', 'পরিচিতদের রেফার করুন। প্রতিটি সফল রেফারেলে ৫০০ টাকা বিল ক্রেডিট!', '৳৫০০ ক্রেডিট', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '180 days');

-- Website Pages
INSERT INTO public.website_pages (title, slug, content, status, sort_order) VALUES
  ('প্রাইভেসি পলিসি', 'privacy-policy', 'আমরা আপনার ব্যক্তিগত তথ্যের গোপনীয়তা রক্ষায় প্রতিশ্রুতিবদ্ধ।', 'published', 1),
  ('সেবা শর্তাবলী', 'terms-of-service', 'আমাদের সেবা গ্রহণ করার মাধ্যমে আপনি নিম্নলিখিত শর্তাবলীতে সম্মত হচ্ছেন।', 'published', 2),
  ('রিফান্ড পলিসি', 'refund-policy', 'ইনস্টলেশনের ৭ দিনের মধ্যে সেবার মান নিয়ে অসন্তুষ্ট হলে সম্পূর্ণ ফি ফেরত পাওয়া যাবে।', 'published', 3);

-- Website Menu
INSERT INTO public.website_menu (title, url, sort_order, status) VALUES
  ('হোম', '/', 1, 'active'),
  ('প্যাকেজ', '/packages', 2, 'active'),
  ('সেবাসমূহ', '/services', 3, 'active'),
  ('কভারেজ', '/coverage', 4, 'active'),
  ('যোগাযোগ', '/new-connection', 5, 'active');

-- Payment Methods
INSERT INTO public.payment_methods (name, category, account_number, color, sort_order, status) VALUES
  ('বিকাশ', 'mobile_banking', '01XXXXXXXXX', '#E2136E', 1, 'active'),
  ('নগদ', 'mobile_banking', '01XXXXXXXXX', '#F6921E', 2, 'active'),
  ('রকেট', 'mobile_banking', '01XXXXXXXXX', '#8B2F8A', 3, 'active'),
  ('ব্যাংক ট্রান্সফার', 'bank', '1234567890 (ইসলামী ব্যাংক)', '#006747', 4, 'active');

-- Update hero landing content
UPDATE public.landing_content SET content_value = '{"title":"দ্রুতগতির ইন্টারনেট সংযোগ","subtitle":"আমরা প্রদান করি সাশ্রয়ী মূল্যে উচ্চ গতির ফাইবার অপটিক ইন্টারনেট সেবা। ২৪/৭ কাস্টমার সাপোর্ট এবং ৯৯.৯% আপটাইম গ্যারান্টি।","cta_primary":"প্যাকেজ দেখুন","cta_secondary":"কানেকশন নিন"}'::jsonb
WHERE section='hero' AND content_key='main';

-- Add about and settings content
INSERT INTO public.landing_content (section, content_key, content_value, sort_order, is_active) VALUES
  ('about', 'company', '{"title":"আমাদের সম্পর্কে","description":"আমরা ২০১৫ সাল থেকে মানসম্মত ইন্টারনেট সেবা প্রদান করে আসছি।","mission":"সর্বোচ্চ মানের ইন্টারনেট সেবা সাশ্রয়ী মূল্যে প্রদান করা।","vision":"বাংলাদেশের শীর্ষস্থানীয় ISP হওয়া।"}'::jsonb, 1, true),
  ('settings', 'company_info', '{"name":"নেটওয়ার্ক প্লাস","tagline":"দ্রুতগতির ইন্টারনেট সেবা","phone":"০১৭XX-XXXXXX","email":"info@networkplus.com.bd","address":"হাউস ১২, রোড ৫, ধানমন্ডি, ঢাকা-১২০৫"}'::jsonb, 1, true),
  ('settings', 'business_hours', '{"weekdays":"সকাল ৯:০০ - রাত ১০:০০","friday":"সকাল ৯:০০ - দুপুর ১:০০, বিকাল ৩:০০ - রাত ১০:০০","weekend":"সকাল ১০:০০ - রাত ৮:০০"}'::jsonb, 2, true);
