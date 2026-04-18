
DO $$
DECLARE
  v_naim_id uuid;
  v_zone_id uuid := '01b5165c-9c3f-4bef-a78c-d452131c68c7';
  v_pkg_id uuid := 'bec1f404-70bb-4fff-b727-75c2f6395a3a';
BEGIN
  INSERT INTO public.clients (
    client_id, name, username, password, contact, phone_number, email,
    address, permanent_address, road_number, house_number,
    nid_number, father_name, mother_name, gender, date_of_birth, occupation,
    package_id, monthly_bill, connection_type, protocol_type, speed, profile,
    zone_id, status, billing_status, mikrotik_status, is_online,
    total_download, total_upload, joining_date, billing_date, is_vip,
    remote_address, mac_address, server_name
  ) VALUES (
    'NAIM001', 'Naim N.A.M', 'naim', 'naim123', '01711-000001', '01711-000001',
    'naim@example.com', 'ঢাকা, মিরপুর-১০, ব্লক-সি', 'কুমিল্লা, লাকসাম', '১২', '৪৫/বি',
    '1234567890123', 'মোঃ আব্দুল করিম', 'মোসাঃ রাবেয়া বেগম', 'Male', '1995-06-15', 'Software Engineer',
    v_pkg_id, 1000, 'PPPoE', 'PPPoE', '20 Mbps', '20M',
    v_zone_id, 'Active', 'Active', 'enabled', true,
    48318382080, 12884901888, '2024-01-15', 5, true,
    '10.10.10.50', 'AA:BB:CC:DD:EE:50', 'MAIN-PPP-01'
  )
  ON CONFLICT (client_id) DO UPDATE SET
    name=EXCLUDED.name, username=EXCLUDED.username, password=EXCLUDED.password,
    contact=EXCLUDED.contact, email=EXCLUDED.email, address=EXCLUDED.address,
    nid_number=EXCLUDED.nid_number, package_id=EXCLUDED.package_id,
    monthly_bill=EXCLUDED.monthly_bill, connection_type=EXCLUDED.connection_type,
    protocol_type=EXCLUDED.protocol_type, speed=EXCLUDED.speed, profile=EXCLUDED.profile,
    zone_id=EXCLUDED.zone_id, status=EXCLUDED.status, billing_status=EXCLUDED.billing_status,
    mikrotik_status=EXCLUDED.mikrotik_status, is_online=EXCLUDED.is_online,
    permanent_address=EXCLUDED.permanent_address, road_number=EXCLUDED.road_number,
    house_number=EXCLUDED.house_number, father_name=EXCLUDED.father_name,
    mother_name=EXCLUDED.mother_name, gender=EXCLUDED.gender,
    date_of_birth=EXCLUDED.date_of_birth, occupation=EXCLUDED.occupation,
    phone_number=EXCLUDED.phone_number, total_download=EXCLUDED.total_download,
    total_upload=EXCLUDED.total_upload, billing_date=EXCLUDED.billing_date,
    server_name=EXCLUDED.server_name, joining_date=EXCLUDED.joining_date,
    is_vip=EXCLUDED.is_vip, remote_address=EXCLUDED.remote_address, mac_address=EXCLUDED.mac_address
  RETURNING id INTO v_naim_id;

  IF v_naim_id IS NULL THEN
    SELECT id INTO v_naim_id FROM public.clients WHERE client_id='NAIM001';
  END IF;

  -- Billing rows (guarded by NOT EXISTS)
  INSERT INTO public.billing (bill_id, client_id, month, amount, paid, due, status, due_date)
  SELECT 'BILL-NAIM-202604', v_naim_id, '2026-04-01', 1000, 0, 1000, 'unpaid', '2026-04-15'
  WHERE NOT EXISTS (SELECT 1 FROM public.billing WHERE bill_id='BILL-NAIM-202604');

  INSERT INTO public.billing (bill_id, client_id, month, amount, paid, due, status, due_date, pay_date, payment_method)
  SELECT 'BILL-NAIM-202603', v_naim_id, '2026-03-01', 1000, 1000, 0, 'paid', '2026-03-15', '2026-03-10', 'bKash'
  WHERE NOT EXISTS (SELECT 1 FROM public.billing WHERE bill_id='BILL-NAIM-202603');

  INSERT INTO public.billing (bill_id, client_id, month, amount, paid, due, status, due_date, pay_date, payment_method)
  SELECT 'BILL-NAIM-202602', v_naim_id, '2026-02-01', 1000, 1000, 0, 'paid', '2026-02-15', '2026-02-08', 'Cash'
  WHERE NOT EXISTS (SELECT 1 FROM public.billing WHERE bill_id='BILL-NAIM-202602');

  -- Notices (guard by title)
  INSERT INTO public.client_notices (title, body, type, target_scope, active, pinned)
  SELECT 'ঈদ মোবারক — বিশেষ অফার!', 'এই ঈদে নতুন কানেকশনে পাচ্ছেন ৫০% ডিসকাউন্ট। অফারটি ৩০ এপ্রিল পর্যন্ত চলবে। বিস্তারিত জানতে হটলাইনে যোগাযোগ করুন।', 'success', 'all', true, true
  WHERE NOT EXISTS (SELECT 1 FROM public.client_notices WHERE title='ঈদ মোবারক — বিশেষ অফার!');

  INSERT INTO public.client_notices (title, body, type, target_scope, active, pinned)
  SELECT 'সার্ভিস মেইনটেনেন্স নোটিশ', 'আগামী ২০ এপ্রিল রাত ২টা থেকে ভোর ৪টা পর্যন্ত রুটিন মেইনটেনেন্সের কারণে ইন্টারনেট সার্ভিসে সাময়িক বিঘ্ন ঘটতে পারে।', 'warning', 'all', true, false
  WHERE NOT EXISTS (SELECT 1 FROM public.client_notices WHERE title='সার্ভিস মেইনটেনেন্স নোটিশ');

  -- News
  INSERT INTO public.client_news_events (title, details, type, event_date, active)
  SELECT 'নতুন ১ Gbps প্যাকেজ লঞ্চ', 'আমরা গর্বিতভাবে চালু করছি নতুন ১ Gbps আনলিমিটেড ফাইবার প্যাকেজ মাত্র ৳৫০০০/মাসে।', 'news', NULL, true
  WHERE NOT EXISTS (SELECT 1 FROM public.client_news_events WHERE title='নতুন ১ Gbps প্যাকেজ লঞ্চ');

  INSERT INTO public.client_news_events (title, details, type, event_date, active)
  SELECT 'গ্রাহক মিলনমেলা ২০২৬', 'আগামী ১০ মে আমাদের প্রধান কার্যালয়ে গ্রাহক মিলনমেলা অনুষ্ঠিত হবে।', 'event', '2026-05-10', true
  WHERE NOT EXISTS (SELECT 1 FROM public.client_news_events WHERE title='গ্রাহক মিলনমেলা ২০২৬');

  -- Media servers
  INSERT INTO public.media_servers (name, type, url, username, password, description, active, sort_order)
  SELECT 'FTP মুভি সার্ভার', 'ftp', 'ftp://ftp.ispdesk.local', 'guest', 'guest', '১০,০০০+ মুভি, সিরিজ ও ডকুমেন্টারি — সম্পূর্ণ ফ্রি', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM public.media_servers WHERE name='FTP মুভি সার্ভার');

  INSERT INTO public.media_servers (name, type, url, description, active, sort_order)
  SELECT 'লাইভ টিভি সার্ভার', 'live_tv', 'http://livetv.ispdesk.local', '১০০+ বাংলা, হিন্দি, ইংরেজি চ্যানেল লাইভ স্ট্রিম', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM public.media_servers WHERE name='লাইভ টিভি সার্ভার');

  INSERT INTO public.media_servers (name, type, url, description, active, sort_order)
  SELECT 'মুভি স্ট্রিমিং পোর্টাল', 'movie', 'http://movies.ispdesk.local', 'বাংলা ও ইংরেজি লেটেস্ট মুভি অন-ডিমান্ড', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM public.media_servers WHERE name='মুভি স্ট্রিমিং পোর্টাল');

  INSERT INTO public.media_servers (name, type, url, description, active, sort_order)
  SELECT 'গেম সার্ভার', 'other', 'http://games.ispdesk.local', 'কম পিং-এ লোকাল গেম সার্ভার', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM public.media_servers WHERE name='গেম সার্ভার');

  -- Support ticket
  INSERT INTO public.support_tickets (ticket_no, client_id, subject, description, priority, status, source, zone_id)
  SELECT 'TKT-NAIM-0001', v_naim_id, 'ইন্টারনেট স্লো হচ্ছে', 'গত ২ দিন ধরে সন্ধ্যা ৭টার পর থেকে ইন্টারনেট স্পিড অনেক কমে যাচ্ছে। ২০ Mbps প্যাকেজে মাত্র ৩-৪ Mbps পাচ্ছি।', 'high', 'open', 'portal', v_zone_id
  WHERE NOT EXISTS (SELECT 1 FROM public.support_tickets WHERE ticket_no='TKT-NAIM-0001');

  -- System settings (company info) — setting_key has unique constraint
  INSERT INTO public.system_settings (setting_key, setting_value) VALUES
    ('company_info', jsonb_build_object(
      'company_name', 'ISP Desk Communications',
      'company_address', 'বাড়ি-১২, রোড-৪, সেক্টর-৭, উত্তরা, ঢাকা-১২৩০',
      'hotline', '১৬৪৪৪',
      'phone', '+880-2-9876543',
      'email', 'support@ispdesk.com',
      'website', 'https://ispdesk.com',
      'tagline', 'দ্রুতগতির ফাইবার ইন্টারনেট আপনার দরজায়',
      'payment_instructions', E'বিকাশ পার্সোনাল: 01711-000000\nনগদ পার্সোনাল: 01811-000000\nব্যাংক: ডাচ-বাংলা ব্যাংক, A/C: 1234567890\n\nপেমেন্টের পর ট্রানজেকশন আইডি SMS করুন ১৬৪৪৪ নম্বরে।'
    ))
  ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
END $$;
